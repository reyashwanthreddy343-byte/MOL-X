import { useState, useEffect, useRef } from 'react';
import DashboardPage from './pages/DashboardPage';
import DataParadigmPage from './pages/DataParadigmPage';
import ProjectsPage from './pages/ProjectsPage';
import DatasetsPage from './pages/DatasetsPage';
import ResearchPage from './pages/ResearchPage';
import DocsPage from './pages/DocsPage';
import HybridLabPage from './pages/HybridLabPage';
import { ErrorBoundary } from './components/ErrorBoundary';

type PageId = 'dashboard' | 'generate' | 'projects' | 'datasets' | 'research' | 'about' | 'hybridlab';

const NAV_ITEMS: { id: PageId; icon: string; label: string; color: string; badge?: string }[] = [
  { id: 'dashboard',  icon: '🏠', label: 'Dashboard',   color: '#00ffaa' },
  { id: 'generate',   icon: '⚗️', label: 'Generate',    color: '#a78bfa' },
  { id: 'projects',   icon: '🗂️', label: 'Projects',    color: '#60a5fa' },
  { id: 'datasets',   icon: '📊', label: 'Datasets',    color: '#f472b6' },
  { id: 'research',   icon: '🔬', label: 'Research',    color: '#fbbf24' },
  { id: 'hybridlab',  icon: '🧬', label: 'Hybrid Lab',  color: '#00ffaa' },
  { id: 'about',      icon: '💡', label: 'About MOL-X', color: '#fbbf24' },
];

// ── Animated floating particles ──────────────────────────────────────────
function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const particles: { x: number; y: number; vx: number; vy: number; r: number; alpha: number; hue: number }[] = [];
    const N = 50;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    for (let i = 0; i < N; i++) {
      particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.4 + 0.1,
        hue: Math.random() > 0.6 ? 160 : Math.random() > 0.5 ? 220 : 270,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `hsla(${particles[i].hue}, 80%, 60%, ${0.06 * (1 - dist / 100)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      for (const p of particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 80%, 65%, ${p.alpha})`;
        ctx.fill();
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
      }
      animId = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', opacity: 0.5 }}
    />
  );
}

export default function App() {
  const [page, setPage] = useState<PageId>('dashboard');
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Expose navigation function globally so Dashboard buttons can navigate
  useEffect(() => {
    (window as any).__molx_nav = (p: PageId) => setPage(p);
    return () => { delete (window as any).__molx_nav; };
  }, []);

  useEffect(() => {
    const check = () =>
      fetch('http://127.0.0.1:8000/paradigm-status')
        .then(() => setApiStatus('online'))
        .catch(() => setApiStatus('offline'));
    check();
    const interval = setInterval(check, 10000);
    return () => clearInterval(interval);
  }, []);

  const sideW = sidebarCollapsed ? 68 : 200;

  return (
    <div style={{
      minHeight: '100vh',
      background: '#050a0e',
      color: '#e2e8f0',
      fontFamily: "'Space Grotesk', 'Inter', sans-serif",
    }}>
      <ParticleBackground />

      {/* Grid overlay */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        backgroundImage: `
          linear-gradient(rgba(0,255,170,0.02) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,255,170,0.02) 1px, transparent 1px)
        `,
        backgroundSize: '48px 48px',
      }} />

      {/* ═══ SIDEBAR ═══ */}
      <aside style={{
        position: 'fixed', top: 0, left: 0, bottom: 0, width: `${sideW}px`,
        zIndex: 200, transition: 'width 0.3s cubic-bezier(0.4,0,0.2,1)',
        background: 'rgba(5,10,14,0.92)', backdropFilter: 'blur(32px)', WebkitBackdropFilter: 'blur(32px)',
        borderRight: '1px solid rgba(0,255,170,0.08)',
        display: 'flex', flexDirection: 'column',
        boxShadow: '4px 0 24px rgba(0,0,0,0.3)',
      }}>
        {/* Logo */}
        <div style={{
          padding: sidebarCollapsed ? '18px 0' : '18px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center', gap: '10px',
          justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
        }}>
          <div style={{
            width: '34px', height: '34px', flexShrink: 0,
            background: 'linear-gradient(135deg, rgba(0,255,170,0.2), rgba(0,204,255,0.2))',
            border: '1px solid rgba(0,255,170,0.5)',
            borderRadius: '8px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: '900', fontSize: '22px', color: '#00ffaa',
            fontFamily: 'monospace', boxShadow: '0 0 16px rgba(0,255,170,0.3)',
          }}>⬡</div>
          {!sidebarCollapsed && (
            <div>
              <div style={{ fontSize: '17px', fontWeight: '800', letterSpacing: '-0.5px', color: '#fff', lineHeight: 1 }}>MOL-X</div>
              <div style={{ fontSize: '7px', color: '#00ffaa', letterSpacing: '2px', lineHeight: 1, marginTop: '2px', opacity: 0.8 }}>AI DRUG DISCOVERY</div>
            </div>
          )}
        </div>

        {/* Nav Items */}
        <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {NAV_ITEMS.map(item => {
            const isActive = page === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setPage(item.id)}
                className={sidebarCollapsed ? 'sidebar-tooltip' : ''}
                data-tooltip={item.label}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: sidebarCollapsed ? '11px 0' : '10px 12px',
                  justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                  borderRadius: '10px', border: 'none', cursor: 'pointer',
                  background: isActive ? `${item.color}12` : 'transparent',
                  transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
                  position: 'relative',
                }}
                onMouseEnter={e => { if (!isActive) (e.currentTarget.style.background = 'rgba(255,255,255,0.04)'); }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget.style.background = isActive ? `${item.color}12` : 'transparent'); }}
              >
                {/* Active glow bar */}
                {isActive && (
                  <div style={{
                    position: 'absolute', left: sidebarCollapsed ? '50%' : '-8px',
                    top: sidebarCollapsed ? '-2px' : '50%',
                    transform: sidebarCollapsed ? 'translateX(-50%)' : 'translateY(-50%)',
                    width: sidebarCollapsed ? '20px' : '3px',
                    height: sidebarCollapsed ? '3px' : '20px',
                    background: item.color,
                    borderRadius: '3px',
                    boxShadow: `0 0 10px ${item.color}80`,
                  }} />
                )}
                {/* Active glow dot */}
                {isActive && !sidebarCollapsed && (
                  <div style={{
                    position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                    width: '5px', height: '5px', borderRadius: '50%',
                    background: item.color,
                    boxShadow: `0 0 8px ${item.color}`,
                    animation: 'pulse-glow 2s ease-in-out infinite',
                  }} />
                )}
                <span style={{ fontSize: '17px', flexShrink: 0 }}>{item.icon}</span>
                {!sidebarCollapsed && (
                  <span style={{
                    fontSize: '12px', fontWeight: isActive ? '700' : '500',
                    color: isActive ? item.color : '#64748b',
                    letterSpacing: '0.3px', flex: 1,
                    transition: 'color 0.2s',
                  }}>{item.label}</span>
                )}
                {!sidebarCollapsed && item.badge && (
                  <span style={{
                    fontSize: '7px', fontWeight: '800', letterSpacing: '1px',
                    padding: '2px 5px', borderRadius: '4px',
                    background: 'linear-gradient(135deg, #00ffaa, #60a5fa)',
                    color: '#050a0e',
                  }}>{item.badge}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom Controls */}
        <div style={{ padding: '12px 8px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {/* API Status */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '8px 12px', justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
          }}>
            <div style={{
              width: '7px', height: '7px', borderRadius: '50%', flexShrink: 0,
              background: apiStatus === 'online' ? '#00ffaa' : apiStatus === 'offline' ? '#ff4444' : '#ffaa00',
              boxShadow: apiStatus === 'online' ? '0 0 10px #00ffaa' : 'none',
              animation: apiStatus === 'online' ? 'pulse 2s infinite' : 'none',
            }} />
            {!sidebarCollapsed && (
              <span style={{ fontSize: '10px', color: '#475569' }}>
                {apiStatus === 'online' ? 'Backend Online' : apiStatus === 'offline' ? 'Offline' : 'Connecting...'}
              </span>
            )}
          </div>

          {/* Collapse Toggle */}
          <button onClick={() => setSidebarCollapsed(c => !c)} style={{
            width: '100%', padding: '8px', borderRadius: '8px', border: 'none',
            background: 'rgba(255,255,255,0.03)', color: '#475569',
            fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s',
          }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
          >
            {sidebarCollapsed ? '»' : '« Collapse'}
          </button>
        </div>
      </aside>

      {/* ═══ MAIN CONTENT ═══ */}
      <main style={{
        marginLeft: `${sideW}px`,
        transition: 'margin-left 0.25s ease',
        position: 'relative', zIndex: 1,
        minHeight: '100vh',
      }}>
        <ErrorBoundary>
          {page === 'dashboard'  && <DashboardPage />}
          {page === 'generate'   && <DataParadigmPage />}
          {page === 'projects'   && <ProjectsPage />}
          {page === 'datasets'   && <DatasetsPage />}
          {page === 'research'   && <ResearchPage />}
          {page === 'hybridlab'  && <HybridLabPage />}
          {page === 'about'      && <DocsPage />}
        </ErrorBoundary>
      </main>

      {/* All animations and scrollbar styles moved to index.css */}
    </div>
  );
}
