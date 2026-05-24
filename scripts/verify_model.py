"""
scripts/verify_model.py
Run after training to confirm everything works end-to-end.
python scripts/verify_model.py
"""

import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT / "backend"))

print("=" * 50)
print("MOL-X Environment + Model Verification")
print("=" * 50)

# 1. PyTorch + GPU
try:
    import torch
    print(f"✓ PyTorch: {torch.__version__}")
    print(f"✓ CUDA available: {torch.cuda.is_available()}")
    if torch.cuda.is_available():
        print(f"✓ GPU: {torch.cuda.get_device_name(0)}")
        print(f"✓ VRAM: {torch.cuda.get_device_properties(0).total_memory / 1e9:.1f} GB")
except ImportError:
    print("✗ PyTorch not found")

# 2. RDKit
try:
    from rdkit import Chem
    from rdkit.Chem import QED
    mol = Chem.MolFromSmiles("CC(=O)Nc1ccc(O)cc1")
    print(f"✓ RDKit OK | Test QED: {round(QED.qed(mol), 3)}")
except ImportError:
    print("✗ RDKit not found")

# 3. NumPy (DLL fix check)
try:
    import numpy as np
    a = np.array([1.0, 2.0, 3.0])
    print(f"✓ NumPy: {np.__version__}")
except Exception as e:
    print(f"⚠ NumPy issue: {e}")
    print("  Fix: conda install numpy=1.24 -c conda-forge")

# 4. Model files
model_pt    = ROOT / "backend" / "app" / "models" / "gnn_model.pt"
config_json = ROOT / "backend" / "app" / "models" / "model_config.json"
scaler_pkl  = ROOT / "backend" / "app" / "models" / "scaler.pkl"

if model_pt.exists():
    print(f"✓ Trained model found: {model_pt}")
    ckpt = torch.load(model_pt, map_location="cpu")
    print(f"  Trained at epoch: {ckpt['epoch']}")
    print(f"  Val loss: {ckpt['val_loss']:.4f}")
else:
    print(f"⚠ Model not trained yet: {model_pt}")
    print("  Run: python scripts/preprocess_pdbbind.py")
    print("  Then: python scripts/train_gnn.py")

# 5. Training data
train_csv = ROOT / "backend" / "app" / "data" / "processed_dataset" / "training_data.csv"
if train_csv.exists():
    import pandas as pd
    df = pd.read_csv(train_csv)
    print(f"✓ Training data: {len(df)} molecules")
else:
    print(f"⚠ Training data not found. Run preprocess_pdbbind.py")

# 6. Test full generation pipeline
print("\nTesting generation pipeline...")
try:
    sys.path.insert(0, str(ROOT / "backend" / "app" / "utils"))
    from diffusion_simulator import generate_molecules
    mols = generate_molecules(n=3, temperature=0.8, diversity=0.7)
    print(f"✓ Generated {len(mols)} test molecules")
    for m in mols:
        print(f"  {m['id']} | QED:{m['qed']} | Affinity:{m['binding_affinity']} | Scored by: {m.get('scored_by','?')}")
except Exception as e:
    print(f"✗ Generation failed: {e}")

print("\n" + "=" * 50)
print("If all ✓ → run backend: uvicorn app.main:app --reload")
print("=" * 50)


# ─────────────────────────────────────────────────────────────────
# NUMPY DLL FIX (common issue on Windows with pmdm env)
# If you see: DLL load failed while importing _multiarray_umath
# Run this script with --fix flag:
#   python scripts/verify_model.py --fix
# ─────────────────────────────────────────────────────────────────
if "--fix" in sys.argv:
    import subprocess
    print("\nApplying NumPy DLL fix...")
    subprocess.run([
        sys.executable, "-m", "pip", "install",
        "numpy==1.24.4", "--force-reinstall"
    ])
    print("Done. Restart terminal and try again.")
