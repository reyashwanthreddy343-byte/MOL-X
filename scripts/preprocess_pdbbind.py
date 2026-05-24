import os, sys, json
import pandas as pd
import numpy as np
from pathlib import Path

# Add backend to path
ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT / "backend"))

try:
    from rdkit import Chem
    from rdkit.Chem import Descriptors, AllChem, QED
    RDKIT_OK = True
except ImportError:
    print("ERROR: rdkit not found. Run: conda install -c conda-forge rdkit")
    sys.exit(1)

try:
    from Bio.PDB import PDBParser
    BIO_OK = True
except ImportError:
    BIO_OK = False
    print("WARNING: biopython not found. Pocket features will be limited.")

# ─── PATHS (matches YOUR folder structure exactly) ───
PDBBIND_ROOT = ROOT / "backend" / "app" / "data" / "pdbbind" / "general-set"
OUTPUT_DIR   = ROOT / "backend" / "app" / "data" / "processed_dataset"
OUTPUT_CSV   = OUTPUT_DIR / "training_data.csv"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

YEAR_FOLDERS = ["1981-2000", "2001-2010", "2011-2019"]


def get_pocket_features(pocket_pdb_path: Path) -> dict:
    """Extract 3D features from pocket PDB file"""
    features = {
        "pocket_size": 0,
        "pocket_cx": 0.0, "pocket_cy": 0.0, "pocket_cz": 0.0,
        "hydrophobic_count": 0,
        "hbond_donor_count": 0,
        "charged_count": 0,
        "pocket_volume_approx": 0.0,
    }

    HYDROPHOBIC = {"ALA","VAL","ILE","LEU","MET","PHE","TRP","PRO","TYR"}
    HBOND_DONOR = {"SER","THR","TYR","ASN","GLN","HIS","TRP","ARG","LYS"}
    CHARGED     = {"ASP","GLU","ARG","LYS","HIS"}

    try:
        coords = []
        res_names = set()

        with open(pocket_pdb_path, 'r') as f:
            for line in f:
                if line.startswith("ATOM") or line.startswith("HETATM"):
                    try:
                        x = float(line[30:38])
                        y = float(line[38:46])
                        z = float(line[46:54])
                        res = line[17:20].strip()
                        coords.append([x, y, z])
                        res_names.add(res)
                    except (ValueError, IndexError):
                        continue

        if coords:
            coords_arr = np.array(coords)
            center = coords_arr.mean(axis=0)
            features["pocket_size"]       = len(coords)
            features["pocket_cx"]         = round(float(center[0]), 3)
            features["pocket_cy"]         = round(float(center[1]), 3)
            features["pocket_cz"]         = round(float(center[2]), 3)
            features["hydrophobic_count"] = len(res_names & HYDROPHOBIC)
            features["hbond_donor_count"] = len(res_names & HBOND_DONOR)
            features["charged_count"]     = len(res_names & CHARGED)

            # Approximate volume via bounding box
            bbox = coords_arr.max(axis=0) - coords_arr.min(axis=0)
            features["pocket_volume_approx"] = round(float(np.prod(bbox)), 1)

    except Exception as e:
        pass  # Return default zeros on error

    return features


def get_ligand_properties(ligand_sdf_path: Path, ligand_mol2_path: Path) -> dict:
    """Extract ligand SMILES + RDKit properties"""
    result = {
        "smiles": None,
        "mol_weight": None,
        "logp": None,
        "qed": None,
        "hbd": None,
        "hba": None,
        "tpsa": None,
        "num_rings": None,
        "lipinski_pass": None,
        "binding_affinity_approx": None,
    }

    mol = None

    # Try SDF first
    if ligand_sdf_path.exists():
        try:
            suppl = Chem.SDMolSupplier(str(ligand_sdf_path), removeHs=True)
            for m in suppl:
                if m is not None:
                    mol = m
                    break
        except Exception:
            pass

    # Fallback: mol2
    if mol is None and ligand_mol2_path.exists():
        try:
            mol = Chem.MolFromMol2File(str(ligand_mol2_path), removeHs=True)
        except Exception:
            pass

    if mol is None:
        return result

    try:
        smiles = Chem.MolToSmiles(mol)
        mw     = Descriptors.MolWt(mol)
        logp   = Descriptors.MolLogP(mol)
        hbd    = Descriptors.NumHDonors(mol)
        hba    = Descriptors.NumHAcceptors(mol)
        tpsa   = Descriptors.TPSA(mol)
        rings  = Descriptors.RingCount(mol)
        qed_s  = QED.qed(mol)

        lipinski = (mw <= 500 and logp <= 5 and hbd <= 5 and hba <= 10)

        # Approximate binding affinity using QED + logp correlation
        binding = round(-5.0 - qed_s * 4.0 - min(logp, 3) * 0.5, 2)

        result.update({
            "smiles": smiles,
            "mol_weight": round(mw, 2),
            "logp": round(logp, 2),
            "qed": round(qed_s, 3),
            "hbd": hbd,
            "hba": hba,
            "tpsa": round(tpsa, 1),
            "num_rings": rings,
            "lipinski_pass": int(lipinski),
            "binding_affinity_approx": binding,
        })
    except Exception:
        pass

    return result


def scan_all_proteins() -> list:
    """Walk YOUR exact folder structure and collect all protein entries"""
    entries = []

    for year_folder in YEAR_FOLDERS:
        year_path = PDBBIND_ROOT / year_folder
        if not year_path.exists():
            print(f"  Skipping (not found): {year_path}")
            continue

        protein_dirs = sorted([d for d in year_path.iterdir() if d.is_dir()])
        print(f"  {year_folder}: {len(protein_dirs)} proteins found")

        for protein_dir in protein_dirs:
            pdb_id = protein_dir.name.lower()

            pocket_pdb  = protein_dir / f"{pdb_id}_pocket.pdb"
            protein_pdb = protein_dir / f"{pdb_id}_protein.pdb"
            ligand_sdf  = protein_dir / f"{pdb_id}_ligand.sdf"
            ligand_mol2 = protein_dir / f"{pdb_id}_ligand.mol2"

            # Must have at least pocket + one ligand file
            if not pocket_pdb.exists():
                continue
            if not ligand_sdf.exists() and not ligand_mol2.exists():
                continue

            entries.append({
                "pdb_id": pdb_id,
                "year_folder": year_folder,
                "pocket_pdb": pocket_pdb,
                "protein_pdb": protein_pdb,
                "ligand_sdf": ligand_sdf,
                "ligand_mol2": ligand_mol2,
            })

    return entries


def main():
    print("=" * 60)
    print("MOL-X PDBbind Preprocessor")
    print(f"Source: {PDBBIND_ROOT}")
    print(f"Output: {OUTPUT_CSV}")
    print("=" * 60)

    if not PDBBIND_ROOT.exists():
        print(f"ERROR: PDBbind folder not found: {PDBBIND_ROOT}")
        sys.exit(1)

    print("\nScanning protein folders...")
    entries = scan_all_proteins()
    print(f"\nTotal entries to process: {len(entries)}")

    if len(entries) == 0:
        print("ERROR: No valid protein entries found. Check folder structure.")
        sys.exit(1)

    rows = []
    failed = 0

    for i, entry in enumerate(entries):
        if i % 50 == 0:
            print(f"  Processing {i}/{len(entries)}... ({len(rows)} valid so far)")

        pdb_id = entry["pdb_id"]

        # Get pocket features
        pocket_feats = get_pocket_features(entry["pocket_pdb"])

        # Get ligand properties
        lig_props = get_ligand_properties(entry["ligand_sdf"], entry["ligand_mol2"])

        if lig_props["smiles"] is None:
            failed += 1
            continue

        row = {
            "pdb_id": pdb_id,
            "year_folder": entry["year_folder"],
            **pocket_feats,
            **lig_props,
        }
        rows.append(row)

    print(f"\nProcessed: {len(rows)} valid | Failed: {failed}")

    if len(rows) == 0:
        print("ERROR: No valid molecules extracted.")
        sys.exit(1)

    df = pd.DataFrame(rows)

    # Remove duplicates
    df = df.drop_duplicates(subset=["pdb_id"])

    # Save
    df.to_csv(OUTPUT_CSV, index=False)
    print(f"\nSaved: {OUTPUT_CSV}")
    print(f"Shape: {df.shape}")
    print(f"\nSample data:")
    print(df[["pdb_id","smiles","mol_weight","logp","qed","lipinski_pass"]].head(5).to_string())

    # Also save a summary JSON
    summary = {
        "total_entries": len(df),
        "lipinski_pass_rate": round(df["lipinski_pass"].mean() * 100, 1),
        "avg_qed": round(df["qed"].mean(), 3),
        "avg_mw": round(df["mol_weight"].mean(), 1),
        "year_counts": df["year_folder"].value_counts().to_dict(),
    }
    with open(OUTPUT_DIR / "dataset_summary.json", "w") as f:
        json.dump(summary, f, indent=2)

    print(f"\nDataset Summary:")
    print(f"  Total: {summary['total_entries']}")
    print(f"  Lipinski pass rate: {summary['lipinski_pass_rate']}%")
    print(f"  Avg QED: {summary['avg_qed']}")
    print(f"  Avg MW: {summary['avg_mw']} Da")
    print(f"\nDone. Run next: python scripts/train_gnn.py")


if __name__ == "__main__":
    main()
