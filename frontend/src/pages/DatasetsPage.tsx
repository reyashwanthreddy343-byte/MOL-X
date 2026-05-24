import { useState, useEffect } from 'react';

const API = 'http://127.0.0.1:8000';

interface RunFolder {
  id: string;
  timestamp: string;
  num_molecules: number;
  verdict_score: string;
  overall_similarity: number;
  num_files: number;
}

export default function DatasetsPage() {
  const [runs, setRuns] = useState<RunFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRun, setExpandedRun] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<any>(null);
  const [loadingContent, setLoadingContent] = useState(false);
  const [activeTab, setActiveTab] = useState<'original' | 'generated' | 'performance'>('generated');

  useEffect(() => {
    fetch(`${API}/list-runs`)
      .then(r => r.json())
      .then(d => { setRuns(d.runs || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const gradeColor = (g: string) => g === 'A' ? '#00ffaa' : g === 'B' ? '#60a5fa' : g === 'C' ? '#fbbf24' : '#ef4444';

  const toggleExpand = (id: string) => {
    if (expandedRun === id) {
      setExpandedRun(null);
      setFileContent(null);
    } else {
      setExpandedRun(id);
      setFileContent(null);
    }
  };

  const loadFilePreview = async (runId: string, fileType: string) => {
    setLoadingContent(true);
    try {
      const r = await fetch(`${API}/project-file/${runId}/${fileType}`);
      const data = await r.json();
      setFileContent(data);
    } catch {
      setFileContent({ error: 'Could not load file preview' });
    }
    setLoadingContent(false);
  };

  // Folder tree structure for each project
  const folderTree = [
    {
      name: 'original_dataset/',
      icon: '📦',
      color: '#60a5fa',
      children: [
        { name: 'train.csv', icon: '📄', key: 'original_train', desc: 'Training split of the uploaded molecular data' },
        { name: 'test.csv', icon: '📄', key: 'original_test', desc: 'Test split for validation' },
        { name: 'val.csv', icon: '📄', key: 'original_val', desc: 'Validation split' },
      ],
    },
    {
      name: 'test_results/',
      icon: '⚗️',
      color: '#a78bfa',
      children: [
        { name: 'generated_data.csv', icon: '🧬', key: 'generated', desc: 'AI-generated molecular data from VAE' },
      ],
    },
    {
      name: 'performance/',
      icon: '📊',
      color: '#00ffaa',
      children: [
        { name: 'evaluation_results.json', icon: '📋', key: 'evaluation', desc: '4-Way ML evaluation metrics (Our + Inherited models)' },
      ],
    },
    {
      name: '3d_structures/',
      icon: '🔬',
      color: '#f472b6',
      children: [
        { name: 'mol_0.sdf → mol_N.sdf', icon: '⬡', key: '3d', desc: 'All generated 3D SDF structures — click to preview top 3 + view all files' },
      ],
    },
  ];

  return (
    <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto', overflowX: 'hidden' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ fontSize: '10px', color: '#475569', letterSpacing: '3px', marginBottom: '8px', textTransform: 'uppercase' }}>Data Storage</div>
        <h2 style={{ fontSize: '32px', fontWeight: '800', margin: '0 0 6px', background: 'linear-gradient(135deg, #f472b6, #60a5fa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Datasets</h2>
        <p style={{ margin: 0, color: '#475569', fontSize: '13px', maxWidth: '480px', lineHeight: '1.6' }}>
          Explore the localized folder structure of your AI experiments — track every SMILES generation, validation report, and raw molecular dataset.
        </p>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {folderTree.map(f => (
          <div key={f.name} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', color: f.color }}>
            <span>{f.icon}</span>
            <span style={{ letterSpacing: '0.5px' }}>{f.name}</span>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px', color: '#334155', fontSize: '13px' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔄</div>Scanning experiment database...
        </div>
      ) : runs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '16px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}>📂</div>
          <div style={{ fontSize: '14px', color: '#334155', fontWeight: '600' }}>No saved datasets yet</div>
          <div style={{ fontSize: '12px', color: '#1e293b', marginTop: '8px' }}>Complete the full Generate → Evaluate pipeline to save your first experiment.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {runs.map(run => {
            const isExpanded = expandedRun === run.id;
            const gc = gradeColor(run.verdict_score);
            return (
              <div key={run.id} style={{
                borderRadius: '16px', overflow: 'hidden',
                border: `1px solid ${isExpanded ? gc + '40' : 'rgba(255,255,255,0.06)'}`,
                background: isExpanded ? 'rgba(10,15,20,0.5)' : 'rgba(255,255,255,0.01)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                backdropFilter: isExpanded ? 'blur(20px)' : 'none',
              }}>
                {/* Folder Header */}
                <button
                  onClick={() => toggleExpand(run.id)}
                  className="btn-shimmer"
                  style={{
                    width: '100%', padding: '18px 24px', border: 'none', cursor: 'pointer',
                    background: 'none', display: 'flex', alignItems: 'center', gap: '14px', textAlign: 'left',
                    '--btn-glow': isExpanded ? `${gc}22` : 'rgba(255,255,255,0.05)',
                  } as any}
                >
                  <span style={{ fontSize: '20px', transition: 'transform 0.3s ease', transform: isExpanded ? 'rotate(90deg)' : 'none' }}>📁</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: '800', color: isExpanded ? gc : '#e2e8f0', fontFamily: 'monospace' }}>{run.id}/</div>
                    <div style={{ fontSize: '10px', color: '#475569', marginTop: '3px' }}>🕒 {run.timestamp} · {run.num_molecules} molecules · {run.num_files} files</div>
                  </div>
                  <div style={{ textAlign: 'center', marginRight: '8px' }}>
                    <div style={{ fontSize: '24px', fontWeight: '900', color: gc, fontFamily: "'IBM Plex Mono', monospace" }}>{run.verdict_score}</div>
                    <div style={{ fontSize: '8px', color: '#475569', fontWeight: '700' }}>{run.overall_similarity}% SIM</div>
                  </div>
                </button>

                {/* Expanded Tree */}
                {isExpanded && (
                  <div style={{ padding: '0 20px 20px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '16px', marginTop: '16px' }}>
                      {/* Left: Tree */}
                      <div>
                        {folderTree.map(folder => (
                          <div key={folder.name} style={{ marginBottom: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                              <span style={{ fontSize: '14px' }}>{folder.icon}</span>
                              <span style={{ fontSize: '12px', color: folder.color, fontWeight: '700', fontFamily: 'monospace' }}>{folder.name}</span>
                            </div>
                            {folder.children.map(child => (
                              <button
                                key={child.key}
                                onClick={() => { setActiveTab(child.key as any); loadFilePreview(run.id, child.key); }}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: '8px', width: '100%',
                                  padding: '6px 12px 6px 32px', border: 'none', borderRadius: '6px', cursor: 'pointer',
                                  background: activeTab === child.key ? `${folder.color}15` : 'transparent',
                                  transition: 'all 0.15s', textAlign: 'left',
                                }}
                                onMouseEnter={e => { if (activeTab !== child.key) (e.currentTarget.style.background = 'rgba(255,255,255,0.03)'); }}
                                onMouseLeave={e => { if (activeTab !== child.key) (e.currentTarget.style.background = 'transparent'); }}
                              >
                                <span style={{ fontSize: '10px', color: '#334155' }}>└─</span>
                                <span style={{ fontSize: '10px' }}>{child.icon}</span>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: '11px', color: activeTab === child.key ? folder.color : '#94a3b8', fontFamily: 'monospace', fontWeight: '600' }}>{child.name}</div>
                                  <div style={{ fontSize: '9px', color: '#334155' }}>{child.desc}</div>
                                </div>
                              </button>
                            ))}
                          </div>
                        ))}
                      </div>

                      {/* Right: Preview Panel */}
                      <div style={{ 
                        padding: '20px', background: 'rgba(5,10,15,0.6)', borderRadius: '14px', 
                        border: '1px solid rgba(255,255,255,0.06)', minHeight: '340px', maxHeight: '540px', 
                        overflowY: 'auto', backdropFilter: 'blur(10px)',
                        boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)',
                      }}>
                        {loadingContent ? (
                          <div style={{ textAlign: 'center', padding: '40px', color: '#334155', fontSize: '12px' }}>Loading preview...</div>
                        ) : !fileContent ? (
                          <div style={{ textAlign: 'center', padding: '40px' }}>
                            <div style={{ fontSize: '28px', opacity: 0.15, marginBottom: '8px' }}>👈</div>
                            <div style={{ fontSize: '12px', color: '#1e293b' }}>Click a file on the left to preview its contents</div>
                          </div>
                        ) : fileContent.error ? (
                          <div style={{ textAlign: 'center', padding: '40px', color: '#ef4444', fontSize: '12px' }}>{fileContent.error}</div>
                        ) : fileContent.type === 'csv' ? (
                          <>
                            <div style={{ fontSize: '9px', color: '#475569', letterSpacing: '2px', fontWeight: '700', marginBottom: '10px' }}>
                              {fileContent.filename} — {fileContent.total_rows} rows
                            </div>
                            <div style={{ overflowX: 'auto' }}>
                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
                                <thead>
                                  <tr>
                                    {fileContent.columns?.map((col: string) => (
                                      <th key={col} style={{ padding: '6px 8px', textAlign: 'left', color: '#60a5fa', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: '9px', letterSpacing: '0.5px', fontWeight: '700', whiteSpace: 'nowrap' }}>
                                        {col.toUpperCase().replace(/_/g, ' ')}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {fileContent.rows?.map((row: any, i: number) => (
                                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                                      {fileContent.columns?.map((col: string) => (
                                        <td key={col} style={{
                                          padding: '5px 8px', color: '#94a3b8', fontFamily: 'monospace',
                                          whiteSpace: col === 'smiles' ? 'nowrap' : 'normal',
                                          maxWidth: col === 'smiles' ? '180px' : 'auto',
                                          overflow: 'hidden', textOverflow: 'ellipsis',
                                        }}>
                                          {typeof row[col] === 'number' ? Number(row[col]).toFixed(col === 'lipinski_pass' ? 0 : 3) : row[col] || '—'}
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </>
                        ) : fileContent.type === 'json' ? (
                          <>
                            <div style={{ fontSize: '9px', color: '#475569', letterSpacing: '2px', fontWeight: '700', marginBottom: '10px' }}>
                              {fileContent.filename}
                            </div>
                            {/* Render evaluation metrics nicely */}
                            {fileContent.data?.experiments && (
                              <div>
                                <div style={{ fontSize: '10px', color: '#00ffaa', fontWeight: '700', marginBottom: '8px', letterSpacing: '1px' }}>
                                  📊 VERDICT: Grade {fileContent.data.verdict_score} · {fileContent.data.overall_similarity}% Similarity · {fileContent.data.performance_ratio}x
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                                  {Object.entries(fileContent.data.experiments).map(([k, exp]: [string, any]) => (
                                    <div key={k} style={{ padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                                      <div style={{ fontSize: '9px', color: '#60a5fa', fontWeight: '700', marginBottom: '6px' }}>🔬 {exp.name}</div>
                                      <div style={{ fontSize: '10px', color: '#94a3b8', fontFamily: 'monospace' }}>
                                        RMSE: <b style={{ color: '#f59e0b' }}>{exp.rmse?.toFixed(4)}</b> · 
                                        R²: <b style={{ color: '#60a5fa' }}>{exp.r2?.toFixed(4)}</b> · 
                                        Acc: <b style={{ color: '#00ffaa' }}>{((exp.accuracy || 0) * 100).toFixed(1)}%</b>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                {fileContent.data.inherited_experiments && (
                                  <>
                                    <div style={{ fontSize: '10px', color: '#a78bfa', fontWeight: '700', marginBottom: '8px', letterSpacing: '1px' }}>
                                      🌐 INHERITED MODEL RESULTS (GradientBoosting)
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                      {Object.entries(fileContent.data.inherited_experiments).map(([k, exp]: [string, any]) => (
                                        <div key={k} style={{ padding: '10px', background: 'rgba(167,139,250,0.04)', borderRadius: '8px', border: '1px solid rgba(167,139,250,0.12)' }}>
                                          <div style={{ fontSize: '9px', color: '#a78bfa', fontWeight: '700', marginBottom: '6px' }}>🌐 {exp.name}</div>
                                          <div style={{ fontSize: '10px', color: '#94a3b8', fontFamily: 'monospace' }}>
                                            RMSE: <b style={{ color: '#f59e0b' }}>{exp.rmse?.toFixed(4)}</b> · 
                                            R²: <b style={{ color: '#60a5fa' }}>{exp.r2?.toFixed(4)}</b> · 
                                            Acc: <b style={{ color: '#00ffaa' }}>{((exp.accuracy || 0) * 100).toFixed(1)}%</b>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </>
                                )}
                              </div>
                            )}
                          </>
                        ) : fileContent.type === '3d' ? (
                          <>
                            <div style={{ fontSize: '9px', color: '#00ffaa', letterSpacing: '2px', fontWeight: '700', marginBottom: '10px', display: 'flex', justifyContent: 'space-between' }}>
                              <span>⚗️ 3D STRUCTURE PREVIEWS (TOP 3)</span>
                              <span style={{ color: '#64748b' }}>TOTAL: {fileContent.count} MOLECULES</span>
                            </div>

                            {/* Top 3 using 3Dmol built-in SMILES — no external API needed */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                              {fileContent.smiles?.slice(0, 3).map((smi: string, i: number) => (
                                <div key={i} style={{ height: '140px', background: '#030712', borderRadius: '8px', overflow: 'hidden', position: 'relative', border: '1px solid rgba(0,255,170,0.1)' }}>
                                  <div style={{ position: 'absolute', top: '4px', left: '6px', fontSize: '8px', color: '#475569', zIndex: 10, fontFamily: 'monospace' }}>mol_{i}.sdf</div>
                                  <div
                                    ref={el => {
                                      if (el && !el.dataset.rendered && (window as any).$3Dmol) {
                                        el.dataset.rendered = '1';
                                        const viewer = (window as any).$3Dmol.createViewer(el, { backgroundColor: '#030712', antialias: true });
                                        try {
                                          viewer.addModel(smi, 'smi');
                                          viewer.setStyle({}, { stick: { radius: 0.14, colorscheme: 'greenCarbon' }, sphere: { scale: 0.24 } });
                                          viewer.zoomTo();
                                          viewer.render();
                                        } catch {}
                                      }
                                    }}
                                    style={{ width: '100%', height: '100%' }}
                                  />
                                </div>
                              ))}
                            </div>

                            {/* 🔬 3d_structures/ folder — full numbered file listing */}
                            <div style={{ padding: '12px', background: 'rgba(0,0,0,0.3)', borderRadius: '10px', border: '1px solid rgba(244,114,182,0.15)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                                <span style={{ fontSize: '13px' }}>🔬</span>
                                <span style={{ fontSize: '10px', color: '#f472b6', fontWeight: '700', fontFamily: 'monospace', letterSpacing: '1px' }}>3d_structures/</span>
                                <span style={{ fontSize: '9px', color: '#334155', marginLeft: 'auto' }}>{fileContent.count} files total</span>
                              </div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', maxHeight: '150px', overflowY: 'auto' }}>
                                {Array.from({ length: fileContent.count }).map((_: any, i: number) => (
                                  <span
                                    key={i}
                                    style={{
                                      background: i < 3 ? 'rgba(0,255,170,0.08)' : 'rgba(0,0,0,0.4)',
                                      border: `1px solid ${i < 3 ? 'rgba(0,255,170,0.25)' : 'rgba(255,255,255,0.05)'}`,
                                      padding: '2px 7px', borderRadius: '4px',
                                      fontSize: '9px', fontFamily: 'monospace',
                                      color: i < 3 ? '#00ffaa' : '#64748b',
                                    }}
                                  >
                                    mol_{i}.sdf
                                  </span>
                                ))}
                              </div>
                              <div style={{ fontSize: '9px', color: '#334155', marginTop: '8px' }}>
                                <span style={{ color: '#00ffaa' }}>●</span> Green = 3D preview above &nbsp;|&nbsp; Grey = saved to disk
                              </div>
                            </div>

                          </>
                        ) : (
                          <pre style={{ fontSize: '10px', color: '#94a3b8', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                            {JSON.stringify(fileContent, null, 2)}
                          </pre>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
