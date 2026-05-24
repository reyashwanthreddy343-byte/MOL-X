interface StatsBarProps { stats: any; }

export default function StatsBar({ stats }: StatsBarProps) {
  const items = [
    { label: 'Total Generated', value: stats.total, color: '#60a5fa' },
    { label: 'Lipinski Pass %', value: `${stats.lipinski_rate}%`, color: '#00ffaa' },
    { label: 'Best Affinity', value: `${stats.best_affinity}`, color: '#ff6b6b' },
    { label: 'Avg QED', value: stats.avg_qed, color: '#a78bfa' },
    { label: 'Top Candidates', value: stats.top_candidates, color: '#fbbf24' },
    { label: 'Lipinski Pass', value: stats.lipinski_pass, color: '#34d399' },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '10px', marginBottom: '28px' }}>
      {items.map(({ label, value, color }) => (
        <div key={label} style={{
          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '12px', padding: '14px 16px',
          borderTop: `2px solid ${color}40`,
        }}>
          <div style={{ fontSize: '10px', color: '#334155', letterSpacing: '1px', marginBottom: '6px', textTransform: 'uppercase' }}>
            {label}
          </div>
          <div style={{ fontSize: '24px', fontWeight: '800', color, fontFamily: 'monospace', lineHeight: 1 }}>
            {value}
          </div>
        </div>
      ))}
    </div>
  );
}
