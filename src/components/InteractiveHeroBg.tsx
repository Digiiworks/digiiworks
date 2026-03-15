import { useRef, useEffect } from 'react';

interface Node {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  size: number;
}

const MOBILE_BP = 640;
const getNodeCount = (w: number) => w < MOBILE_BP ? 25 : 60;
const getEdgeDist = (w: number) => w < MOBILE_BP ? 160 : 220;
const MOUSE_RADIUS = 280;

const InteractiveHeroBg = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const nodesRef = useRef<Node[]>([]);
  const edgeDistRef = useRef(220);
  const rafRef = useRef(0);
  const mouseRef = useRef({ x: -9999, y: -9999 });
  const isVisibleRef = useRef(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let lastW = 0;
    let lastH = 0;
    let resizeTimer: ReturnType<typeof setTimeout>;

    // Pause animation when off-screen
    const visibilityObserver = new IntersectionObserver(
      ([entry]) => {
        isVisibleRef.current = entry.isIntersecting;
        if (entry.isIntersecting && !rafRef.current) {
          rafRef.current = requestAnimationFrame(draw);
        }
      },
      { threshold: 0.05 }
    );
    visibilityObserver.observe(container);

    // Respect prefers-reduced-motion
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (motionQuery.matches) {
      isVisibleRef.current = false;
    }

    const init = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const w = parent.clientWidth;
      const h = parent.clientHeight;

      if (lastW === w && Math.abs(h - lastH) < 100 && nodesRef.current.length > 0) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        return;
      }

      lastW = w;
      lastH = h;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      edgeDistRef.current = getEdgeDist(w);
      const nodes: Node[] = [];
      for (let i = 0; i < getNodeCount(w); i++) {
        nodes.push({
          x: Math.random() * w,
          y: Math.random() * h,
          z: 0.4 + Math.random() * 0.6,
          vx: (Math.random() - 0.5) * 0.15,
          vy: (Math.random() - 0.5) * 0.12,
          size: 1.5 + Math.random() * 2,
        });
      }
      nodesRef.current = nodes;
    };

    const debouncedResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(init, 150);
    };

    init();
    window.addEventListener('resize', debouncedResize);

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    const onLeave = () => { mouseRef.current = { x: -9999, y: -9999 }; };

    window.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseleave', onLeave);

    const CYAN = { h: 175, s: 100, l: 50 };
    const TEAL = { h: 185, s: 90, l: 45 };
    const hsla = (c: typeof CYAN, a: number) => `hsla(${c.h},${c.s}%,${c.l}%,${a})`;

    const draw = (time: number) => {
      // Stop loop if not visible
      if (!isVisibleRef.current) {
        rafRef.current = 0;
        return;
      }

      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      ctx.clearRect(0, 0, w, h);

      const nodes = nodesRef.current;
      const mouse = mouseRef.current;

      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        n.x += Math.sin(time * 0.0003 + n.y * 0.005) * 0.08;
        n.y += Math.cos(time * 0.00025 + n.x * 0.004) * 0.06;
        if (n.x < -40) n.x = w + 40;
        if (n.x > w + 40) n.x = -40;
        if (n.y < -40) n.y = h + 40;
        if (n.y > h + 40) n.y = -40;

        const dx = n.x - mouse.x;
        const dy = n.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < MOUSE_RADIUS && dist > 0) {
          const force = (1 - dist / MOUSE_RADIUS) * 1.8;
          n.x += (dx / dist) * force;
          n.y += (dy / dist) * force;
        }
      }

      const edges: [number, number][] = [];
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          if (dx * dx + dy * dy < edgeDistRef.current * edgeDistRef.current) {
            edges.push([i, j]);
          }
        }
      }

      // Triangles
      const adjacency = new Map<number, Set<number>>();
      for (const [a, b] of edges) {
        if (!adjacency.has(a)) adjacency.set(a, new Set());
        if (!adjacency.has(b)) adjacency.set(b, new Set());
        adjacency.get(a)!.add(b);
        adjacency.get(b)!.add(a);
      }

      const drawnTriangles = new Set<string>();
      for (const [a, b] of edges) {
        const common = adjacency.get(a);
        const bNeighbors = adjacency.get(b);
        if (!common || !bNeighbors) continue;
        for (const c of common) {
          if (c <= b) continue;
          if (!bNeighbors.has(c)) continue;
          const key = [a, b, c].sort().join(',');
          if (drawnTriangles.has(key)) continue;
          drawnTriangles.add(key);
          const hash = ((a * 73856093) ^ (b * 19349663) ^ (c * 83492791)) >>> 0;
          if ((hash % 100) > 30) continue;
          const na = nodes[a], nb = nodes[b], nc = nodes[c];
          const cx = (na.x + nb.x + nc.x) / 3;
          const cy = (na.y + nb.y + nc.y) / 3;
          const md = Math.hypot(mouse.x - cx, mouse.y - cy);
          const mouseBoost = md < MOUSE_RADIUS ? (1 - md / MOUSE_RADIUS) * 0.04 : 0;
          ctx.beginPath();
          ctx.moveTo(na.x, na.y);
          ctx.lineTo(nb.x, nb.y);
          ctx.lineTo(nc.x, nc.y);
          ctx.closePath();
          ctx.fillStyle = hsla(CYAN, 0.015 + mouseBoost);
          ctx.fill();
        }
      }

      // Edges
      for (const [i, j] of edges) {
        const a = nodes[i], b = nodes[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const alpha = (1 - dist / edgeDistRef.current) * 0.25;
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        const md = Math.hypot(mouse.x - mx, mouse.y - my);
        const mouseBoost = md < MOUSE_RADIUS ? (1 - md / MOUSE_RADIUS) * 0.35 : 0;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = hsla(CYAN, alpha + mouseBoost);
        ctx.lineWidth = 0.8 + mouseBoost * 0.6;
        ctx.stroke();
      }

      // Nodes
      for (const n of nodes) {
        const md = Math.hypot(mouse.x - n.x, mouse.y - n.y);
        const isHot = md < MOUSE_RADIUS;
        const boost = isHot ? (1 - md / MOUSE_RADIUS) : 0;
        if (boost > 0.2) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.size * 3 * boost, 0, Math.PI * 2);
          ctx.fillStyle = hsla(CYAN, boost * 0.15);
          ctx.fill();
        }
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.size * (1 + boost * 0.8), 0, Math.PI * 2);
        ctx.fillStyle = hsla(isHot ? CYAN : TEAL, 0.5 + boost * 0.5);
        ctx.fill();
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
      clearTimeout(resizeTimer);
      visibilityObserver.disconnect();
      window.removeEventListener('resize', debouncedResize);
      window.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  return (
    <div ref={containerRef} className="fixed inset-x-0 top-0 z-0 pointer-events-auto" style={{ height: '100dvh' }}>
      <canvas ref={canvasRef} className="absolute inset-0" aria-hidden="true" />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 30%, hsl(230 25% 7% / 0.7) 100%)',
        }}
      />
    </div>
  );
};

export default InteractiveHeroBg;
