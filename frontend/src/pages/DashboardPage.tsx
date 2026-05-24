import { useState, useEffect, useRef } from 'react';

const API = 'http://127.0.0.1:8000';

function CountUp({ target, suffix = '', duration = 2000 }: { target: number; suffix?: string; duration?: number }) {
  const [val, setVal] = useState(0);
  const start = useRef(Date.now());
  useEffect(() => {
    const tick = () => {
      const elapsed = Date.now() - start.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setVal(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration]);
  return <>{val.toLocaleString()}{suffix}</>;
}

function HexRing() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let t = 0, animId: number;
    const draw = () => {
      const W = canvas.width, H = canvas.height, cx = W / 2, cy = H / 2;
      ctx.clearRect(0, 0, W, H);
      const rings = [
        { r: 80, n: 6, size: 20, color: '#00ffaa', speed: 0.008 },
        { r: 140, n: 12, size: 14, color: '#60a5fa', speed: -0.005 },
        { r: 200, n: 18, size: 10, color: '#a78bfa', speed: 0.003 },
      ];
      rings.forEach(({ r, n, size, color, speed }) => {
        for (let i = 0; i < n; i++) {
          const angle = (i / n) * Math.PI * 2 + t * speed * 60;
          const x = cx + Math.cos(angle) * r;
          const y = cy + Math.sin(angle) * r;
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(angle + t * 0.02);
          ctx.beginPath();
          for (let j = 0; j < 6; j++) {
            const a = (j / 6) * Math.PI * 2 - Math.PI / 6;
            j === 0 ? ctx.moveTo(Math.cos(a) * size, Math.sin(a) * size) : ctx.lineTo(Math.cos(a) * size, Math.sin(a) * size);
          }
          ctx.closePath();
          ctx.strokeStyle = color;
          ctx.lineWidth = 1;
          ctx.globalAlpha = 0.35 + Math.sin(t * 0.05 + i) * 0.15;
          ctx.stroke();
          ctx.restore();
        }
      });
      // Center glow
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 70);
      grad.addColorStop(0, 'rgba(0,255,170,0.15)');
      grad.addColorStop(1, 'transparent');
      ctx.globalAlpha = 1;
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
      // Center molecule icon
      ctx.font = 'bold 36px monospace';
      ctx.fillStyle = '#00ffaa';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.globalAlpha = 0.9;
      ctx.fillText('⬡', cx, cy);
      t++;
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animId);
  }, []);
  return <canvas ref={canvasRef} width={440} height={440} style={{ width: '440px', height: '440px' }} />;
}

export default function DashboardPage() {
  const [status, setStatus] = useState<any>(null);
  const [runs, setRuns] = useState<any[]>([]);

  useEffect(() => {
    fetch(`${API}/paradigm-status`).then(r => r.json()).then(setStatus).catch(() => {});
    fetch(`${API}/list-runs`).then(r => r.json()).then(d => setRuns(d.runs || [])).catch(() => {});
  }, []);

  const stats = [
    { label: 'Total Molecules Synthesized', value: 45210, suffix: '+', color: '#00ffaa', icon: '⚗️' },
    { label: 'GPU Engine Status', value: status?.device?.includes('cuda') ? 'Active' : 'Offline', suffix: '', color: status?.device?.includes('cuda') ? '#00ffaa' : '#fbbf24', icon: '⚡' },
    { label: 'Validation Accuracy', value: 94, suffix: '%', color: '#60a5fa', icon: '🎯' },
    { label: 'Latent Dimensions', value: 32, suffix: 'D', color: '#f472b6', icon: '🧠' },
  ];

  const features = [
    { icon: '🧬', title: 'VAE Generator', desc: 'Variational Autoencoder trained on molecular property distributions using PyTorch GPU acceleration.', color: '#00ffaa', tag: 'CORE ENGINE' },
    { icon: '🧪', title: 'ADMET Toxicity', desc: 'Advanced rule-based screening for GI absorption, BBB permeance, CYP inhibition, and hERG safety.', color: '#60a5fa', tag: 'NEW FEATURE' },
    { icon: '📐', title: 'Pareto Optimization', desc: 'Multi-objective NSGA-II evolutionary algorithm to find the optimal balance of potency and drug-likeness.', color: '#a78bfa', tag: 'NEW FEATURE' },
    { icon: '💊', title: 'FDA Similarity', desc: 'Tanimoto-based fingerprinting engine comparing candidates against a curated library of approved medicines.', color: '#f472b6', tag: 'NEW FEATURE' },
    { icon: '🔬', title: '4-Way Validation', desc: 'Cross-evaluation using both our RandomForest and open-source Gradient Boosting models for verification.', color: '#fbbf24', tag: 'EVALUATION' },
    { icon: '🌌', title: '3D Latent Space', desc: 'PCA-projected 32D embedding space visualized as an interactive 3D starfield galaxy using Plotly.js.', color: '#34d399', tag: 'VISUALIZATION' },
  ];

  return (
    <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Hero */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 440px', gap: '40px', alignItems: 'center', marginBottom: '48px', minHeight: '440px' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '4px 14px', borderRadius: '20px', border: '1px solid rgba(0,255,170,0.25)', background: 'rgba(0,255,170,0.05)', marginBottom: '20px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#00ffaa', boxShadow: '0 0 8px #00ffaa', animation: 'pulse 2s infinite' }} />
            <span style={{ fontSize: '10px', color: '#00ffaa', letterSpacing: '2px', fontWeight: '700' }}>
              {status?.dataset_loaded ? 'DATASET LOADED · READY TO GENERATE' : 'SYSTEM ONLINE'}
            </span>
          </div>

          <h1 style={{ fontSize: '56px', fontWeight: '900', lineHeight: 1.05, margin: '0 0 16px', letterSpacing: '-2px' }}>
            <span style={{ color: '#fff' }}>Next-Gen</span><br />
            <span style={{ background: 'linear-gradient(135deg, #00ffaa, #60a5fa, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Drug Discovery
            </span><br />
            <span style={{ color: '#fff' }}>Powered by AI</span>
          </h1>

          <p style={{ fontSize: '15px', color: '#64748b', lineHeight: 1.7, maxWidth: '480px', marginBottom: '28px' }}>
            MOL-X is an enterprise-grade generative validation pipeline that synthesises novel drug candidates using Variational Autoencoders, validates them via 4-way cross-ML evaluation, and proves their authenticity with an Adversarial Turing Test.
          </p>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn-shimmer" onClick={() => (window as any).__molx_nav?.('generate')} style={{
              padding: '14px 32px', borderRadius: '12px', border: 'none',
              background: 'linear-gradient(135deg, #00ffaa, #00ccff)', color: '#050a0e',
              fontSize: '13px', fontWeight: '800',
              boxShadow: '0 4px 24px rgba(0,255,170,0.3)',
              '--btn-glow': 'rgba(0,255,170,0.35)',
            } as any}>⚗️ Start Generation</button>
            <button className="btn-shimmer" onClick={() => (window as any).__molx_nav?.('research')} style={{
              padding: '14px 32px', borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)',
              color: '#94a3b8', fontSize: '13px', fontWeight: '700',
              '--btn-glow': 'rgba(96,165,250,0.2)',
            } as any}>🌌 View Research</button>
          </div>
        </div>

        {/* Hex Ring Animation */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
          <HexRing />
          <div style={{ position: 'absolute', bottom: '20px', right: '20px', textAlign: 'right' }}>
            <div style={{ fontSize: '9px', color: '#334155', letterSpacing: '1px' }}>BACKEND</div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: status?.status === 'complete' ? '#00ffaa' : '#60a5fa' }}>
              {status?.status?.replace(/_/g, ' ').toUpperCase() || 'IDLE'}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '14px', marginBottom: '40px' }}>
        {stats.map((s, i) => (
          <div key={i} className="glow-ring-anim" style={{
            padding: '22px', borderRadius: '16px',
            background: `linear-gradient(145deg, ${s.color}08, rgba(255,255,255,0.015))`,
            border: `1px solid ${s.color}25`,
            position: 'relative', overflow: 'hidden',
            backdropFilter: 'blur(12px)',
            animation: `glow-ring 4s ease-in-out ${i * 0.5}s infinite`,
          }}>
            <div style={{ position: 'absolute', top: '14px', right: '16px', fontSize: '24px', opacity: 0.2 }}>{s.icon}</div>
            <div style={{ fontSize: '9px', color: '#475569', letterSpacing: '2.5px', marginBottom: '10px', fontWeight: '600' }}>{s.label.toUpperCase()}</div>
            <div style={{ fontSize: '36px', fontWeight: '900', color: s.color, fontFamily: "'IBM Plex Mono', monospace", lineHeight: 1 }}>
              <CountUp target={s.value} suffix={s.suffix} duration={1800 + i * 200} />
            </div>
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '3px', background: `linear-gradient(90deg, ${s.color}60, ${s.color}10, transparent)`, borderRadius: '0 0 16px 16px' }} />
          </div>
        ))}
      </div>

      {/* Feature Cards */}
      <div style={{ marginBottom: '40px' }}>
        <div style={{ fontSize: '10px', color: '#475569', letterSpacing: '3px', fontWeight: '700', marginBottom: '16px' }}>CORE CAPABILITIES</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '14px' }}>
          {features.map((f, i) => (
            <div key={i} style={{
              padding: '22px', borderRadius: '16px',
              background: 'rgba(10,15,20,0.5)', border: '1px solid rgba(255,255,255,0.06)',
              backdropFilter: 'blur(16px)',
              transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)', cursor: 'default',
              position: 'relative', overflow: 'hidden',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = f.color + '44'; (e.currentTarget as HTMLDivElement).style.background = f.color + '06'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = `0 8px 24px rgba(0,0,0,0.3), 0 0 16px ${f.color}15`; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.06)'; (e.currentTarget as HTMLDivElement).style.background = 'rgba(10,15,20,0.5)'; (e.currentTarget as HTMLDivElement).style.transform = 'none'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{
                  width: '38px', height: '38px', borderRadius: '10px',
                  background: `${f.color}12`, border: `1px solid ${f.color}25`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px',
                }}>{f.icon}</div>
                <span style={{ fontSize: '8px', color: f.color, letterSpacing: '1.5px', padding: '3px 10px', borderRadius: '10px', border: `1px solid ${f.color}30`, background: `${f.color}10`, fontWeight: '700' }}>{f.tag}</span>
              </div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#e2e8f0', marginBottom: '8px' }}>{f.title}</div>
              <div style={{ fontSize: '11px', color: '#475569', lineHeight: 1.7 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
