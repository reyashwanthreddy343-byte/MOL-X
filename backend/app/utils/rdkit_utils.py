from rdkit import Chem
from rdkit.Chem import Descriptors, Crippen, QED, rdMolDescriptors
from rdkit.Chem import AllChem
import random

def compute_molecule_properties(mol):
    """Compute all properties for a molecule"""
    if mol is None:
        return None
    
    try:
        # Basic properties
        qed = QED.qed(mol)
        mw = Descriptors.MolWt(mol)
        logp = Crippen.MolLogP(mol)
        h_donors = Descriptors.NumHDonors(mol)
        h_acceptors = Descriptors.NumHAcceptors(mol)
        tpsa = rdMolDescriptors.CalcTPSA(mol)
        
        # Simulated binding affinity (Vina-style)
        binding_affinity = round(-8.0 - (qed * 3.5) + random.uniform(-2.0, 1.0), 1)
        
        # Lipinski rule check
        lipinski_ok = (h_donors <= 5 and h_acceptors <= 10 and mw <= 500 and logp <= 5)
        
        return {
            "qed": round(qed, 2),
            "sa": round(tpsa, 1),           # Using TPSA as proxy for SA score
            "molecular_weight": round(mw, 2),
            "logp": round(logp, 2),
            "h_donors": int(h_donors),
            "h_acceptors": int(h_acceptors),
            "binding_affinity": binding_affinity,
            "lipinski": "✅ OK" if lipinski_ok else "⚠️ Check"
        }
    except:
        return None


def generate_3d_coords(smiles):
    """Generate 3D coordinates from SMILES"""
    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        return None
    mol = Chem.AddHs(mol)
    AllChem.EmbedMolecule(mol, randomSeed=random.randint(1, 999))
    AllChem.MMFFOptimizeMolecule(mol)
    return mol