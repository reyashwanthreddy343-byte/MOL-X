interface MoleculeCardProps {
  molecule: any;
  rank: number;
  onView: () => void;
}

export default function MoleculeCard({ molecule: m, rank, onView }: MoleculeCardProps) {
  const tierColors: Record<string, string> = {
    top: '#00ffaa',
    good: '#60a5fa',
    moderate: '#fbbf24',
    low: '#f87171',
  };
  const tierColor = tierColors[m.tier_class] || '#64748b';
  const isTop = m.tier_class === 'top';

  return (
    <div
      style={{
        background: isTop ? 'rgba(0,255,170,0.04)' : 'rgba(255,255,255,0.02)',
        border: isTop ? '1px solid rgba(0,255,170,0.25)' : '1px solid rgba(255,255,255,0.06)',
        borderRadius: '14px', overflow: 'hidden',
        transition: 'transform 0.2s, border-color 0.2s',
        position: 'relative',
      }}
      onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-3px)')}
      onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
    >
      {/* Rank badge */}
      {rank <= 3 && (
        <div style={{
          position: 'absolute', top: '10px', left: '10px', zIndex: 10,
          width: '26px', height: '26px', borderRadius: '50%',
          background: ['', '#FFD700', '#C0C0C0', '#CD7F32'][rank],
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '11px', fontWeight: '800', color: '#000'
        }}>{rank}</div>
      )}

      {/* Tier badge */}
      <div style={{
        position: 'absolute', top: '10px', right: '10px', zIndex: 10,
        padding: '3px 10px', borderRadius: '20px',
        background: `${tierColor}18`, border: `1px solid ${tierColor}40`,
        fontSize: '10px', fontWeight: '600', color: tierColor, letterSpacing: '0.3px'
      }}>{m.tier}</div>

      {/* Visual header */}
      <div style={{
        height: '110px', background: 'rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        position: 'relative', overflow: 'hidden'
      }}>
        <svg width="100%" height="100%" viewBox="0 0 280 110" style={{ position: 'absolute', inset: 0 }}>
          {Array.from({length: 8}, (_, i) => {
            const seed = (m.id.charCodeAt(4 + (i % m.id.length)) || 7) * (i + 3);
            const x = 30 + (seed * 31 % 220);
            const y = 10 + (seed * 17 % 90);
            return <circle key={i} cx={x} cy={y} r={2 + (i % 4) * 1.5}
              fill={isTop ? '#00ffaa' : '#334155'} opacity={0.4 + i * 0.06} />;
          })}
          {Array.from({length: 6}, (_, i) => {
            const s1 = (m.id.charCodeAt(4 + (i % m.id.length)) || 7) * (i + 3);
            const s2 = (m.id.charCodeAt(4 + ((i+1) % m.id.length)) || 11) * (i + 5);
            return <line key={i}
              x1={30 + s1 * 31 % 220} y1={10 + s1 * 17 % 90}
              x2={30 + s2 * 31 % 220} y2={10 + s2 * 17 % 90}
              stroke={isTop ? '#00ffaa' : '#1e293b'} strokeWidth="1" opacity="0.4" />;
          })}
        </svg>
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '0 40px' }}>
          <div style={{ fontSize: '10px', color: '#475569', letterSpacing: '1px', marginBottom: '3px' }}>SMILES</div>
          <div style={{ fontSize: '10px', color: isTop ? '#00ffaa80' : '#33415580', wordBreak: 'break-all', lineHeight: 1.3 }}>
            {m.smiles?.substring(0, 45)}{m.smiles?.length > 45 ? '...' : ''}
          </div>
        </div>
      </div>

      {/* Card content */}
      <div style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: '700', color: '#e2e8f0', fontFamily: 'monospace' }}>{m.id}</div>
            <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>MW: {m.molecular_weight} Da</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '22px', fontWeight: '800', color: '#ff6b6b', lineHeight: 1, fontFamily: 'monospace' }}>
              {m.binding_affinity}
            </div>
            <div style={{ fontSize: '10px', color: '#475569', marginTop: '1px' }}>kcal/mol</div>
          </div>
        </div>

        {/* Property grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', marginBottom: '10px' }}>
          {[
            { label: 'QED', value: m.qed, good: m.qed > 0.6 },
            { label: 'LogP', value: m.logp, good: m.logp >= 0 && m.logp <= 5 },
            { label: 'TPSA', value: m.tpsa, good: m.tpsa <= 140 },
          ].map(({ label, value, good }) => (
            <div key={label} style={{
              background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '7px',
              border: `1px solid ${good ? 'rgba(0,255,170,0.15)' : 'rgba(255,255,255,0.04)'}`,
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '10px', color: '#475569', letterSpacing: '0.5px' }}>{label}</div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: good ? '#00ffaa' : '#94a3b8', marginTop: '1px' }}>
                {value}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div style={{ fontSize: '12px', color: m.lipinski_pass ? '#00ffaa' : '#f87171' }}>{m.lipinski}</div>
          <div style={{ fontSize: '11px', color: '#334155' }}>HBD:{m.hbd} HBA:{m.hba}</div>
        </div>

        {/* Drug score bar */}
        <div style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '10px', color: '#334155', letterSpacing: '0.5px' }}>DRUG SCORE</span>
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#60a5fa' }}>{m.drug_score}</span>
          </div>
          <div style={{ height: '3px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px' }}>
            <div style={{
              height: '100%', borderRadius: '2px',
              width: `${m.drug_score * 100}%`,
              background: 'linear-gradient(90deg, #00ffaa, #60a5fa)',
            }} />
          </div>
        </div>

        <button onClick={onView} style={{
          width: '100%', padding: '10px',
          background: isTop ? 'rgba(0,255,170,0.12)' : 'rgba(255,255,255,0.04)',
          border: isTop ? '1px solid rgba(0,255,170,0.35)' : '1px solid rgba(255,255,255,0.08)',
          borderRadius: '8px', cursor: 'pointer',
          color: isTop ? '#00ffaa' : '#94a3b8',
          fontSize: '13px', fontWeight: '600', letterSpacing: '0.5px',
          transition: 'all 0.2s',
        }}>
          View 3D Structure →
        </button>
      </div>
    </div>
  );
}
