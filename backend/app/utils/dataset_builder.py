# mol-x/backend/app/utils/dataset_builder.py
import os
import glob
import pandas as pd
from rdkit import Chem
from tqdm import tqdm
from .rdkit_utils import compute_molecule_properties, generate_3d_coords

def build_pdbbind_dataset(base_path="app/data/pdbbind", output_path="app/data/processed_dataset", max_complexes=1000):
    print("🚀 Starting PDBbind Dataset Building...")

    general_set_path = os.path.join(base_path, "general-set")
    if not os.path.exists(general_set_path):
        print(f"❌ general-set folder not found!")
        return False

    data = []
    complex_count = 0

    year_folders = ["1981-2000", "2001-2010", "2011-2019"]

    for year in year_folders:
        year_path = os.path.join(general_set_path, year)
        if not os.path.exists(year_path):
            continue

        # Find ALL PDB ID folders (they are subfolders)
        pdb_ids = [d for d in os.listdir(year_path) if os.path.isdir(os.path.join(year_path, d))]
        print(f"Found {len(pdb_ids)} complexes in {year}")

        for pdb_id in tqdm(pdb_ids, desc=f"Processing {year}"):
            if complex_count >= max_complexes:
                break

            pdb_folder = os.path.join(year_path, pdb_id)

            # Try different possible ligand file names
            ligand_paths = [
                os.path.join(pdb_folder, "ligand.sdf"),
                os.path.join(pdb_folder, f"{pdb_id}_ligand.sdf"),
                os.path.join(pdb_folder, "ligand.mol2")
            ]

            ligand_path = None
            for path in ligand_paths:
                if os.path.exists(path):
                    ligand_path = path
                    break

            if not ligand_path:
                continue

            try:
                supplier = Chem.SDMolSupplier(ligand_path)
                mol = next(iter(supplier), None)
                
                if mol is None:
                    continue

                smiles = Chem.MolToSmiles(mol)
                if not smiles:
                    continue

                mol_3d = generate_3d_coords(smiles)
                props = compute_molecule_properties(mol_3d or mol)

                if props:
                    data.append({
                        "pdb_id": pdb_id,
                        "smiles": smiles,
                        "year": year,
                        **props,
                        "ligand_file": ligand_path
                    })
                    complex_count += 1

            except:
                continue

    # Save final dataset
    os.makedirs(output_path, exist_ok=True)
    df = pd.DataFrame(data)
    csv_path = os.path.join(output_path, "metadata.csv")
    df.to_csv(csv_path, index=False)

    print(f"✅ Dataset completed! Total complexes processed: {complex_count}")
    print(f"📊 Saved to: {csv_path}")
    return True


# Run directly if executed
if __name__ == "__main__":
    build_pdbbind_dataset(max_complexes=800)