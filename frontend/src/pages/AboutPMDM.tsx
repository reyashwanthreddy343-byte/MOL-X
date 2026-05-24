// export default function AboutPMDM() {
//   return (
//     <div className="max-w-4xl mx-auto px-6 py-12">
//       <h1 className="text-5xl font-bold mb-4">About PMDM</h1>
//       <p className="text-teal-400 text-xl mb-12">Pocket-Based Molecular Diffusion Model</p>

//       <div className="prose prose-invert max-w-none">
//         <p className="text-lg leading-relaxed">
//           PMDM is a 3D diffusion model that generates drug-like molecules conditioned on protein binding pockets.
//           Unlike traditional 2D SMILES generators, PMDM works directly in 3D space to ensure proper shape complementarity.
//         </p>

//         <div className="my-12 grid grid-cols-1 md:grid-cols-2 gap-8">
//           <div className="glass p-8 rounded-3xl">
//             <h3 className="text-xl font-semibold mb-4 text-teal-400">Why 3D Matters</h3>
//             <ul className="space-y-3 text-gray-300">
//               <li>• Captures spatial orientation and hydrogen bonding geometry</li>
//               <li>• Accounts for rotational and translational degrees of freedom</li>
//               <li>• Better binding affinity prediction</li>
//             </ul>
//           </div>
//           <div className="glass p-8 rounded-3xl">
//             <h3 className="text-xl font-semibold mb-4 text-teal-400">Key Features</h3>
//             <ul className="space-y-3 text-gray-300">
//               <li>• Trained on PDBbind dataset</li>
//               <li>• Dual Diffusion architecture</li>
//               <li>• Real-time scoring (QED, SA, Vina)</li>
//               <li>• Interactive 3D visualization</li>
//             </ul>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }
export default function AboutPMDM() {
  const sections = [
    {
      num: '01', title: 'What is MOL-X?', color: '#00ffaa',
      content: `MOL-X is an AI-powered drug discovery pipeline based on Pocket-based Molecular Diffusion Models (PMDM). 
      It takes a 3D protein structure as input, identifies the binding pocket, and generates novel small-molecule 
      drug candidates using equivariant diffusion — a deep learning technique that respects the 3D geometry of molecules.
      Built for real-world use by biologists, chemists, and researchers with no AI expertise required.`
    },
    {
      num: '02', title: 'Why Diffusion Models for Drug Design?', color: '#60a5fa',
      content: `Traditional drug discovery takes 12+ years and $2 billion per drug. AI-based generative models 
      can shortlist candidates in seconds. Diffusion models are preferred over GANs because they have stable training, 
      no mode collapse, and generate highly diverse molecules. Our model conditions on the 3D binding pocket — 
      this pocket-awareness is what makes the generated molecules actually likely to bind.`
    },
    {
      num: '03', title: 'PMDM Architecture', color: '#a78bfa',
      content: `Architecture: Equivariant Graph Neural Network (EGNN) as the backbone. 
      The diffusion process corrupts atom positions and types with Gaussian noise, then learns to reverse this 
      process conditioned on the protein pocket. Input: protein PDB file + binding site coordinates. 
      Output: 3D molecular graphs → SMILES strings → scored by QED, LogP, Lipinski, SA score, and docking affinity.`
    },
    {
      num: '04', title: 'Dataset: PDBbind + CrossDocked2020', color: '#f59e0b',
      content: `Training data: PDBbind v2020 (18,000+ protein-ligand complexes with binding affinities). 
      Preprocessing: pocket extraction within 10Å of the ligand, hydrogen removal, standard atom typing. 
      CrossDocked2020 adds 22 million cross-docked poses for augmentation. Our demo uses 800 curated PDBbind 
      entries spanning cancer, Alzheimer's, COVID, HIV, diabetes, tuberculosis, malaria, and Parkinson's targets.`
    },
    {
      num: '05', title: 'Scoring Pipeline', color: '#34d399',
      content: `Every generated molecule is scored by: (1) QED — Quantitative Estimate of Drug-likeness (0–1), 
      (2) LogP — lipophilicity for membrane permeability, (3) Lipinski Ro5 — oral bioavailability filter, 
      (4) TPSA — polar surface area for absorption, (5) SA Score — synthetic accessibility (1=easy, 10=hard), 
      (6) Binding affinity simulation using pocket geometry and force-field approximation. 
      Molecules are ranked by composite Drug Score.`
    },
    {
      num: '06', title: 'Real-World Applications', color: '#f97316',
      content: `MOL-X can be used by: pharma companies to accelerate lead compound identification, 
      academic labs to explore novel scaffolds for understudied targets, biotech startups for competitive 
      intelligence on target druggability, and teaching hospitals for personalized medicine research. 
      The tool is designed to be target-agnostic — any protein with a known 3D structure can be queried.`
    },
  ];

  const pipeline = [
    { step: '1', label: 'Input PDB', desc: 'Upload protein structure or select disease target', icon: '⛓' },
    { step: '2', label: 'Pocket Detection', desc: 'Identify binding site within 10Å radius', icon: '🎯' },
    { step: '3', label: 'Noise Injection', desc: 'Forward diffusion: corrupt molecule positions', icon: '〜' },
    { step: '4', label: 'EGNN Denoising', desc: 'Equivariant GNN reverses noise conditioned on pocket', icon: '🧠' },
    { step: '5', label: '3D Structure', desc: 'Output: atom positions, types, bonds', icon: '⚛' },
    { step: '6', label: 'Scoring', desc: 'QED, LogP, Lipinski, SA, docking affinity', icon: '📊' },
    { step: '7', label: 'Ranked Output', desc: 'Top candidates for wet lab validation', icon: '🏆' },
  ];

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '48px' }}>
        <h1 style={{
          fontSize: '48px', fontWeight: '900', margin: '0 0 12px',
          background: 'linear-gradient(135deg, #fff 0%, #00ffaa 50%, #60a5fa 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          letterSpacing: '-1.5px', lineHeight: 1.1
        }}>About PMDM</h1>
        <p style={{ color: '#475569', fontSize: '16px', maxWidth: '600px', lineHeight: 1.7, margin: 0 }}>
          Pocket-based Molecular Diffusion Model — the science, architecture, and real-world impact behind MOL-X.
        </p>
      </div>

      {/* Pipeline visualization */}
      <div style={{ marginBottom: '48px' }}>
        <div style={{ fontSize: '11px', color: '#475569', letterSpacing: '2px', marginBottom: '20px' }}>
          END-TO-END PIPELINE
        </div>
        <div style={{ display: 'flex', gap: '0', overflowX: 'auto', paddingBottom: '8px' }}>
          {pipeline.map((p, i) => (
            <div key={p.step} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              <div style={{
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '12px', padding: '16px 18px', textAlign: 'center',
                minWidth: '130px',
              }}>
                <div style={{ fontSize: '20px', marginBottom: '6px' }}>{p.icon}</div>
                <div style={{
                  fontSize: '10px', color: '#00ffaa', letterSpacing: '1px', marginBottom: '4px', fontWeight: '700'
                }}>STEP {p.step}</div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#e2e8f0', marginBottom: '4px' }}>{p.label}</div>
                <div style={{ fontSize: '11px', color: '#475569', lineHeight: 1.4 }}>{p.desc}</div>
              </div>
              {i < pipeline.length - 1 && (
                <div style={{ color: '#1e293b', fontSize: '20px', margin: '0 4px', flexShrink: 0 }}>→</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Info sections */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '40px' }}>
        {sections.map(({ num, title, color, content }) => (
          <div key={num} style={{
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '16px', padding: '24px',
            borderLeft: `3px solid ${color}`,
          }}>
            <div style={{ fontSize: '11px', color: color, letterSpacing: '2px', marginBottom: '8px', fontWeight: '700' }}>
              {num}
            </div>
            <h3 style={{ margin: '0 0 12px', fontSize: '16px', fontWeight: '700', color: '#e2e8f0' }}>{title}</h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b', lineHeight: 1.7 }}>{content}</p>
          </div>
        ))}
      </div>

      {/* Citation */}
      <div style={{
        background: 'rgba(0,255,170,0.04)', border: '1px solid rgba(0,255,170,0.15)',
        borderRadius: '16px', padding: '24px'
      }}>
        <div style={{ fontSize: '11px', color: '#00ffaa', letterSpacing: '2px', marginBottom: '12px' }}>
          CITATION — PMDM PAPER
        </div>
        <div style={{
          fontFamily: 'monospace', fontSize: '13px', color: '#475569',
          lineHeight: 1.7, background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px'
        }}>
          Liu, M. et al. "Generating 3D Molecules for Target Protein Binding."<br />
          <em>International Conference on Machine Learning (ICML)</em>, 2022.<br /><br />
          Schneuing, A. et al. "Structure-based drug design with equivariant diffusion models."<br />
          <em>Nature Computational Science</em>, vol. 4, no. 12, pp. 899-909, Dec. 2024.<br /><br />
          Wang, R. et al. "PDBbind-v2020: A comprehensive benchmark for protein-ligand binding affinity prediction."<br />
          <em>Journal of Chemical Information and Modeling</em>, 2020.
        </div>
        <p style={{ margin: '16px 0 0', fontSize: '13px', color: '#475569', lineHeight: 1.6 }}>
          MOL-X builds on these foundational works, adding a real-time interactive pipeline, 
          multi-target support across 8 major disease areas, and an accessible UI designed for 
          biologists and pharmacologists without deep learning expertise.
        </p>
      </div>
    </div>
  );
}
