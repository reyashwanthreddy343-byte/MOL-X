import random
import pandas as pd
from .rdkit_utils import generate_3d_coords, compute_molecule_properties

# Load the real dataset we built
DATASET_PATH = "app/data/processed_dataset/metadata.csv"

def load_real_dataset():
    try:
        df = pd.read_csv(DATASET_PATH)
        print(f"✅ Loaded {len(df)} real molecules from PDBbind dataset")
        return df.to_dict('records')
    except:
        print("⚠️ Could not load dataset, using fallback")
        return []

REAL_MOLECULES = load_real_dataset()

def simulate_diffusion_generation(pocket_info=None, num_molecules=24, steps=100, temperature=0.8, diversity=0.7):
    molecules = []
    
    if REAL_MOLECULES:
        # Use real molecules from dataset
        selected = random.sample(REAL_MOLECULES, min(num_molecules, len(REAL_MOLECULES)))
        for item in selected:
            mol = generate_3d_coords(item['smiles'])
            props = compute_molecule_properties(mol)
            if props:
                molecules.append({
                    "id": item.get("pdb_id", f"M-{random.randint(1,99):02d}"),
                    "smiles": item['smiles'],
                    "name": item.get("pdb_id", f"M-{random.randint(1,99):02d}"),
                    **props
                })
    else:
        # Fallback if dataset not loaded
        base_smiles = ["CC(=O)Nc1ccc(O)cc1", "CCN1CCN(Cc2ccccc2)CC1", "COc1ccc(C(=O)N)cc1"]
        for i in range(num_molecules):
            smiles = random.choice(base_smiles)
            mol = generate_3d_coords(smiles)
            props = compute_molecule_properties(mol)
            if props:
                molecules.append({
                    "id": f"M-{i+1:02d}",
                    "smiles": smiles,
                    "name": f"M-{i+1:02d}",
                    **props
                })
    
    return molecules