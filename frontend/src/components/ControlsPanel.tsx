interface ControlsPanelProps {
  onGenerate: () => void; loading: boolean;
  diffusionSteps: number; setDiffusionSteps: (v: number) => void;
  temperature: number; setTemperature: (v: number) => void;
  bindingRadius: number; setBindingRadius: (v: number) => void;
  diversity: number; setDiversity: (v: number) => void;
  nMolecules: number; setNMolecules: (v: number) => void;
  targetColor: string;
}

export default function ControlsPanel({
  onGenerate, loading,
  diffusionSteps, setDiffusionSteps,
  temperature, setTemperature,
  bindingRadius, setBindingRadius,
  diversity, setDiversity,
  nMolecules, setNMolecules,
  targetColor,
}: ControlsPanelProps) {
  const sliders = [
    { label: 'Diffusion Steps', tooltip: 'More steps = higher quality, slower generation',
      value: diffusionSteps, set: setDiffusionSteps, min: 50, max: 500, step: 10 },
    { label: 'Temperature', tooltip: 'Controls diversity. Higher = more novel structures',
      value: temperature, set: setTemperature, min: 0.3, max: 1.5, step: 0.1 },
    { label: 'Binding Radius (Å)', tooltip: 'Pocket radius around binding site',
      value: bindingRadius, set: setBindingRadius, min: 3.0, max: 12.0, step: 0.5 },
    { label: 'Diversity Factor', tooltip: 'Higher = more structurally diverse output',
      value: diversity, set: setDiversity, min: 0.2, max: 1.0, step: 0.1 },
    { label: 'Candidates to Generate', tooltip: 'Number of drug candidates per run',
      value: nMolecules, set: setNMolecules, min: 8, max: 48, step: 4 },
  ];

  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: '16px', padding: '24px',
    }}>
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: '#94a3b8', letterSpacing: '2px' }}>
          GENERATION PARAMETERS
        </h3>
        <span style={{ fontSize: '10px', color: '#334155', letterSpacing: '1px' }}>PMDM v2.0</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 32px', marginBottom: '20px' }}>
        {sliders.map(({ label, tooltip, value, set, min, max, step }) => (
          <div key={label}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '12px', color: '#64748b' }} title={tooltip}>{label}</span>
              <span style={{ fontSize: '12px', fontWeight: '700', color: targetColor, fontFamily: 'monospace' }}>
                {value}
              </span>
            </div>
            <input type="range" min={min} max={max} step={step} value={value}
              onChange={e => set(Number(e.target.value))}
              style={{ width: '100%', accentColor: targetColor }} />
          </div>
        ))}
      </div>

      <button onClick={onGenerate} disabled={loading} style={{
        width: '100%', padding: '16px',
        background: loading
          ? 'rgba(255,255,255,0.04)'
          : `linear-gradient(135deg, ${targetColor}, #00ccff)`,
        border: 'none', borderRadius: '10px', cursor: loading ? 'not-allowed' : 'pointer',
        color: loading ? '#475569' : '#050a0e',
        fontSize: '15px', fontWeight: '800', letterSpacing: '1px',
        transition: 'all 0.2s',
      }}>
        {loading ? (
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
            <span style={{
              display: 'inline-block', width: '14px', height: '14px',
              border: '2px solid #334155', borderTopColor: '#00ffaa',
              borderRadius: '50%', animation: 'spin 0.8s linear infinite'
            }} />
            RUNNING DIFFUSION MODEL...
          </span>
        ) : (
          '⚗ GENERATE DRUG CANDIDATES'
        )}
      </button>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
