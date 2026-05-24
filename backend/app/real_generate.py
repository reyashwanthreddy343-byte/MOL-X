import subprocess, json, os, tempfile

def generate_with_diffsbdd(pdb_path: str, n_mols: int = 10) -> list:
    """Call real DiffSBDD model, return list of SMILES"""
    model_dir = os.path.join(os.path.dirname(__file__), '../../real_model')
    ckpt = os.path.join(model_dir, 'crossdocked_fullatom_cond.ckpt')
    
    with tempfile.TemporaryDirectory() as outdir:
        cmd = [
            'python', os.path.join(model_dir, 'generate_ligands.py'),
            ckpt,
            '--pdbfile', pdb_path,
            '--outdir', outdir,
            '--n_samples', str(n_mols),
        ]
        subprocess.run(cmd, check=True, cwd=model_dir)
        
        # Read output SDF files
        smiles_list = []
        for f in os.listdir(outdir):
            if f.endswith('.sdf'):
                from rdkit import Chem
                mol = Chem.MolFromMolFile(os.path.join(outdir, f))
                if mol:
                    smiles_list.append(Chem.MolToSmiles(mol))
        return smiles_list