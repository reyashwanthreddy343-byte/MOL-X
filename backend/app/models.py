import torch
import torch.nn as nn
import numpy as np
from pathlib import Path
import os
import json

try:
    from rdkit import Chem
    from rdkit.Chem import AllChem
except ImportError:
    pass

class PocketConditionedNet(nn.Module):
    """
    Takes: pocket features (8-dim) + molecule fingerprint (256-dim)
    Predicts: [QED, LogP, binding_affinity, lipinski_pass]
    """
    def __init__(self, pocket_dim=8, mol_dim=256, hidden=512, output_dim=4, dropout=0.3):
        super().__init__()
        self.pocket_encoder = nn.Sequential(
            nn.Linear(pocket_dim, 64),
            nn.LayerNorm(64),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(64, 128),
            nn.GELU(),
        )
        self.mol_encoder = nn.Sequential(
            nn.Linear(mol_dim, 256),
            nn.LayerNorm(256),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(256, 256),
            nn.GELU(),
        )
        combined_dim = 128 + 256
        self.predictor = nn.Sequential(
            nn.Linear(combined_dim, hidden),
            nn.LayerNorm(hidden),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(hidden, 256),
            nn.GELU(),
            nn.Dropout(dropout * 0.5),
            nn.Linear(256, output_dim),
        )

    def forward(self, pocket_feat, mol_feat):
        p = self.pocket_encoder(pocket_feat)
        m = self.mol_encoder(mol_feat)
        combined = torch.cat([p, m], dim=-1)
        return self.predictor(combined)

# ── HARDWARE ACCELERATION ──────────────────────────────────────────────
_device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
IS_GPU = torch.cuda.is_available()
_scaler = None
_model = None

def get_model():
    global _model
    if _model is None:
        _model = PocketConditionedNet(
            pocket_dim=8,
            mol_dim=256,
            hidden=512,
            output_dim=4,
            dropout=0.3
        ).to(_device)
        
        # Load pre-trained weights if available, else use randomly initialized weights on GPU
        model_path = Path(os.path.dirname(__file__)) / "models" / "gnn_model.pt"
        if model_path.exists():
            try:
                ckpt = torch.load(model_path, map_location=_device)
                _model.load_state_dict(ckpt["model_state_dict"])
                print("Loaded trained PMDM GNN from weights on", _device)
            except Exception as e:
                print(f"Using randomly initialized model on {_device}. Failed to load weights: {e}")
        else:
            print(f"Using randomly initialized PyTorch model on {_device} for generation.")
            
        _model.eval()
    return _model

def smiles_to_fingerprint(smiles: str, n_bits: int = 256) -> np.ndarray:
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

def score_molecules_with_gpu(smiles_list, disease="cancer"):
    """
    Utilize the PyTorch model running on the GPU to score molecules!
    This explicitly puts load on CUDA / the GPU.
    """
    if not smiles_list:
        return []
    
    model = get_model()
    
    # Generate mock pocket features based on the disease purely for simulation to feed the model
    # Normally this comes from parsing the PDB inside the preprocess step
    disease_hash = sum(ord(c) for c in disease)
    pocket_feat_arr = np.array([
        100 + disease_hash % 50,  # size
        (disease_hash % 20) - 10,  # cx
        (disease_hash % 15) - 7,   # cy
        (disease_hash % 30) - 15,  # cz
        15 + disease_hash % 10,   # hydrophobic_count
        8 + disease_hash % 5,     # hbond_donor
        4 + disease_hash % 8,     # charged_count
        1500.0 + disease_hash     # volume
    ], dtype=np.float32)
    
    # Scale pocket manually (simulating the StandardScaler from train_gnn.py)
    # Using rough empirical means / stds since we might not have the loaded scaler
    pocket_mean = np.array([120, 0, 0, 0, 20, 10, 8, 2000], dtype=np.float32)
    pocket_std = np.array([50, 20, 20, 20, 10, 5, 4, 1000], dtype=np.float32)
    scaled_pocket = (pocket_feat_arr - pocket_mean) / (pocket_std + 1e-6)
    
    # Prepare batch tensors
    batch_size = len(smiles_list)
    pocket_tensor = torch.tensor(scaled_pocket, dtype=torch.float32).unsqueeze(0).repeat(batch_size, 1).to(_device)
    
    fp_list = [smiles_to_fingerprint(s) for s in smiles_list]
    mol_tensor = torch.tensor(np.array(fp_list), dtype=torch.float32).to(_device)
    
    with torch.no_grad():
        preds = model(pocket_tensor, mol_tensor)
        # preds is [QED_norm, LogP_norm, Affinity_norm, Lipinski]
        # De-normalize:
        # y_qed: clip(0,1)
        # y_logp: ((logp + 5) / 15) -> logp = pred * 15 - 5
        # y_affinity: ((affinity + 15) / 15) -> affinity = pred * 15 - 15
        
        preds_cpu = preds.cpu().numpy()
        
    scores = []
    for i in range(batch_size):
        q_norm = preds_cpu[i, 0]
        l_norm = preds_cpu[i, 1]
        a_norm = preds_cpu[i, 2]
        
        scores.append({
            "nn_qed": max(0.0, min(1.0, float(q_norm))),
            "nn_logp": float(l_norm * 15 - 5),
            "nn_affinity": float(a_norm * 15 - 15),
            "nn_lipinski_prob": float(1 / (1 + np.exp(-preds_cpu[i, 3]))) # sigmoid
        })
        
    return scores
