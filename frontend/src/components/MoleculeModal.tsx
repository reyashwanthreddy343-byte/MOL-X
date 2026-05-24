import { useState, useEffect } from 'react';
import MoleculeViewer from './MoleculeViewer';

interface Props { molecule: any; onClose: () => void; }

export default function MoleculeModal({ molecule: m, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<'3d' | 'diffusion'>('3d');
  const [diffusionStages, setDiffusionStages] = useState<any[]>([]);
  const [loadingStages, setLoadingStages] = useState(false);

  useEffect(() => {
    if (activeTab === 'diffusion' && diffusionStages.length === 0) {
      setLoadingStages(true);
      const b64 = btoa(unescape(encodeURIComponent(m.smiles)))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
      
      fetch(`http://127.0.0.1:8000/diffusion-stages/${b64}`)
        .then(r => r.json())
        .then(data => {
          if (data.stages) setDiffusionStages(data.stages);
          setLoadingStages(false);
        })
        .catch(() => setLoadingStages(false));
    }
  }, [activeTab, m.smiles, diffusionStages.length]);

  const copySMILES = () => {
    navigator.clipboard.writeText(m.smiles);
  };

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 999,
        background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(10px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
      }}
    >
      <div style={{
        background: '#080f17', border: '1px solid rgba(0,255,170,0.2)',
        borderRadius: '20px', width: '100%', maxWidth: '1100px',
        overflow: 'hidden', maxHeight: '92vh', display: 'flex', flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 28px', borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '20px', fontWeight: '800', color: '#fff', fontFamily: 'monospace' }}>
                {m.id}
              </div>
              <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px' }}>
                {m.target} · {m.tier}
                {m.protein_id && m.protein_id !== 'UNKNOWN' && (
                  <span style={{ marginLeft: '6px', color: '#00ffaa' }}>· {m.protein_id}</span>
                )}
              </div>
            </div>
            <div style={{
              padding: '6px 16px', borderRadius: '20px',
              background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.3)',
              fontSize: '20px', fontWeight: '800', color: '#ff6b6b', fontFamily: 'monospace'
            }}>
              {m.binding_affinity} kcal/mol
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            {/* View Toggle */}
            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', borderRadius: '8px', padding: '4px' }}>
              <button onClick={() => setActiveTab('3d')} style={{
                padding: '6px 16px', borderRadius: '6px', fontSize: '12px', fontWeight: '600',
                background: activeTab === '3d' ? 'rgba(0,255,170,0.15)' : 'transparent',
                color: activeTab === '3d' ? '#00ffaa' : '#64748b',
                border: 'none', cursor: 'pointer', transition: 'all 0.2s',
              }}>Analyzed 3D</button>
              <button onClick={() => setActiveTab('diffusion')} style={{
                padding: '6px 16px', borderRadius: '6px', fontSize: '12px', fontWeight: '600',
                background: activeTab === 'diffusion' ? 'rgba(0,255,170,0.15)' : 'transparent',
                color: activeTab === 'diffusion' ? '#00ffaa' : '#64748b',
                border: 'none', cursor: 'pointer', transition: 'all 0.2s',
              }}>Diffusion Stages</button>
            </div>

            <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.1)' }}></div>

            <button onClick={copySMILES} style={{
              padding: '8px 16px', borderRadius: '8px',
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
              color: '#94a3b8', fontSize: '13px', cursor: 'pointer'
            }}>Copy SMILES</button>
            <button onClick={onClose} style={{
              background: 'none', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px', color: '#64748b', fontSize: '18px',
              cursor: 'pointer', width: '36px', height: '36px',
            }}>✕</button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.8fr) minmax(0, 1fr)', flex: 1, overflow: 'hidden' }}>
          {/* Visualizer Area */}
          <div style={{ background: '#050a0e', borderRight: '1px solid rgba(255,255,255,0.06)', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            
            {activeTab === '3d' ? (
              <MoleculeViewer smiles={m.smiles} height="100%" />
            ) : (
              <div style={{ height: '100%', padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ fontSize: '12px', color: '#94a3b8', letterSpacing: '1px', textAlign: 'center', marginBottom: '8px' }}>
                  REVERSE DIFFUSION SIMULATION (3 KEY TIMESTEPS)
                </div>
                
                {loadingStages ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: '#64748b' }}>
                    Loading diffusion trajectory...
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', flex: 1 }}>
                    {diffusionStages.map((stage: any, i: number) => (
                      <div key={i} style={{ 
                        display: 'flex', flexDirection: 'column',
                        background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px',
                        overflow: 'hidden'
                      }}>
                        <div style={{ 
                          padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)',
                          background: 'rgba(0,0,0,0.2)'
                        }}>
                          <div style={{ fontSize: '10px', color: stage.color, fontWeight: '700', letterSpacing: '1px', marginBottom: '4px' }}>
                            STAGE {stage.stage} — {stage.label.toUpperCase()}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b', lineHeight: 1.4 }}>
                            {stage.description}
                          </div>
                        </div>
                        <div style={{ flex: 1, position: 'relative', minHeight: '200px', opacity: stage.opacity }}>
                          {/* Force remount to ensure proper rendering context */}
                          <MoleculeViewer smiles={stage.smiles} height="100%" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            
          </div>

          {/* Properties panel */}
          <div style={{ padding: '20px 24px', overflowY: 'auto' }}>
            <div style={{ fontSize: '10px', color: '#334155', letterSpacing: '2px', marginBottom: '16px' }}>
              MOLECULAR PROFILE
            </div>

            {/* Properties */}
            {[
              { label: 'QED Drug-likeness', value: m.qed, good: m.qed > 0.6, note: '> 0.6 preferred' },
              { label: 'LogP', value: m.logp, good: m.logp >= 0 && m.logp <= 5, note: '0–5 preferred' },
              { label: 'Mol. Weight', value: `${m.molecular_weight} Da`, good: m.molecular_weight <= 500, note: '≤ 500 Da' },
              { label: 'TPSA', value: `${m.tpsa} Å²`, good: m.tpsa <= 140, note: '≤ 140 Å²' },
              { label: 'H-Bond Donors', value: m.hbd, good: m.hbd <= 5, note: '≤ 5' },
              { label: 'H-Bond Acceptors', value: m.hba, good: m.hba <= 10, note: '≤ 10' },
              { label: 'Rotatable Bonds', value: m.rotatable_bonds, good: m.rotatable_bonds <= 10, note: '≤ 10 (Veber)' },
              { label: 'Ring Count', value: m.ring_count, good: true, note: '' },
              { label: 'Aromatic Rings', value: m.aromatic_rings, good: true, note: '' },
              { label: 'Drug Score', value: m.drug_score, good: m.drug_score > 0.6, note: '> 0.6 good' },
              { label: 'SA Score', value: m.sa_score, good: m.sa_score < 4, note: '1=easy, 10=hard synth.' },
            ].map(({ label, value, good, note }) => (
              <div key={label} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,0.04)'
              }}>
                <div>
                  <div style={{ fontSize: '13px', color: '#64748b' }}>{label}</div>
                  {note && <div style={{ fontSize: '10px', color: '#1e293b' }}>{note}</div>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{
                    fontSize: '13px', fontWeight: '700',
                    color: good ? '#00ffaa' : '#fbbf24', fontFamily: 'monospace'
                  }}>{value}</span>
                  <span style={{ fontSize: '12px' }}>{good ? '✓' : '⚠'}</span>
                </div>
              </div>
            ))}

            {/* Lipinski */}
            <div style={{
              marginTop: '14px', padding: '12px',
              background: m.lipinski_pass ? 'rgba(0,255,170,0.06)' : 'rgba(248,113,113,0.06)',
              border: `1px solid ${m.lipinski_pass ? 'rgba(0,255,170,0.2)' : 'rgba(248,113,113,0.2)'}`,
              borderRadius: '10px'
            }}>
              <div style={{ fontSize: '11px', color: '#475569', marginBottom: '4px' }}>LIPINSKI Ro5 STATUS</div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: m.lipinski_pass ? '#00ffaa' : '#f87171' }}>
                {m.lipinski}
              </div>
              {m.lipinski_violations?.length > 0 && (
                <div style={{ marginTop: '4px', fontSize: '11px', color: '#f87171' }}>
                  Violations: {m.lipinski_violations.join(', ')}
                </div>
              )}
            </div>

            {/* SMILES */}
            <div style={{ marginTop: '14px' }}>
              <div style={{ fontSize: '10px', color: '#334155', marginBottom: '4px', letterSpacing: '1px' }}>SMILES</div>
              <div style={{
                fontSize: '11px', color: '#475569', fontFamily: 'monospace',
                wordBreak: 'break-all', lineHeight: 1.5,
                padding: '10px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px'
              }}>{m.smiles}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
