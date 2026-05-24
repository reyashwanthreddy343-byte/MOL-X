"""
scripts/train_gnn.py
Trains a Graph Neural Network on your PDBbind data.
Uses YOUR GTX 1660 Ti GPU (CUDA cu118).

What it learns:
  Input:  pocket features (size, hydrophobicity, charge, volume, center coords)
  Output: predicts good molecular properties (QED, LogP, binding affinity)
         → used at generation time to score/filter molecules

Architecture: Pocket-conditioned MLP (no graph needed for pocket features).
For actual molecule GNN: uses Morgan fingerprint as graph proxy.

Run AFTER preprocess_pdbbind.py:
  python scripts/train_gnn.py

Saves: backend/app/models/gnn_model.pt
       backend/app/models/model_config.json
       backend/app/models/scaler.pkl
"""

import os, sys, json, time, pickle
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT / "backend"))

# ── Imports ──────────────────────────────────────────────────────
try:
    import torch
    import torch.nn as nn
    import torch.optim as optim
    from torch.utils.data import Dataset, DataLoader
    TORCH_OK = True
except ImportError:
    print("ERROR: torch not found. Run: pip install torch --index-url https://download.pytorch.org/whl/cu118")
    sys.exit(1)

try:
    from rdkit import Chem
    from rdkit.Chem import AllChem, Descriptors
    RDKIT_OK = True
except ImportError:
    print("ERROR: rdkit not found.")
    sys.exit(1)

try:
    from sklearn.preprocessing import StandardScaler
    from sklearn.model_selection import train_test_split
    SKLEARN_OK = True
except ImportError:
    print("ERROR: scikit-learn not found. Run: pip install scikit-learn")
    sys.exit(1)

# ── Paths ─────────────────────────────────────────────────────────
DATA_CSV   = ROOT / "backend" / "app" / "data" / "processed_dataset" / "training_data.csv"
MODEL_DIR  = ROOT / "backend" / "app" / "models"
MODEL_PT   = MODEL_DIR / "gnn_model.pt"
CONFIG_JSON= MODEL_DIR / "model_config.json"
SCALER_PKL = MODEL_DIR / "scaler.pkl"
MODEL_DIR.mkdir(parents=True, exist_ok=True)

# ── Device ────────────────────────────────────────────────────────
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"Device: {device}")
if device.type == "cuda":
    print(f"GPU: {torch.cuda.get_device_name(0)}")
    print(f"VRAM: {torch.cuda.get_device_properties(0).total_memory / 1e9:.1f} GB")


# ─────────────────────────────────────────────────────────────────
# FEATURE EXTRACTION
# ─────────────────────────────────────────────────────────────────

def smiles_to_fingerprint(smiles: str, n_bits: int = 256) -> np.ndarray:
    """Morgan fingerprint as molecular feature vector"""
    try:
        mol = Chem.MolFromSmiles(smiles)
        if mol is None:
            return np.zeros(n_bits)
        fp = AllChem.GetMorganFingerprintAsBitVect(mol, radius=2, nBits=n_bits)
        arr = np.zeros(n_bits)
        fp.GetOnBits()
        for bit in fp.GetOnBits():
            arr[bit] = 1.0
        return arr
    except Exception:
        return np.zeros(n_bits)


def pocket_to_features(row: pd.Series) -> np.ndarray:
    """Convert pocket columns to feature vector"""
    return np.array([
        row.get("pocket_size", 0),
        row.get("pocket_cx", 0.0),
        row.get("pocket_cy", 0.0),
        row.get("pocket_cz", 0.0),
        row.get("hydrophobic_count", 0),
        row.get("hbond_donor_count", 0),
        row.get("charged_count", 0),
        row.get("pocket_volume_approx", 0.0),
    ], dtype=np.float32)


# ─────────────────────────────────────────────────────────────────
# DATASET
# ─────────────────────────────────────────────────────────────────

class MoleculeDataset(Dataset):
    def __init__(self, X_pocket, X_mol, y):
        self.X_pocket = torch.tensor(X_pocket, dtype=torch.float32)
        self.X_mol    = torch.tensor(X_mol,    dtype=torch.float32)
        self.y        = torch.tensor(y,         dtype=torch.float32)

    def __len__(self):
        return len(self.y)

    def __getitem__(self, idx):
        return self.X_pocket[idx], self.X_mol[idx], self.y[idx]


# ─────────────────────────────────────────────────────────────────
# MODEL ARCHITECTURE
# Pocket-conditioned molecule property predictor
# ─────────────────────────────────────────────────────────────────

class PocketConditionedNet(nn.Module):
    """
    Takes: pocket features (8-dim) + molecule fingerprint (256-dim)
    Predicts: [QED, LogP, binding_affinity, lipinski_pass]
    """
    def __init__(self, pocket_dim=8, mol_dim=256, hidden=512, output_dim=4, dropout=0.3):
        super().__init__()

        # Pocket encoder
        self.pocket_encoder = nn.Sequential(
            nn.Linear(pocket_dim, 64),
            nn.LayerNorm(64),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(64, 128),
            nn.GELU(),
        )

        # Molecule encoder
        self.mol_encoder = nn.Sequential(
            nn.Linear(mol_dim, 256),
            nn.LayerNorm(256),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(256, 256),
            nn.GELU(),
        )

        # Combined predictor
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


# ─────────────────────────────────────────────────────────────────
# TRAINING
# ─────────────────────────────────────────────────────────────────

def train():
    print("\n" + "=" * 60)
    print("MOL-X GNN Trainer")
    print("=" * 60)

    # ── Load data ──────────────────────────────────────────────
    if not DATA_CSV.exists():
        print(f"ERROR: Training data not found: {DATA_CSV}")
        print("Run first: python scripts/preprocess_pdbbind.py")
        sys.exit(1)

    df = pd.read_csv(DATA_CSV)
    print(f"Loaded: {len(df)} molecules")

    # Drop rows with missing critical columns
    required = ["smiles", "qed", "logp", "binding_affinity_approx", "lipinski_pass"]
    df = df.dropna(subset=required)
    df = df[df["smiles"].str.len() > 3]
    print(f"After cleaning: {len(df)} valid molecules")

    if len(df) < 10:
        print("ERROR: Not enough data. Run preprocess_pdbbind.py first.")
        sys.exit(1)

    # ── Build features ─────────────────────────────────────────
    print("\nExtracting molecular fingerprints...")
    FP_BITS = 256

    X_pocket = np.array([pocket_to_features(row) for _, row in df.iterrows()], dtype=np.float32)

    X_mol = []
    valid_mask = []
    for i, (_, row) in enumerate(df.iterrows()):
        if i % 100 == 0:
            print(f"  Fingerprints: {i}/{len(df)}")
        fp = smiles_to_fingerprint(row["smiles"], FP_BITS)
        X_mol.append(fp)
        valid_mask.append(True)

    X_mol = np.array(X_mol, dtype=np.float32)

    # ── Targets ────────────────────────────────────────────────
    # Normalize targets to [0,1] range for stable training
    y_qed      = df["qed"].values.clip(0, 1).astype(np.float32)
    y_logp     = ((df["logp"].values.clip(-5, 10) + 5) / 15).astype(np.float32)
    y_affinity = ((df["binding_affinity_approx"].values.clip(-15, 0) + 15) / 15).astype(np.float32)
    y_lipinski = df["lipinski_pass"].values.clip(0, 1).astype(np.float32)

    y = np.stack([y_qed, y_logp, y_affinity, y_lipinski], axis=1)

    # ── Scale pocket features ───────────────────────────────────
    scaler = StandardScaler()
    X_pocket_scaled = scaler.fit_transform(X_pocket).astype(np.float32)

    # Save scaler for inference
    with open(SCALER_PKL, "wb") as f:
        pickle.dump(scaler, f)

    # ── Train/val split ─────────────────────────────────────────
    idx = np.arange(len(df))
    train_idx, val_idx = train_test_split(idx, test_size=0.15, random_state=42)

    train_ds = MoleculeDataset(X_pocket_scaled[train_idx], X_mol[train_idx], y[train_idx])
    val_ds   = MoleculeDataset(X_pocket_scaled[val_idx],   X_mol[val_idx],   y[val_idx])

    train_loader = DataLoader(train_ds, batch_size=64, shuffle=True,  num_workers=0, pin_memory=(device.type=="cuda"))
    val_loader   = DataLoader(val_ds,   batch_size=64, shuffle=False, num_workers=0, pin_memory=(device.type=="cuda"))

    print(f"\nTrain: {len(train_ds)} | Val: {len(val_ds)}")

    # ── Model ───────────────────────────────────────────────────
    model = PocketConditionedNet(
        pocket_dim=8,
        mol_dim=FP_BITS,
        hidden=512,
        output_dim=4,
        dropout=0.3,
    ).to(device)

    total_params = sum(p.numel() for p in model.parameters())
    print(f"Model params: {total_params:,}")

    optimizer = optim.AdamW(model.parameters(), lr=1e-3, weight_decay=1e-4)
    scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=50, eta_min=1e-5)
    criterion = nn.MSELoss()

    # ── Training loop ───────────────────────────────────────────
    EPOCHS = 80
    best_val_loss = float("inf")
    patience = 15
    patience_counter = 0

    print(f"\nTraining for up to {EPOCHS} epochs (early stop patience={patience})...")
    print("-" * 60)

    for epoch in range(1, EPOCHS + 1):
        # Train
        model.train()
        train_loss = 0.0
        for pocket_b, mol_b, y_b in train_loader:
            pocket_b = pocket_b.to(device)
            mol_b    = mol_b.to(device)
            y_b      = y_b.to(device)

            optimizer.zero_grad()
            pred = model(pocket_b, mol_b)
            loss = criterion(pred, y_b)
            loss.backward()
            nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()
            train_loss += loss.item()

        train_loss /= len(train_loader)

        # Validate
        model.eval()
        val_loss = 0.0
        with torch.no_grad():
            for pocket_b, mol_b, y_b in val_loader:
                pocket_b = pocket_b.to(device)
                mol_b    = mol_b.to(device)
                y_b      = y_b.to(device)
                pred = model(pocket_b, mol_b)
                val_loss += criterion(pred, y_b).item()
        val_loss /= len(val_loader)

        scheduler.step()

        # Log every 5 epochs
        if epoch % 5 == 0 or epoch == 1:
            lr = optimizer.param_groups[0]["lr"]
            print(f"Epoch {epoch:3d}/{EPOCHS} | Train: {train_loss:.4f} | Val: {val_loss:.4f} | LR: {lr:.6f}")

        # Save best
        if val_loss < best_val_loss:
            best_val_loss = val_loss
            patience_counter = 0
            torch.save({
                "epoch": epoch,
                "model_state_dict": model.state_dict(),
                "val_loss": val_loss,
                "train_loss": train_loss,
            }, MODEL_PT)
        else:
            patience_counter += 1
            if patience_counter >= patience:
                print(f"\nEarly stopping at epoch {epoch}")
                break

    print(f"\nBest val loss: {best_val_loss:.4f}")
    print(f"Model saved: {MODEL_PT}")

    # ── Save config ─────────────────────────────────────────────
    config = {
        "pocket_dim": 8,
        "mol_dim": FP_BITS,
        "hidden": 512,
        "output_dim": 4,
        "dropout": 0.3,
        "output_names": ["qed_norm", "logp_norm", "affinity_norm", "lipinski"],
        "total_train_molecules": len(df),
        "best_val_loss": round(best_val_loss, 4),
        "device_used": str(device),
        "cuda_device": torch.cuda.get_device_name(0) if torch.cuda.is_available() else "CPU",
    }
    with open(CONFIG_JSON, "w") as f:
        json.dump(config, f, indent=2)

    print(f"Config saved: {CONFIG_JSON}")
    print("\nDone! Now update backend to use this model.")
    print("Run: python scripts/verify_model.py")


if __name__ == "__main__":
    train()
