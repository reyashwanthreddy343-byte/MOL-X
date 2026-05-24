from Bio.PDB import PDBParser
import os

def parse_pdb_file(pdb_path):
    """Parse PDB file and extract basic info"""
    try:
        parser = PDBParser(QUIET=True)
        structure = parser.get_structure("protein", pdb_path)
        
        # Get center of mass (approximate pocket center)
        atoms = [atom for atom in structure.get_atoms()]
        if not atoms:
            return {"center": (0,0,0), "radius": 8.0}
        
        coords = [atom.coord for atom in atoms]
        center = tuple(sum(axis)/len(coords) for axis in zip(*coords))
        
        return {
            "center": center,
            "radius": 8.0,           # Default binding radius
            "num_atoms": len(atoms)
        }
    except:
        return {"center": (0,0,0), "radius": 8.0}