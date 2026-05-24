import { useState, useEffect } from 'react';

const API = 'http://127.0.0.1:8000';

interface Drug { name: string; smiles: string; use: string; }
interface HybridStep {
  step: number; alpha: number; smiles: string;
  molecular_weight: number; logp: number; qed: number;
  binding_score: number; lipinski_pass: number;
}
interface EvoStep {
  iteration: number; smiles: string; molecular_weight: number;
  logp: number; qed: number; binding_score: number;
  lipinski_pass: number; fitness: number;
}

function StatBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div style={{ marginBottom: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
        <span style={{ fontSize: '9px', color: '#64748b', letterSpacing: '0.8px', textTransform: 'uppercase' }}>{label}</span>
        <span style={{ fontSize: '10px', fontFamily: 'monospace', color: '#94a3b8', fontWeight: '700' }}>{value}</span>
      </div>
      <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)', borderRadius: '2px', boxShadow: `0 0 8px ${color}80` }} />
      </div>
    </div>
  );
}

function DrugCard({ drug, selected, accentColor, onSelect }: {
  drug: Drug; selected: boolean; accentColor: string; onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      style={{
        padding: '10px 12px', width: '100%', textAlign: 'left', cursor: 'pointer',
        border: `1px solid ${selected ? accentColor + '70' : 'rgba(255,255,255,0.05)'}`,
        borderRadius: '10px',
        background: selected ? `${accentColor}15` : 'rgba(255,255,255,0.02)',
        transition: 'all 0.18s ease',
        outline: 'none',
      }}
    >
      <div style={{ fontSize: '12px', fontWeight: '700', color: selected ? accentColor : '#94a3b8', marginBottom: '2px' }}>{drug.name}</div>
      <div style={{ fontSize: '9px', color: '#475569', lineHeight: '1.4' }}>{drug.use}</div>
    </button>
  );
}

function DrugGrid({ label, drugs, selected, onSelect, accentColor }: {
  label: string; drugs: Drug[]; selected: Drug | null; onSelect: (d: Drug) => void; accentColor: string;
}) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)', border: `1px solid ${selected ? accentColor + '40' : 'rgba(255,255,255,0.06)'}`,
      borderRadius: '16px', padding: '20px', transition: 'border-color 0.3s', display: 'flex', flexDirection: 'column', gap: '12px',
    }}>
      <div style={{ fontSize: '10px', color: accentColor, letterSpacing: '2px', fontWeight: '800' }}>{label}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', maxHeight: '260px', overflowY: 'auto' }}>
        {drugs.map(drug => (
          <DrugCard key={drug.name} drug={drug} selected={selected?.name === drug.name} accentColor={accentColor} onSelect={() => onSelect(drug)} />
        ))}
      </div>
      {/* Selected drug SMILES — contained */}
      <div style={{
        padding: '10px 12px', background: 'rgba(0,0,0,0.4)', borderRadius: '8px',
        border: `1px solid ${selected ? accentColor + '25' : 'rgba(255,255,255,0.04)'}`,
        minHeight: '38px',
      }}>
        {selected ? (
          <>
            <div style={{ fontSize: '9px', color: accentColor, fontWeight: '700', marginBottom: '3px' }}>{selected.name}</div>
            <div style={{
              fontSize: '8px', fontFamily: 'monospace', color: '#475569', lineHeight: '1.5',
              overflowWrap: 'break-word', wordBreak: 'break-all', whiteSpace: 'pre-wrap',
            }}>
              {selected.smiles}
            </div>
          </>
        ) : (
          <div style={{ fontSize: '9px', color: '#334155', fontStyle: 'italic' }}>Select a drug above…</div>
        )}
      </div>
    </div>
  );
}

export default function HybridLabPage() {
  const [tab, setTab] = useState<'hybrid' | 'evolve'>('hybrid');
  const [drugs, setDrugs] = useState<Drug[]>([]);

  // Hybridizer
  const [drugA, setDrugA] = useState<Drug | null>(null);
  const [drugB, setDrugB] = useState<Drug | null>(null);
  const [sliderStep, setSliderStep] = useState(5);
  const [pathway, setPathway] = useState<HybridStep[]>([]);
  const [hybridizing, setHybridizing] = useState(false);
  const [hybridError, setHybridError] = useState('');

  // Evolution
  const [evoStartDrug, setEvoStartDrug] = useState<Drug | null>(null);
  const [evoTarget, setEvoTarget] = useState<'lipinski' | 'high_qed' | 'low_mw'>('lipinski');
  const [trajectory, setTrajectory] = useState<EvoStep[]>([]);
  const [evolving, setEvolving] = useState(false);
  const [evoError, setEvoError] = useState('');
  const [evoStep, setEvoStep] = useState(0);

  useEffect(() => {
    fetch(`${API}/known-drugs`).then(r => r.json()).then(d => setDrugs(d.drugs || [])).catch(() => {});
  }, []);

  const runHybridize = async () => {
    if (!drugA || !drugB) return;
    setHybridizing(true); setHybridError(''); setPathway([]);
    try {
      const res = await fetch(`${API}/hybridize`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ smiles_a: drugA.smiles, smiles_b: drugB.smiles, steps: 11 }),
      });
      const data = await res.json();
      if (data.error) setHybridError(data.error);
      else { setPathway(data.pathway || []); setSliderStep(5); }
    } catch { setHybridError('Could not connect to backend. Is the server running?'); }
    setHybridizing(false);
  };

  const runEvolve = async () => {
    if (!evoStartDrug) return;
    setEvolving(true); setEvoError(''); setTrajectory([]); setEvoStep(0);
    try {
      const res = await fetch(`${API}/evolve`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ smiles: evoStartDrug.smiles, target: evoTarget, max_iterations: 20 }),
      });
      const data = await res.json();
      if (data.error) setEvoError(data.error);
      else { setTrajectory(data.trajectory || []); setEvoStep(0); }
    } catch { setEvoError('Could not connect to backend. Is the server running?'); }
    setEvolving(false);
  };

  const currentHybrid = pathway[sliderStep] || null;
  const currentEvo = trajectory[evoStep] || null;
  const maxFitness = trajectory.length > 0 ? Math.max(...trajectory.map(t => t.fitness)) : 1;

  return (
    <div style={{ padding: '32px', maxWidth: '1300px', margin: '0 auto', overflowX: 'hidden' }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ fontSize: '10px', color: '#475569', letterSpacing: '3px', marginBottom: '6px', textTransform: 'uppercase' }}>Level 5 · Generative AI</div>
        <h2 style={{ fontSize: '30px', fontWeight: '800', margin: '0 0 8px', background: 'linear-gradient(135deg, #00ffaa, #60a5fa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', display:'flex', alignItems:'center', gap:'16px' }}>
          Hybrid Lab
          <span style={{ fontSize:'9px', color: '#00ffaa', background: 'rgba(0,255,170,0.06)', padding:'3px 12px', borderRadius:'6px', border:'1px solid rgba(0,255,170,0.2)', letterSpacing:'1px', fontWeight:'800' }}>⚡ GPU ENGINE ACTIVE</span>
        </h2>
        <p style={{ margin: 0, color: '#475569', fontSize: '13px', maxWidth: '640px', lineHeight: '1.6' }}>
          Accelerated by <strong style={{ color: '#00ffaa' }}>NVIDIA CUDA</strong>. Bridge two drugs in latent space or evolve a molecule toward perfection — in milliseconds.
        </p>
      </div>

      {/* ── Tab Switcher ── */}
      <div style={{
        display: 'flex', gap: '4px', marginBottom: '28px', padding: '4px',
        background: 'rgba(255,255,255,0.02)', borderRadius: '12px',
        border: '1px solid rgba(255,255,255,0.06)', width: 'fit-content',
      }}>
        {([
          { id: 'hybrid', icon: '⚗️', label: 'Latent Hybridizer', desc: 'Blend two known drugs into a novel hybrid' },
          { id: 'evolve', icon: '🧬', label: 'Evolution Engine', desc: 'Mutate a molecule toward a pharmacological target' },
        ] as const).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '10px 22px', border: 'none', borderRadius: '8px', cursor: 'pointer', textAlign: 'left',
            background: tab === t.id ? 'linear-gradient(135deg, rgba(0,255,170,0.15), rgba(96,165,250,0.15))' : 'transparent',
            borderBottom: tab === t.id ? '2px solid rgba(0,255,170,0.5)' : '2px solid transparent',
            transition: 'all 0.2s',
          }}>
            <div style={{ fontSize: '12px', fontWeight: '700', color: tab === t.id ? '#00ffaa' : '#475569' }}>{t.icon} {t.label}</div>
            <div style={{ fontSize: '9px', color: '#334155', marginTop: '2px' }}>{t.desc}</div>
          </button>
        ))}
      </div>

      {/* ════ HYBRIDIZER TAB ════ */}
      {tab === 'hybrid' && (
        <div>
          {/* Drug Selectors */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '16px', marginBottom: '20px', alignItems: 'center' }}>
            <DrugGrid label="💊 DRUG A — SOURCE" drugs={drugs} selected={drugA} onSelect={setDrugA} accentColor="#60a5fa" />

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '0 8px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', color: '#475569' }}>⇌</div>
              {drugA && drugB && (
                <div style={{ fontSize: '8px', color: '#00ffaa', letterSpacing: '1px', textAlign: 'center', fontWeight: '700' }}>READY</div>
              )}
            </div>

            <DrugGrid label="💉 DRUG B — TARGET" drugs={drugs} selected={drugB} onSelect={setDrugB} accentColor="#f472b6" />
          </div>

          {/* Hybridize Button */}
          <button
            onClick={runHybridize} disabled={!drugA || !drugB || hybridizing}
            style={{
              width: '100%', padding: '16px', borderRadius: '12px',
              cursor: (!drugA || !drugB || hybridizing) ? 'not-allowed' : 'pointer',
              background: (!drugA || !drugB) ? 'rgba(255,255,255,0.03)' : hybridizing ? 'rgba(0,255,170,0.1)' : 'linear-gradient(135deg, #00ffaa, #60a5fa)',
              color: (!drugA || !drugB) ? '#334155' : hybridizing ? '#00ffaa' : '#050a0e',
              fontSize: '13px', fontWeight: '800', letterSpacing: '2px',
              marginBottom: '20px',
              boxShadow: (!drugA || !drugB) ? 'none' : '0 0 40px rgba(0,255,170,0.25)',
              transition: 'all 0.3s',
              border: hybridizing ? '1px solid rgba(0,255,170,0.4)' : '1px solid transparent',
            } as any}
          >
            {hybridizing ? '⚗️ Computing Latent Interpolation…' : '⚗️ HYBRIDIZE IN LATENT SPACE'}
          </button>

          {hybridError && (
            <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '10px', color: '#ef4444', fontSize: '12px', marginBottom: '16px', lineHeight: '1.5' }}>
              ⚠️ {hybridError}
            </div>
          )}

          {/* Results */}
          {pathway.length > 0 && (
            <div>
              {/* Slider Section */}
              <div style={{ padding: '24px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                  <div style={{ fontSize: '10px', color: '#475569', letterSpacing: '2px', fontWeight: '700' }}>LATENT SPACE INTERPOLATION</div>
                  <div style={{ fontSize: '11px', color: '#00ffaa', fontFamily: 'monospace', background: 'rgba(0,255,170,0.08)', padding: '3px 10px', borderRadius: '6px', border: '1px solid rgba(0,255,170,0.2)' }}>α = {currentHybrid?.alpha?.toFixed(2)}</div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '18px' }}>
                  <span style={{ fontSize: '11px', color: '#60a5fa', fontWeight: '700', minWidth: '70px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{drugA?.name}</span>
                  <input
                    type="range" min={0} max={pathway.length - 1} value={sliderStep}
                    onChange={e => setSliderStep(Number(e.target.value))}
                    style={{ flex: 1, accentColor: '#00ffaa', cursor: 'pointer', height: '6px' }}
                  />
                  <span style={{ fontSize: '11px', color: '#f472b6', fontWeight: '700', minWidth: '70px', textAlign: 'right', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{drugB?.name}</span>
                </div>

                {/* Dot timeline */}
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '4px', marginBottom: '20px' }}>
                  {pathway.map((_, i) => (
                    <div
                      key={i}
                      onClick={() => setSliderStep(i)}
                      title={`Step ${i + 1}`}
                      style={{
                        flex: 1, height: '6px', borderRadius: '3px', cursor: 'pointer',
                        background: i === sliderStep ? '#00ffaa' : i < sliderStep ? 'rgba(0,255,170,0.3)' : 'rgba(255,255,255,0.06)',
                        transition: 'background 0.2s',
                      }}
                    />
                  ))}
                </div>

                {/* Hybrid properties */}
                {currentHybrid && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    {/* SMILES box */}
                    <div style={{ background: 'rgba(0,0,0,0.4)', borderRadius: '10px', padding: '16px', border: '1px solid rgba(0,255,170,0.1)' }}>
                      <div style={{ fontSize: '9px', color: '#475569', letterSpacing: '2px', marginBottom: '8px', fontWeight: '700' }}>HYBRID SMILES</div>
                      <div style={{ fontSize: '9px', fontFamily: 'monospace', color: '#64748b', lineHeight: '1.6', wordBreak: 'break-all', overflowWrap: 'break-word' }}>
                        {currentHybrid.smiles}
                      </div>
                      <div style={{ marginTop: '10px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '8px', padding: '2px 8px', borderRadius: '4px', background: currentHybrid.lipinski_pass ? 'rgba(0,255,170,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${currentHybrid.lipinski_pass ? 'rgba(0,255,170,0.3)' : 'rgba(239,68,68,0.3)'}`, color: currentHybrid.lipinski_pass ? '#00ffaa' : '#ef4444', fontWeight: '700' }}>
                          {currentHybrid.lipinski_pass ? '✓ LIPINSKI PASS' : '✗ LIPINSKI FAIL'}
                        </span>
                        <span style={{ fontSize: '8px', padding: '2px 8px', borderRadius: '4px', background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.3)', color: '#60a5fa', fontWeight: '700' }}>
                          STEP {currentHybrid.step + 1}/{pathway.length}
                        </span>
                      </div>
                    </div>

                    {/* Stats */}
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <div style={{ fontSize: '10px', color: '#00ffaa', fontWeight: '700', letterSpacing: '1px', marginBottom: '12px' }}>MOLECULAR PROPERTIES</div>
                      <StatBar label="Molecular Weight (Da)" value={currentHybrid.molecular_weight} max={600} color="#60a5fa" />
                      <StatBar label="LogP (Solubility)" value={currentHybrid.logp} max={8} color="#a78bfa" />
                      <StatBar label="QED Drug-Likeness" value={currentHybrid.qed} max={1} color="#00ffaa" />
                      <StatBar label="Binding Score (kcal/mol)" value={currentHybrid.binding_score} max={15} color="#f59e0b" />
                    </div>
                  </div>
                )}
              </div>

              {/* Mini molecule grid */}
              <div style={{ fontSize: '9px', color: '#334155', letterSpacing: '2px', marginBottom: '10px', fontWeight: '700' }}>FULL HYBRID PATHWAY — {pathway.length} INTERMEDIATE MOLECULES</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: '8px' }}>
                {pathway.map((step, i) => (
                  <div
                    key={i} onClick={() => setSliderStep(i)}
                    style={{
                      padding: '10px 8px', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'center',
                      border: `1px solid ${i === sliderStep ? 'rgba(0,255,170,0.5)' : 'rgba(255,255,255,0.05)'}`,
                      background: i === sliderStep ? 'rgba(0,255,170,0.06)' : 'rgba(255,255,255,0.01)',
                      transform: i === sliderStep ? 'translateY(-2px)' : 'none',
                    }}
                  >
                    <div style={{ width: '100%', height: '4px', background: `hsl(${(1 - step.alpha) * 210 + step.alpha * 330}, 80%, 60%)`, borderRadius: '2px', marginBottom: '6px' }} />
                    <div style={{ fontSize: '8px', color: '#60a5fa', fontWeight: '700' }}>α={step.alpha.toFixed(2)}</div>
                    <div style={{ fontSize: '8px', color: '#64748b', marginTop: '2px' }}>MW {step.molecular_weight}</div>
                    <div style={{ fontSize: '8px', color: '#64748b' }}>QED {step.qed}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════ EVOLUTION TAB ════ */}
      {tab === 'evolve' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <DrugGrid label="🧬 STARTING MOLECULE" drugs={drugs} selected={evoStartDrug} onSelect={setEvoStartDrug} accentColor="#a78bfa" />

            {/* Target selector */}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '20px' }}>
              <div style={{ fontSize: '10px', color: '#f472b6', letterSpacing: '2px', fontWeight: '800', marginBottom: '14px' }}>🎯 OPTIMIZATION TARGET</div>
              {([
                { id: 'lipinski', label: "Pass Lipinski's Rule of 5", desc: 'Optimize MW<500, LogP<5 — ensures oral bioavailability', color: '#00ffaa' },
                { id: 'high_qed', label: 'Maximize Drug-Likeness (QED)', desc: 'Push QED score above 0.85 — improves commercial viability', color: '#60a5fa' },
                { id: 'low_mw', label: 'Minimize Molecular Weight', desc: 'Drive MW below 250 Da — improves CNS penetration', color: '#f472b6' },
              ] as const).map(t => (
                <button
                  key={t.id} onClick={() => setEvoTarget(t.id)}
                  style={{
                    width: '100%', marginBottom: '8px', padding: '12px 14px',
                    border: `1px solid ${evoTarget === t.id ? t.color + '60' : 'rgba(255,255,255,0.05)'}`,
                    borderRadius: '10px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.18s',
                    background: evoTarget === t.id ? `${t.color}12` : 'transparent',
                    outline: 'none',
                  }}
                >
                  <div style={{ fontSize: '11px', fontWeight: '700', color: evoTarget === t.id ? t.color : '#64748b', marginBottom: '3px' }}>{t.label}</div>
                  <div style={{ fontSize: '9px', color: '#334155', lineHeight: '1.4' }}>{t.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Launch button */}
          <button
            onClick={runEvolve} disabled={!evoStartDrug || evolving}
            style={{
              width: '100%', padding: '16px', borderRadius: '12px',
              cursor: (!evoStartDrug || evolving) ? 'not-allowed' : 'pointer',
              background: !evoStartDrug ? 'rgba(255,255,255,0.03)' : evolving ? 'rgba(167,139,250,0.1)' : 'linear-gradient(135deg, #a78bfa, #60a5fa)',
              color: !evoStartDrug ? '#334155' : evolving ? '#a78bfa' : '#050a0e',
              fontSize: '13px', fontWeight: '800', letterSpacing: '2px',
              marginBottom: '20px',
              boxShadow: evoStartDrug ? '0 0 40px rgba(167,139,250,0.25)' : 'none',
              transition: 'all 0.3s',
              border: evolving ? '1px solid rgba(167,139,250,0.4)' : '1px solid transparent',
            } as any}
          >
            {evolving ? '🧬 Evolving molecule in latent space…' : '🧬 LAUNCH PHARMACOLOGICAL EVOLUTION'}
          </button>

          {evoError && (
            <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '10px', color: '#ef4444', fontSize: '12px', marginBottom: '16px', lineHeight: '1.5' }}>
              ⚠️ {evoError}
            </div>
          )}

          {trajectory.length > 0 && (
            <div>
              {/* Fitness chart */}
              <div style={{ padding: '24px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', marginBottom: '16px' }}>
                <div style={{ fontSize: '10px', color: '#475569', letterSpacing: '2px', fontWeight: '700', marginBottom: '16px' }}>📈 FITNESS EVOLUTION TRAJECTORY</div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '80px', marginBottom: '6px' }}>
                  {trajectory.map((step, i) => {
                    const barH = Math.max(4, (step.fitness / maxFitness) * 76);
                    const isSelected = i === evoStep;
                    return (
                      <div
                        key={i} onClick={() => setEvoStep(i)} title={`Iter ${i}: fitness=${step.fitness.toFixed(3)}`}
                        style={{
                          flex: 1, height: `${barH}px`, cursor: 'pointer', borderRadius: '3px 3px 0 0',
                          background: isSelected ? 'linear-gradient(180deg, #00ffaa, #60a5fa)' : `rgba(167,139,250,${0.25 + (step.fitness / maxFitness) * 0.5})`,
                          transition: 'all 0.2s', transform: isSelected ? 'scaleY(1.05)' : 'none', transformOrigin: 'bottom',
                          boxShadow: isSelected ? '0 0 10px rgba(0,255,170,0.3)' : 'none',
                        }}
                      />
                    );
                  })}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#334155' }}>
                  <span>Iteration 0</span>
                  <span style={{ color: '#a78bfa' }}>← Click bar to inspect →</span>
                  <span>Iteration {trajectory.length - 1}</span>
                </div>
              </div>

              {/* Evo step detail */}
              {currentEvo && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', padding: '24px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(167,139,250,0.2)', borderRadius: '16px' }}>
                  {/* SMILES box */}
                  <div style={{ background: 'rgba(0,0,0,0.4)', borderRadius: '10px', padding: '16px', border: '1px solid rgba(167,139,250,0.15)' }}>
                    <div style={{ fontSize: '9px', color: '#475569', letterSpacing: '2px', marginBottom: '8px', fontWeight: '700' }}>EVOLVED SMILES</div>
                    <div style={{ fontSize: '9px', fontFamily: 'monospace', color: '#64748b', lineHeight: '1.6', wordBreak: 'break-all', overflowWrap: 'break-word' }}>
                      {currentEvo.smiles}
                    </div>
                    <div style={{ marginTop: '10px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '8px', padding: '2px 8px', borderRadius: '4px', background: currentEvo.lipinski_pass ? 'rgba(0,255,170,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${currentEvo.lipinski_pass ? 'rgba(0,255,170,0.3)' : 'rgba(239,68,68,0.3)'}`, color: currentEvo.lipinski_pass ? '#00ffaa' : '#ef4444', fontWeight: '700' }}>
                        {currentEvo.lipinski_pass ? '✓ LIPINSKI PASS' : '✗ LIPINSKI FAIL'}
                      </span>
                      <span style={{ fontSize: '8px', padding: '2px 8px', borderRadius: '4px', background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.3)', color: '#a78bfa', fontWeight: '700' }}>
                        FITNESS {currentEvo.fitness.toFixed(4)}
                      </span>
                    </div>
                    {evoStep === trajectory.length - 1 && (
                      <div style={{ marginTop: '12px', padding: '10px', background: 'rgba(0,255,170,0.06)', border: '1px solid rgba(0,255,170,0.2)', borderRadius: '8px' }}>
                        <div style={{ fontSize: '10px', color: '#00ffaa', fontWeight: '700', marginBottom: '3px' }}>🏆 EVOLUTION COMPLETE</div>
                        <div style={{ fontSize: '10px', color: '#64748b', lineHeight: '1.5' }}>
                          {trajectory.length} mutations toward <strong style={{ color: '#a78bfa' }}>{evoTarget}</strong> compliance.
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Stats */}
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ fontSize: '10px', color: '#a78bfa', fontWeight: '700', letterSpacing: '1px', marginBottom: '12px' }}>
                      ITERATION {currentEvo.iteration + 1}/{trajectory.length}
                    </div>
                    <StatBar label="Molecular Weight (Da)" value={currentEvo.molecular_weight} max={600} color="#60a5fa" />
                    <StatBar label="LogP (Solubility)" value={currentEvo.logp} max={8} color="#a78bfa" />
                    <StatBar label="QED Drug-Likeness" value={currentEvo.qed} max={1} color="#00ffaa" />
                    <StatBar label="Binding Score (kcal/mol)" value={currentEvo.binding_score} max={15} color="#f59e0b" />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
