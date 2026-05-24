# similarity_engine.py — FDA drug similarity via Tanimoto fingerprinting

"""
Provides three high‑level APIs:
  * fingerprint(smiles) – returns a Morgan (ECFP4) fingerprint as bytes
  * tanimoto_similarity(fp1, fp2) – computes the Tanimoto coefficient
  * most_similar(smiles, top_n=5) – returns the top‑N most similar FDA‑approved drugs
"""

from __future__ import annotations

import json
import os
from typing import List, Tuple

try:
    from rdkit import Chem
    from rdkit.Chem import AllChem, DataStructs
    RDKIT_OK = True
except ImportError:
    RDKIT_OK = False

# Path to where the JSON reference library will be stored (within the repo)
FOLDER = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data"))
os.makedirs(FOLDER, exist_ok=True)
FDA_DRUGS_JSON = os.path.join(FOLDER, "fda_drugs.json")

def _load_fda_drugs() -> List[dict]:
    """Load a minimal JSON drug library.

    If the JSON does not exist, we create a tiny fallback list containing the
    most famous drugs (Aspirin, Paracetamol, Ibuprofen, ...). In production a
    full list can be downloaded from the FDA Orange Book or a curated CSV.
    """
    if os.path.exists(FDA_DRUGS_JSON):
        with open(FDA_DRUGS_JSON, "r", encoding="utf-8") as f:
            return json.load(f)

    # Fallback minimal list – enough for demo & hackathon showcase
    fallback = [
        {"name": "Aspirin", "smiles": "CC(=O)Oc1ccccc1C(=O)O"},
        {"name": "Paracetamol", "smiles": "CC(=O)Nc1ccc(O)cc1"},
        {"name": "Ibuprofen", "smiles": "CC(C)Cc1ccc(C(C)C(=O)O)cc1"},
        {"name": "Caffeine", "smiles": "CN1C=NC2=C1C(=O)N(C(=O)N2C)C"},
        {"name": "Morphine", "smiles": "OC1CC2=CC=CC3=C2[C@@]14CCN(C)[C@H]4CC3"},
        {"name": "Metformin", "smiles": "CN(C)C(=N)NC(=N)N"},
    ]
    with open(FDA_DRUGS_JSON, "w", encoding="utf-8") as f:
        json.dump(fallback, f, indent=2)
    return fallback

def fingerprint(smiles: str) -> bytes:
    """Return the Morgan (ECFP4) fingerprint as ``bytes``.

    The fingerprint is a 2048‑bit vector, identical to the default used by
    most cheminformatics tools. ``bytes`` are used because they are JSON‑serialisable
    via ``base64`` when sent over the API.
    """
    if not RDKIT_OK:
        raise RuntimeError("RDKit is required for fingerprinting")
    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        raise ValueError(f"Invalid SMILES: {smiles}")
    fp = AllChem.GetMorganFingerprintAsBitVect(mol, radius=2, nBits=2048)
    return fp.ToBinary()

def tanimoto_similarity(fp_a: bytes, fp_b: bytes) -> float:
    """Calculate Tanimoto similarity between two bit‑vectors (bytes)."""
    if not RDKIT_OK:
        raise RuntimeError("RDKit is required for similarity calculation")
    a = DataStructs.ExplicitBitVect(DataStructs.CreateFromBinary(fp_a))
    b = DataStructs.ExplicitBitVect(DataStructs.CreateFromBinary(fp_b))
    return DataStructs.TanimotoSimilarity(a, b)

def most_similar(smiles: str, top_n: int = 5) -> List[Tuple[str, str, float]]:
    """Return a list of the ``top_n`` most similar FDA drugs.

    Each entry is a tuple ``(drug_name, drug_smiles, similarity)`` sorted from
    highest to lowest similarity.
    """
    query_fp = fingerprint(smiles)
    drug_lib = _load_fda_drugs()
    results: List[Tuple[str, str, float]] = []
    for drug in drug_lib:
        try:
            fp = fingerprint(drug["smiles"])
            sim = tanimoto_similarity(query_fp, fp)
            results.append((drug["name"], drug["smiles"], sim))
        except Exception:
            continue
    results.sort(key=lambda x: x[2], reverse=True)
    return results[:top_n]

# Helper functions for FastAPI JSON transport
def _fp_to_hex(fp: bytes) -> str:
    return fp.hex()

def _hex_to_fp(hex_str: str) -> bytes:
    return bytes.fromhex(hex_str)

def similarity_payload(smiles: str, top_n: int = 5) -> dict:
    """Public helper used by the FastAPI route.

    Returns a dict suitable for ``jsonable_encoder``.
    """
    matches = most_similar(smiles, top_n=top_n)
    return {
        "query_smiles": smiles,
        "top_n": top_n,
        "matches": [{"name": name, "smiles": smi, "tanimoto": round(sim, 3)} for name, smi, sim in matches],
    }
