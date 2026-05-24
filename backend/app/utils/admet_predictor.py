"""
admet_predictor.py — ADMET Toxicity Prediction Layer for MOL-X

Predicts whether a generated molecule will be:
  - Absorbed by the gut (GI absorption)
  - Able to cross the blood-brain barrier (BBB)
  - A CYP enzyme inhibitor (drug-drug interaction risk)
  - Hepatotoxic (liver toxicity risk)
  - hERG channel blocker (cardiac toxicity risk)

Uses RDKit molecular descriptors + rule-based scoring
(same approach as SwissADME / pkCSM).
"""

import math
from typing import Dict, List, Optional

try:
    from rdkit import Chem
    from rdkit.Chem import Descriptors, QED, rdMolDescriptors
    RDKIT_OK = True
except ImportError:
    RDKIT_OK = False


# ─── Descriptor thresholds (literature-derived) ──────────────────

def _compute_descriptors(mol) -> Dict[str, float]:
    """Compute ADMET-relevant molecular descriptors."""
    mw   = Descriptors.MolWt(mol)
    logp = Descriptors.MolLogP(mol)
    tpsa = Descriptors.TPSA(mol)
    hbd  = Descriptors.NumHDonors(mol)
    hba  = Descriptors.NumHAcceptors(mol)
    rotb = Descriptors.NumRotatableBonds(mol)
    arom = Descriptors.NumAromaticRings(mol)
    rings = Descriptors.RingCount(mol)
    mr   = Descriptors.MolMR(mol)               # molar refractivity
    heavy = mol.GetNumHeavyAtoms()
    fsp3  = rdMolDescriptors.CalcFractionCSP3(mol)  # fraction sp3 carbons

    return {
        "mw": mw, "logp": logp, "tpsa": tpsa,
        "hbd": hbd, "hba": hba, "rotb": rotb,
        "aromatic_rings": arom, "ring_count": rings,
        "molar_refractivity": mr, "heavy_atoms": heavy,
        "fsp3": fsp3,
    }


# ─── Individual ADMET endpoint predictors ────────────────────────

def _predict_gi_absorption(d: dict) -> dict:
    """
    GI absorption prediction (BOILED-Egg model, Daina & Zoete 2016).
    High absorption: TPSA ≤ 140 Å² AND LogP ≤ 5.88 (white region).
    """
    tpsa, logp, mw = d["tpsa"], d["logp"], d["mw"]
    score = 1.0
    reasons = []

    if tpsa > 140:
        score -= 0.4
        reasons.append(f"TPSA={tpsa:.0f} > 140 (poor permeability)")
    if logp > 5.88:
        score -= 0.3
        reasons.append(f"LogP={logp:.1f} > 5.88 (too lipophilic)")
    if mw > 500:
        score -= 0.2
        reasons.append(f"MW={mw:.0f} > 500 (poor solubility)")
    if d["rotb"] > 10:
        score -= 0.1
        reasons.append(f"RotBonds={d['rotb']} > 10")

    score = max(0.0, min(1.0, score))
    passed = score >= 0.6
    return {
        "endpoint": "GI Absorption",
        "prediction": "High" if passed else "Low",
        "pass": passed,
        "score": round(score, 2),
        "reasons": reasons if reasons else ["All GI absorption criteria met"],
        "color": "#22c55e" if passed else "#ef4444",
    }


def _predict_bbb_permeation(d: dict) -> dict:
    """
    BBB permeation (BOILED-Egg yellow region).
    Permeable: TPSA ≤ 79 Å² AND LogP in [0.4, 6.0].
    """
    tpsa, logp = d["tpsa"], d["logp"]
    score = 1.0
    reasons = []

    if tpsa > 79:
        score -= 0.5
        reasons.append(f"TPSA={tpsa:.0f} > 79 (too polar for BBB)")
    if logp < 0.4:
        score -= 0.3
        reasons.append(f"LogP={logp:.1f} < 0.4 (too hydrophilic)")
    if logp > 6.0:
        score -= 0.3
        reasons.append(f"LogP={logp:.1f} > 6.0 (too lipophilic)")
    if d["mw"] > 450:
        score -= 0.2
        reasons.append(f"MW={d['mw']:.0f} > 450")

    score = max(0.0, min(1.0, score))
    passed = score >= 0.6
    return {
        "endpoint": "BBB Permeation",
        "prediction": "Permeable" if passed else "Non-permeable",
        "pass": passed,
        "score": round(score, 2),
        "reasons": reasons if reasons else ["BBB permeation criteria met"],
        "color": "#22c55e" if passed else "#ef4444",
    }


def _predict_cyp_inhibition(d: dict) -> dict:
    """
    CYP2D6/CYP3A4 inhibition risk.
    Higher risk with: LogP > 3.5, aromatic rings ≥ 3, MW 250-500.
    """
    logp, arom, mw = d["logp"], d["aromatic_rings"], d["mw"]
    risk = 0.0
    reasons = []

    if logp > 3.5:
        risk += 0.3
        reasons.append(f"LogP={logp:.1f} > 3.5 (lipophilic substrates bind CYP)")
    if arom >= 3:
        risk += 0.3
        reasons.append(f"AromaticRings={arom} ≥ 3 (planar substrates)")
    if 250 <= mw <= 500:
        risk += 0.2
        reasons.append(f"MW={mw:.0f} in CYP substrate range")
    if d["hba"] >= 4:
        risk += 0.1

    risk = max(0.0, min(1.0, risk))
    safe = risk < 0.5
    return {
        "endpoint": "CYP Inhibition",
        "prediction": "Low Risk" if safe else "High Risk",
        "pass": safe,
        "score": round(1 - risk, 2),
        "reasons": reasons if reasons else ["Low CYP inhibition risk"],
        "color": "#22c55e" if safe else "#ef4444",
    }


def _predict_hepatotoxicity(d: dict) -> dict:
    """
    Hepatotoxicity risk prediction.
    Higher risk: LogP > 3, MW > 400, TPSA < 75, many aromatic rings.
    (Based on Chen et al. 2016 — DILIrank dataset patterns.)
    """
    risk = 0.0
    reasons = []

    if d["logp"] > 3.0:
        risk += 0.25
        reasons.append(f"LogP={d['logp']:.1f} > 3 (liver accumulation risk)")
    if d["mw"] > 400:
        risk += 0.2
        reasons.append(f"MW={d['mw']:.0f} > 400")
    if d["tpsa"] < 75:
        risk += 0.2
        reasons.append(f"TPSA={d['tpsa']:.0f} < 75 (high membrane permeability)")
    if d["aromatic_rings"] >= 3:
        risk += 0.2
        reasons.append(f"AromaticRings={d['aromatic_rings']} ≥ 3 (reactive metabolites)")
    if d["heavy_atoms"] > 35:
        risk += 0.15
        reasons.append(f"HeavyAtoms={d['heavy_atoms']} > 35")

    risk = max(0.0, min(1.0, risk))
    safe = risk < 0.5
    return {
        "endpoint": "Hepatotoxicity",
        "prediction": "Low Risk" if safe else "Warning",
        "pass": safe,
        "score": round(1 - risk, 2),
        "reasons": reasons if reasons else ["Low hepatotoxicity risk"],
        "color": "#22c55e" if safe else "#ef4444",
    }


def _predict_herg(d: dict) -> dict:
    """
    hERG K+ channel inhibition (cardiac toxicity).
    Higher risk: LogP > 3.7, MW 250-550, basic nitrogen, low TPSA.
    (Aronov 2005 — Predictive in silico modeling for hERG.)
    """
    risk = 0.0
    reasons = []

    if d["logp"] > 3.7:
        risk += 0.35
        reasons.append(f"LogP={d['logp']:.1f} > 3.7 (hydrophobic channel binding)")
    if 250 <= d["mw"] <= 550:
        risk += 0.15
        reasons.append(f"MW={d['mw']:.0f} in hERG-active range")
    if d["tpsa"] < 75:
        risk += 0.2
        reasons.append(f"TPSA={d['tpsa']:.0f} < 75 (membrane partitioning)")
    if d["aromatic_rings"] >= 2:
        risk += 0.15
        reasons.append(f"AromaticRings={d['aromatic_rings']} ≥ 2")

    risk = max(0.0, min(1.0, risk))
    safe = risk < 0.5
    return {
        "endpoint": "hERG (Cardiotoxicity)",
        "prediction": "Low Risk" if safe else "Warning",
        "pass": safe,
        "score": round(1 - risk, 2),
        "reasons": reasons if reasons else ["Low hERG inhibition risk"],
        "color": "#22c55e" if safe else "#ef4444",
    }


# ─── Public API ──────────────────────────────────────────────────

def screen_molecule(smiles: str) -> Optional[dict]:
    """
    Run a full ADMET screen on a single SMILES string.

    Returns a dict with:
      - smiles, descriptors
      - endpoints: list of 5 ADMET predictions
      - overall_safety_score (0–100 %)
      - overall_pass (bool)
    """
    if not RDKIT_OK:
        return None

    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        return None

    desc = _compute_descriptors(mol)

    endpoints = [
        _predict_gi_absorption(desc),
        _predict_bbb_permeation(desc),
        _predict_cyp_inhibition(desc),
        _predict_hepatotoxicity(desc),
        _predict_herg(desc),
    ]

    passed = sum(1 for e in endpoints if e["pass"])
    safety_score = round(passed / len(endpoints) * 100, 1)

    return {
        "smiles": smiles,
        "descriptors": {k: round(v, 3) if isinstance(v, float) else v
                        for k, v in desc.items()},
        "endpoints": endpoints,
        "overall_safety_score": safety_score,
        "overall_pass": passed >= 4,   # pass if ≥ 4/5 endpoints are safe
        "passed_count": passed,
        "total_endpoints": len(endpoints),
    }


def screen_batch(smiles_list: List[str]) -> dict:
    """Screen a batch of molecules and return aggregate statistics."""
    results = []
    for smi in smiles_list:
        r = screen_molecule(smi)
        if r:
            results.append(r)

    if not results:
        return {"error": "No valid molecules to screen", "results": []}

    avg_safety = sum(r["overall_safety_score"] for r in results) / len(results)
    pass_count = sum(1 for r in results if r["overall_pass"])

    return {
        "results": results,
        "summary": {
            "total_screened": len(results),
            "overall_pass_count": pass_count,
            "overall_pass_rate": round(pass_count / len(results) * 100, 1),
            "average_safety_score": round(avg_safety, 1),
        }
    }
