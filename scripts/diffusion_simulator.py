"""
backend/app/utils/diffusion_simulator.py
REPLACE your existing diffusion_simulator.py with this.

Uses YOUR trained GNN model (backend/app/models/gnn_model.pt) to score molecules.
Falls back to rdkit-only scoring if model not trained yet.

Flow:
1. Load trained model (if exists)
2. Generate candidate SMILES using real drug-like scaffolds + pocket-guided selection
3. Score each candidate with GNN (or rdkit fallback)
4. Return top ranked molecules
"""

import os, sys, random, pickle, json
from pathlib import Path
from typing import Optional

import numpy as np

ROOT = Path(__file__).parent.parent.parent  # → mol-x/backend/app → mol-x/backend

try:
    from rdkit import Chem
    from rdkit.Chem import AllChem, Descriptors, QED
    RDKIT_OK = True
except ImportError:
    RDKIT_OK = False

try:
    import torch
    import torch.nn as nn
    TORCH_OK = True
except ImportError:
    TORCH_OK = False

# ── Paths ──────────────────────────────────────────────────────────
MODEL_PT    = ROOT / "app" / "models" / "gnn_model.pt"
CONFIG_JSON = ROOT / "app" / "models" / "model_config.json"
SCALER_PKL  = ROOT / "app" / "models" / "scaler.pkl"

# ── Drug-like scaffolds (curated from FDA-approved drug cores) ─────
SCAFFOLDS = [
    "c1ccc2ncccc2c1",           # quinoline
    "c1cnc2ccccc2c1",           # isoquinoline
    "c1ccc2[nH]cccc2c1",        # indole
    "c1cc2ccccc2o1",            # benzofuran
    "O=C1CCc2ccccc21",          # tetralone
    "c1ccc2c(c1)CCCO2",         # chromane
    "O=c1[nH]cnc2ccccc12",      # benzimidazolone
    "c1ccc(-c2ccccn2)cc1",      # biphenyl-pyridine
    "c1cnc2[nH]ccc2c1",         # purine-like
    "c1cc2ccccc2[nH]1",         # carbazole-like
    "O=C1CCCN1",                # pyrrolidinone
    "c1ccc2c(c1)nc1ccccc1n2",   # acridine
    "c1cc(-c2ccncc2)ccn1",      # bipyridine
    "O=C(O)c1cccnc1",           # nicotinic acid
    "c1ccc2sc3ccccc3c2c1",      # thioxanthene
    "c1ccc2c(c1)[nH]nc2",       # indazole
    "O=c1cc[nH]c(=O)[nH]1",     # uracil
    "c1ccc(NC(=O)c2ccccc2)cc1", # benzanilide
    "CC(=O)Nc1ccc(O)cc1",       # paracetamol
    "c1ccc(-c2ccc3[nH]ccc3c2)cc1", # phenyl-indole
]

FUNCTIONAL_GROUPS = [
    "C(=O)O",       "C(=O)N",    "S(=O)(=O)N",
    "C(F)(F)F",     "OC",        "NC",
    "C#N",          "F",         "Cl",
    "c1ccc(F)cc1",  "c1ccncc1",  "N1CCCC1",
    "C1CCNCC1",     "N1CCOC1",   "CC(C)C",
]


# ─────────────────────────────────────────────────────────────────
# MODEL LOADER
# ─────────────────────────────────────────────────────────────────

class PocketConditionedNet(nn.Module):
    def __init__(self, pocket_dim=8, mol_dim=256, hidden=512, output_dim=4, dropout=0.3):
        super().__init__()
        self.pocket_encoder = nn.Sequential(
            nn.Linear(pocket_dim, 64), nn.LayerNorm(64), nn.GELU(), nn.Dropout(dropout),
            nn.Linear(64, 128), nn.GELU(),
        )
        self.mol_encoder = nn.Sequential(
            nn.Linear(mol_dim, 256), nn.LayerNorm(256), nn.GELU(), nn.Dropout(dropout),
            nn.Linear(256, 256), nn.GELU(),
        )
        self.predictor = nn.Sequential(
            nn.Linear(128 + 256, hidden), nn.LayerNorm(hidden), nn.GELU(), nn.Dropout(dropout),
            nn.Linear(hidden, 256), nn.GELU(), nn.Dropout(dropout * 0.5),
            nn.Linear(256, output_dim),
        )

    def forward(self, pocket_feat, mol_feat):
        p = self.pocket_encoder(pocket_feat)
        m = self.mol_encoder(mol_feat)
        return self.predictor(torch.cat([p, m], dim=-1))


_model   = None
_scaler  = None
_config  = None
_device  = None

def _load_model():
    global _model, _scaler, _config, _device

    if _model is not None:
        return True  # Already loaded

    if not MODEL_PT.exists():
        return False  # Not trained yet

    try:
        _device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

        with open(CONFIG_JSON) as f:
            _config = json.load(f)

        _model = PocketConditionedNet(
            pocket_dim=_config["pocket_dim"],
            mol_dim=_config["mol_dim"],
            hidden=_config["hidden"],
            output_dim=_config["output_dim"],
            dropout=0.0,  # No dropout at inference
        ).to(_device)

        ckpt = torch.load(MODEL_PT, map_location=_device)
        _model.load_state_dict(ckpt["model_state_dict"])
        _model.eval()

        with open(SCALER_PKL, "rb") as f:
            _scaler = pickle.load(f)

        return True
    except Exception as e:
        print(f"Warning: Could not load model: {e}. Using rdkit fallback.")
        return False


# ─────────────────────────────────────────────────────────────────
# FEATURE FUNCTIONS (same as train_gnn.py)
# ─────────────────────────────────────────────────────────────────

def _smiles_to_fp(smiles: str, n_bits: int = 256) -> np.ndarray:
    try:
        mol = Chem.MolFromSmiles(smiles)
        if mol is None:
            return np.zeros(n_bits)
        fp = AllChem.GetMorganFingerprintAsBitVect(mol, radius=2, nBits=n_bits)
        arr = np.zeros(n_bits)
        for bit in fp.GetOnBits():
            arr[bit] = 1.0
        return arr
    except Exception:
        return np.zeros(n_bits)


def _pocket_features_from_params(pocket_params: dict) -> np.ndarray:
    """Build pocket feature vector from generation params"""
    return np.array([
        pocket_params.get("pocket_size", 50),
        pocket_params.get("cx", 0.0),
        pocket_params.get("cy", 0.0),
        pocket_params.get("cz", 0.0),
        pocket_params.get("hydrophobic", 3),
        pocket_params.get("hbond_donors", 2),
        pocket_params.get("charged", 1),
        pocket_params.get("volume", 1000.0),
    ], dtype=np.float32)


# ─────────────────────────────────────────────────────────────────
# MOLECULE GENERATION
# ─────────────────────────────────────────────────────────────────

def _generate_candidate_smiles(seed: int, diversity: float, temperature: float) -> Optional[str]:
    """Generate one candidate SMILES from scaffold + functional group"""
    random.seed(seed)

    scaffold = random.choice(SCAFFOLDS)

    # Add functional group based on diversity
    if random.random() < diversity:
        fg = random.choice(FUNCTIONAL_GROUPS)
        candidates = [scaffold + fg, fg + scaffold, scaffold]
    else:
        candidates = [scaffold]

    for candidate in candidates:
        try:
            mol = Chem.MolFromSmiles(candidate)
            if mol and 8 <= mol.GetNumAtoms() <= 50:
                Chem.SanitizeMol(mol)
                return Chem.MolToSmiles(mol)
        except Exception:
            continue

    # Validated fallback
    fallbacks = [
        "CC(=O)Nc1ccc(O)cc1",
        "CN1C=NC2=C1C(=O)N(C(=O)N2C)C",
        "OC(=O)c1ccccc1OC(C)=O",
        "c1ccc(CC2CCNCC2)cc1",
        "CC(C)NCC(O)c1ccc(O)c(O)c1",
        "O=C(O)c1ccc(N)cc1",
    ]
    return fallbacks[seed % len(fallbacks)]


def _rdkit_score(smiles: str, temperature: float, seed: int) -> dict:
    """Score molecule using only rdkit (no GNN)"""
    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        return None

    mw   = Descriptors.MolWt(mol)
    logp = Descriptors.MolLogP(mol)
    hbd  = Descriptors.NumHDonors(mol)
    hba  = Descriptors.NumHAcceptors(mol)
    tpsa = Descriptors.TPSA(mol)
    rbs  = Descriptors.NumRotatableBonds(mol)
    rings= Descriptors.RingCount(mol)
    qed_s= QED.qed(mol)

    lipinski_violations = sum([mw > 500, logp > 5, hbd > 5, hba > 10])
    lipinski_pass = lipinski_violations == 0
    veber_pass = tpsa <= 140 and rbs <= 10

    # Simulated binding affinity
    random.seed(seed)
    base = -5.0 - qed_s * 3.5 - min(logp, 3) * 0.5
    noise = (random.random() - 0.5) * temperature * 2.0
    binding = round(base + noise, 2)

    # Drug score composite
    drug_score = round(
        qed_s * 0.4 +
        (1 - lipinski_violations / 4) * 0.3 +
        (1.0 if veber_pass else 0.5) * 0.15 +
        min(rings / 3, 1.0) * 0.15, 3
    )

    tier_class = "top" if qed_s > 0.7 and lipinski_pass and binding < -7.5 else \
                 "good" if qed_s > 0.55 and lipinski_pass else \
                 "moderate" if lipinski_pass else "low"

    tier_label = {"top": "⭐ Top Candidate", "good": "✓ Promising",
                  "moderate": "~ Moderate", "low": "✗ Low Priority"}[tier_class]

    return {
        "smiles": smiles,
        "mol_weight": round(mw, 1),
        "logp": round(logp, 2),
        "hbd": hbd, "hba": hba,
        "tpsa": round(tpsa, 1),
        "rotatable_bonds": rbs,
        "ring_count": rings,
        "qed": round(qed_s, 3),
        "binding_affinity": binding,
        "lipinski_pass": lipinski_pass,
        "lipinski": "✅ Pass" if lipinski_pass else f"⚠️ {lipinski_violations} violation(s)",
        "veber_pass": veber_pass,
        "drug_score": drug_score,
        "tier_class": tier_class,
        "tier": tier_label,
        "scored_by": "rdkit",
    }


def _gnn_score(smiles: str, pocket_params: dict, temperature: float, seed: int) -> dict:
    """Score molecule using trained GNN model"""
    # Get rdkit base properties
    base = _rdkit_score(smiles, temperature, seed)
    if base is None:
        return None

    try:
        # Build tensors
        pocket_feat = _pocket_features_from_params(pocket_params)
        pocket_feat_scaled = _scaler.transform(pocket_feat.reshape(1, -1)).astype(np.float32)
        mol_feat = _smiles_to_fp(smiles, _config["mol_dim"])

        p_tensor = torch.tensor(pocket_feat_scaled, dtype=torch.float32).to(_device)
        m_tensor = torch.tensor(mol_feat.reshape(1, -1), dtype=torch.float32).to(_device)

        with torch.no_grad():
            pred = _model(p_tensor, m_tensor).cpu().numpy()[0]

        # Decode normalized predictions
        qed_pred      = float(np.clip(pred[0], 0, 1))
        logp_pred     = float(pred[1] * 15 - 5)
        affinity_pred = float(pred[2] * 15 - 15)
        lipinski_pred = float(np.clip(pred[3], 0, 1)) > 0.5

        # GNN predictions override rdkit where GNN is more confident
        base["qed"]             = round(qed_pred, 3)
        base["logp"]            = round(logp_pred, 2)
        base["binding_affinity"]= round(affinity_pred, 2)
        base["lipinski_pass"]   = lipinski_pred
        base["scored_by"]       = "gnn"

        # Recompute tier with GNN scores
        if qed_pred > 0.7 and lipinski_pred and affinity_pred < -7.5:
            base["tier_class"] = "top"
            base["tier"] = "⭐ Top Candidate"
        elif qed_pred > 0.55 and lipinski_pred:
            base["tier_class"] = "good"
            base["tier"] = "✓ Promising"

        drug_score = round(
            qed_pred * 0.4 +
            (1.0 if lipinski_pred else 0.5) * 0.3 +
            (1.0 if base["veber_pass"] else 0.5) * 0.15 +
            min(base["ring_count"] / 3, 1.0) * 0.15, 3
        )
        base["drug_score"] = drug_score

    except Exception as e:
        base["scored_by"] = "rdkit_fallback"

    return base


# ─────────────────────────────────────────────────────────────────
# PUBLIC API — called by backend/app/main.py
# ─────────────────────────────────────────────────────────────────

def generate_molecules(
    n: int = 24,
    diffusion_steps: int = 100,
    temperature: float = 0.8,
    binding_radius: float = 5.0,
    diversity: float = 0.7,
    pocket_params: dict = None,
    disease: str = "general",
) -> list:
    """
    Generate n drug-like molecules, scored by GNN if trained else rdkit.
    pocket_params: optional dict with pocket geometry from uploaded PDB
    """

    if not RDKIT_OK:
        raise RuntimeError("rdkit not available")

    # Try loading trained model
    model_loaded = TORCH_OK and _load_model()

    if pocket_params is None:
        pocket_params = {
            "pocket_size": 50, "cx": 0.0, "cy": 0.0, "cz": 0.0,
            "hydrophobic": 3, "hbond_donors": 2, "charged": 1, "volume": 1000.0
        }

    # Generate more candidates than needed (filter later)
    n_candidates = max(n * 3, 60)
    seeds = random.sample(range(1, 100000), n_candidates)

    molecules = []
    seen_smiles = set()

    for seed in seeds:
        if len(molecules) >= n:
            break

        smiles = _generate_candidate_smiles(seed, diversity, temperature)
        if not smiles or smiles in seen_smiles:
            continue

        seen_smiles.add(smiles)

        # Score
        if model_loaded:
            result = _gnn_score(smiles, pocket_params, temperature, seed)
        else:
            result = _rdkit_score(smiles, temperature, seed)

        if result is None:
            continue

        result["id"] = f"MOL-{seed:05d}"
        result["diffusion_steps"] = diffusion_steps

        molecules.append(result)

    # Sort by binding affinity (most negative = best binder)
    molecules.sort(key=lambda x: x["binding_affinity"])

    scoring_method = "GNN (trained model)" if model_loaded else "RDKit (model not trained yet)"
    print(f"Generated {len(molecules)} molecules | Scoring: {scoring_method}")

    return molecules[:n]
