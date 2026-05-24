import { useEffect, useRef } from 'react';

declare global { interface Window { $3Dmol: any; } }

interface Props { smiles: string; height?: string; }

export default function MoleculeViewer({ smiles, height = '400px' }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const animRef = useRef<number>(0);
  const isHovering = useRef(false);

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;

    const init = () => {
      if (cancelled) return;
      if (!window.$3Dmol) { setTimeout(init, 300); return; }
      if (!containerRef.current) return;

      // Clear previous
      if (viewerRef.current) { try { viewerRef.current.clear(); } catch {} }
      containerRef.current.innerHTML = '';
      cancelAnimationFrame(animRef.current);

      const viewer = window.$3Dmol.createViewer(containerRef.current, {
        backgroundColor: '#050a0e',
        antialias: true,
      });
      viewerRef.current = viewer;

      const b64 = btoa(unescape(encodeURIComponent(smiles)))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

      const startAutoRotate = () => {
        const rotate = () => {
          if (cancelled) return;
          if (!isHovering.current && viewerRef.current) {
            viewerRef.current.rotate(0.5, { x: 0.2, y: 1, z: 0.08 });
            viewerRef.current.render();
          }
          animRef.current = requestAnimationFrame(rotate);
        };
        animRef.current = requestAnimationFrame(rotate);
      };

      fetch(`http://127.0.0.1:8000/sdf/${b64}`)
        .then(r => { if (!r.ok) throw new Error('fail'); return r.text(); })
        .then(sdf => {
          if (cancelled) return;
          viewer.addModel(sdf, 'sdf');
          viewer.setStyle({}, {
            stick: { radius: 0.15, colorscheme: 'Jmol' },
            sphere: { scale: 0.30, colorscheme: 'Jmol' },
          });
          try {
            viewer.addSurface(window.$3Dmol.SurfaceType.VDW, {
              opacity: 0.06, color: '#00ffaa'
            });
            // Add custom atom hovering or labels (optional)
            viewer.addPropertyLabels(
              "elem",
              {},
              { font: 'sans-serif', fontSize: 10, fontColor: 'white', showBackground: false, alignment: 'center' }
            );
          } catch {}
          viewer.zoomTo();
          viewer.render();
          startAutoRotate();
        })
        .catch(() => {
          if (cancelled) return;
          try {
            viewer.addModel(smiles, 'smi');
            viewer.setStyle({}, {
              stick: { radius: 0.15, color: '#00ffaa' },
              sphere: { scale: 0.25, color: '#60a5fa' },
            });
            viewer.addPropertyLabels(
              "elem",
              {},
              { font: 'sans-serif', fontSize: 10, fontColor: 'white', showBackground: false, alignment: 'center' }
            );
            viewer.zoomTo();
            viewer.render();
            startAutoRotate();
          } catch {
            viewer.addSphere({ center: {x:0,y:0,z:0}, radius: 2.5, color: '#00ffaa' });
            viewer.addSphere({ center: {x:3,y:1,z:0}, radius: 1.8, color: '#60a5fa' });
            viewer.addCylinder({ start:{x:0,y:0,z:0}, end:{x:3,y:1,z:0}, radius:0.35, color:'#94a3b8' });
            viewer.render();
            startAutoRotate();
          }
        });
    };

    init();

    // Hover handlers - stop auto-rotate on hover, resume on leave
    const el = containerRef.current;
    const onEnter = () => { isHovering.current = true; };
    const onLeave = () => { isHovering.current = false; };
    el?.addEventListener('mouseenter', onEnter);
    el?.addEventListener('mouseleave', onLeave);

    return () => {
      cancelled = true;
      cancelAnimationFrame(animRef.current);
      el?.removeEventListener('mouseenter', onEnter);
      el?.removeEventListener('mouseleave', onLeave);
      if (viewerRef.current) { try { viewerRef.current.clear(); } catch {} viewerRef.current = null; }
    };
  }, [smiles]);

  return (
    <div style={{ position: 'relative', height, overflow: 'hidden', borderRadius: '10px' }}>
      <div ref={containerRef} style={{ height: '100%', width: '100%', cursor: 'grab' }} />
      <div style={{
        position: 'absolute', bottom: '6px', right: '8px',
        fontSize: '9px', color: 'rgba(100,116,139,0.5)', pointerEvents: 'none',
      }}>
        Drag to rotate · Scroll to zoom · Shift+Drag to pan
      </div>
    </div>
  );
}
