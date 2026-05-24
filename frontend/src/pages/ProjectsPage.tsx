import { useState, useEffect, useRef } from 'react';

const API = 'http://127.0.0.1:8000';

import type { ReactNode } from 'react';

function Badge({ color, children }: { color: string; children: ReactNode }) {
  return (
    <span style={{ fontSize: '8px', color, letterSpacing: '1.5px', padding: '2px 8px', borderRadius: '10px', border: `1px solid ${color}44`, background: `${color}11`, fontWeight: '700' }}>
      {children}
    </span>
  );
}

// ── Reliable 3D Molecule Viewer using 3Dmol built-in SMILES parser ────────
function Mol3DViewer({ smiles, index }: { smiles: string; index: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || !smiles) return;
    const el = ref.current;

    const tryRender = () => {
      if (!(window as any).$3Dmol) return false;

      el.innerHTML = '';
      const viewer = (window as any).$3Dmol.createViewer(el, {
        backgroundColor: '#030712',
        antialias: true,
      });

      try {
        // Use 3Dmol's built-in SMILES model — no external API needed
        viewer.addModel(smiles, 'smi');
        viewer.setStyle({}, {
          stick: { radius: 0.14, colorscheme: 'greenCarbon' },
          sphere: { scale: 0.24 },
        });
        viewer.zoomTo();
        viewer.render();
        return true;
      } catch {
        return false;
      }
    };

    if (!tryRender()) {
      const interval = setInterval(() => {
        if (tryRender()) clearInterval(interval);
      }, 500);
      return () => clearInterval(interval);
    }
  }, [smiles]);

  return (
    <div style={{ height: '150px', background: '#030712', borderRadius: '10px', overflow: 'hidden', position: 'relative', border: '1px solid rgba(0,255,170,0.1)' }}>
      <div style={{ position: 'absolute', top: '5px', left: '7px', fontSize: '8px', color: '#475569', zIndex: 10, fontFamily: 'monospace', userSelect: 'none' }}>
        mol_{index}.sdf
      </div>
      <div ref={ref} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}

export default function ProjectsPage() {
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [mols, setMols] = useState<string[]>([]);
  const [molsLoading, setMolsLoading] = useState(false);

  useEffect(() => {
    if (!selected) { setMols([]); return; }
    setMolsLoading(true);
    fetch(`${API}/project-mols/${selected.id}`)
      .then(r => r.json())
      .then(d => { setMols(d.smiles || []); setMolsLoading(false); })
      .catch(() => setMolsLoading(false));
  }, [selected]);

  useEffect(() => {
    fetch(`${API}/list-runs`)
      .then(r => r.json())
      .then(d => { setRuns(d.runs || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const gradeColor = (g: string) => g === 'A' ? '#00ffaa' : g === 'B' ? '#60a5fa' : g === 'C' ? '#fbbf24' : '#ef4444';

  // Show top 3 as 3D, rest as file tags
  const top3 = mols.slice(0, 3);
  const remaining = mols.slice(3);

  return (
    <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto', overflowX: 'hidden' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ fontSize: '10px', color: '#475569', letterSpacing: '3px', marginBottom: '8px', textTransform: 'uppercase' }}>EXPERIMENT HISTORY</div>
        <h2 style={{ fontSize: '32px', fontWeight: '800', margin: '0 0 6px', background: 'linear-gradient(135deg, #60a5fa, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Projects</h2>
        <p style={{ margin: 0, color: '#475569', fontSize: '13px', maxWidth: '480px', lineHeight: '1.6' }}>Every generation run is saved automatically — complete with high-fidelity 3D structural datasets and ML validation reports.</p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px', color: '#334155', fontSize: '13px' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔄</div>Loading experiment history...
        </div>
      ) : runs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '16px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}>📂</div>
          <div style={{ fontSize: '14px', color: '#334155', fontWeight: '600' }}>No experiments yet</div>
          <div style={{ fontSize: '12px', color: '#1e293b', marginTop: '8px' }}>Run the Generate pipeline to create your first experiment.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 400px' : '1fr', gap: '24px', alignItems: 'start' }}>
          {/* Run cards list */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px' }}>
            {runs.map((run, i) => {
              const gc = gradeColor(run.verdict_score || 'B');
              const isSelected = selected?.id === run.id;
              return (
                <div key={i}
                  onClick={() => setSelected(isSelected ? null : run)}
                  style={{
                    padding: '20px', borderRadius: '14px', cursor: 'pointer',
                    background: isSelected ? `${gc}08` : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${isSelected ? gc + '40' : 'rgba(255,255,255,0.06)'}`,
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: '#e2e8f0', fontFamily: 'monospace' }}>{run.id}</div>
                      <div style={{ fontSize: '10px', color: '#475569', marginTop: '4px' }}>🕒 {run.timestamp}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '28px', fontWeight: '900', color: gc, lineHeight: 1, fontFamily: 'monospace' }}>{run.verdict_score || 'B'}</div>
                      <div style={{ fontSize: '8px', color: '#475569', letterSpacing: '1px' }}>GRADE</div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '14px' }}>
                    {[
                      { l: 'Molecules', v: run.num_molecules || '—' },
                      { l: 'Similarity', v: `${run.overall_similarity || 0}%` },
                      { l: 'Files', v: run.num_files || '—' },
                    ].map(({ l, v }) => (
                      <div key={l} style={{ textAlign: 'center', padding: '8px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                        <div style={{ fontSize: '14px', fontWeight: '800', color: '#e2e8f0' }}>{v}</div>
                        <div style={{ fontSize: '8px', color: '#475569', letterSpacing: '1px' }}>{l.toUpperCase()}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <Badge color={gc}>GRADE {run.verdict_score || 'B'}</Badge>
                    <Badge color="#60a5fa">VAE MODEL</Badge>
                    <Badge color="#a78bfa">RF + GRADIENT BOOST</Badge>
                  </div>

                  <div style={{ marginTop: '12px' }}>
                    <div style={{ height: '3px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${run.overall_similarity || 75}%`, background: `linear-gradient(90deg, ${gc}, ${gc}88)`, borderRadius: '2px', transition: 'width 0.8s' }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Detail Panel ── */}
          {selected && (
            <div style={{ position: 'sticky', top: '20px', padding: '20px', borderRadius: '14px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ fontSize: '11px', color: '#94a3b8', letterSpacing: '2px', fontWeight: '700' }}>RUN DETAILS</div>
                <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: '#475569', fontSize: '18px', cursor: 'pointer' }}>×</button>
              </div>

              <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#60a5fa', marginBottom: '16px', wordBreak: 'break-all' }}>{selected.id}</div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                {[
                  { l: '📊 Similarity Score', v: `${selected.overall_similarity}%`, c: gradeColor(selected.verdict_score) },
                  { l: '🔬 Molecules Generated', v: selected.num_molecules, c: '#e2e8f0' },
                  { l: '📁 Files Saved', v: selected.num_files, c: '#e2e8f0' },
                  { l: '⏱ Timestamp', v: selected.timestamp, c: '#94a3b8' },
                ].map(({ l, v, c }) => (
                  <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                    <span style={{ fontSize: '11px', color: '#475569' }}>{l}</span>
                    <span style={{ fontSize: '11px', fontWeight: '700', color: c }}>{v}</span>
                  </div>
                ))}
              </div>

              {/* 3D Visualizer */}
              <div style={{ padding: '12px', background: 'rgba(0,0,0,0.4)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ fontSize: '9px', color: '#00ffaa', fontWeight: '700', letterSpacing: '1.5px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>⚗️ 3D STRUCTURE PREVIEWS (TOP 3)</span>
                  <span style={{ color: '#64748b' }}>TOTAL: {selected.num_molecules} MOLECULES</span>
                </div>

                {molsLoading ? (
                  <div style={{ textAlign: 'center', padding: '20px', fontSize: '11px', color: '#475569' }}>
                    <div style={{ fontSize: '20px', marginBottom: '6px' }}>🔄</div>
                    Loading 3D structures...
                  </div>
                ) : mols.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px', fontSize: '11px', color: '#475569' }}>No valid molecules found for this project.</div>
                ) : (
                  <>
                    {/* Top 3 — 3D rendered */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                      {top3.map((smiles, i) => (
                        <Mol3DViewer key={i} smiles={smiles} index={i} />
                      ))}
                    </div>

                    {/* Remaining — file tree style */}
                    {remaining.length > 0 && (
                      <div style={{
                        padding: '10px 12px', background: 'rgba(255,255,255,0.02)',
                        borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)',
                      }}>
                        <div style={{ fontSize: '9px', color: '#60a5fa', fontWeight: '700', marginBottom: '8px', fontFamily: 'monospace' }}>
                          📂 {selected.id}/3d_structures/
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {remaining.slice(0, 10).map((_, i) => (
                            <span key={i} style={{
                              background: 'rgba(0,0,0,0.5)', padding: '2px 7px',
                              borderRadius: '4px', fontSize: '9px', color: '#94a3b8', fontFamily: 'monospace',
                              border: '1px solid rgba(255,255,255,0.04)',
                            }}>
                              mol_{i + 3}.sdf
                            </span>
                          ))}
                          {remaining.length > 10 && (
                            <span style={{ fontSize: '9px', color: '#475569', alignSelf: 'center' }}>
                              +{remaining.length - 10} more on disk
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
