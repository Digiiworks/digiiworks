import { useRef, useEffect, useCallback } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

interface NodePoint {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  vx: number;
  vy: number;
  size: number;
  row: number;
  col: number;
}

interface Edge {
  a: number;
  b: number;
}

const DEFAULT_COLS = 10;
const DEFAULT_ROWS = 6;
const MOBILE_COLS = 7;
const MOBILE_ROWS = 4;
const MOUSE_RADIUS = 180;

const parseHslVar = (value: string): { h: number; s: number; l: number } => {
  const [h, s, l] = value
    .trim()
    .split(/\s+/)
    .map((part) => Number(part.replace('%', '')));

  return {
    h: Number.isFinite(h) ? h : 330,
    s: Number.isFinite(s) ? s : 85,
    l: Number.isFinite(l) ? l : 65,
  };
};

const hsla = (color: { h: number; s: number; l: number }, alpha: number) =>
  `hsla(${color.h}, ${color.s}%, ${color.l}%, ${alpha})`;

const InteractiveHeroBg = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<NodePoint[]>([]);
  const edgesRef = useRef<Edge[]>([]);
  const mouseRef = useRef({ x: -9999, y: -9999 });
  const rafRef = useRef<number>(0);
  const dprRef = useRef(typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1);

  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);
  const smoothX = useSpring(mouseX, { stiffness: 50, damping: 26, mass: 1.1 });
  const smoothY = useSpring(mouseY, { stiffness: 50, damping: 26, mass: 1.1 });

  const layerX = useTransform(smoothX, [0, 1], [-10, 10]);
  const layerY = useTransform(smoothY, [0, 1], [-8, 8]);

  const buildMesh = useCallback((width: number, height: number) => {
    const isMobile = width < 768;
    const cols = isMobile ? MOBILE_COLS : DEFAULT_COLS;
    const rows = isMobile ? MOBILE_ROWS : DEFAULT_ROWS;

    const paddingX = width * 0.08;
    const paddingY = height * 0.14;
    const gridWidth = width - paddingX * 2;
    const gridHeight = height - paddingY * 2;

    const stepX = cols > 1 ? gridWidth / (cols - 1) : 0;
    const stepY = rows > 1 ? gridHeight / (rows - 1) : 0;

    const points: NodePoint[] = [];

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const stagger = row % 2 === 0 ? 0 : stepX * 0.16;
        const jitterX = (Math.random() - 0.5) * 10;
        const jitterY = (Math.random() - 0.5) * 8;

        const baseX = paddingX + col * stepX + stagger + jitterX;
        const baseY = paddingY + row * stepY + jitterY;

        points.push({
          x: baseX,
          y: baseY,
          baseX,
          baseY,
          vx: 0,
          vy: 0,
          size: 1.1 + Math.random() * 1.2,
          row,
          col,
        });
      }
    }

    const edges: Edge[] = [];
    const index = (r: number, c: number) => r * cols + c;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const current = index(row, col);

        if (col < cols - 1) edges.push({ a: current, b: index(row, col + 1) });
        if (row < rows - 1) edges.push({ a: current, b: index(row + 1, col) });

        if (row < rows - 1 && col < cols - 1) {
          edges.push({ a: current, b: index(row + 1, col + (row % 2 === 0 ? 0 : 1)) });
        }

        if (row < rows - 1 && col > 0) {
          edges.push({ a: current, b: index(row + 1, col - (row % 2 === 0 ? 1 : 0)) });
        }
      }
    }

    nodesRef.current = points;
    edgesRef.current = edges.filter((edge) => edge.a >= 0 && edge.b >= 0 && edge.a < points.length && edge.b < points.length);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const dpr = dprRef.current;
    const rootStyles = getComputedStyle(document.documentElement);
    const primary = parseHslVar(rootStyles.getPropertyValue('--primary'));
    const secondary = parseHslVar(rootStyles.getPropertyValue('--secondary'));
    const foreground = parseHslVar(rootStyles.getPropertyValue('--foreground'));

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;

      const width = parent.clientWidth;
      const height = parent.clientHeight;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      buildMesh(width, height);
    };

    const onMouseMove = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      mouseRef.current = { x, y };
      mouseX.set(Math.max(0, Math.min(1, x / rect.width)));
      mouseY.set(Math.max(0, Math.min(1, y / rect.height)));
    };

    const onMouseLeave = () => {
      mouseRef.current = { x: -9999, y: -9999 };
      mouseX.set(0.5);
      mouseY.set(0.5);
    };

    resize();
    window.addEventListener('resize', resize);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseleave', onMouseLeave);

    const draw = (time: number) => {
      const width = canvas.width / dpr;
      const height = canvas.height / dpr;
      const nodes = nodesRef.current;
      const edges = edgesRef.current;
      const mouse = mouseRef.current;

      ctx.clearRect(0, 0, width, height);

      for (const node of nodes) {
        const waveX = Math.sin(time * 0.00045 + node.row * 0.75 + node.col * 0.45) * 4;
        const waveY = Math.cos(time * 0.0004 + node.col * 0.7 + node.row * 0.35) * 3;

        const targetX = node.baseX + waveX;
        const targetY = node.baseY + waveY;

        node.vx += (targetX - node.x) * 0.02;
        node.vy += (targetY - node.y) * 0.02;

        const dx = mouse.x - node.x;
        const dy = mouse.y - node.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < MOUSE_RADIUS && dist > 0) {
          const influence = (1 - dist / MOUSE_RADIUS) * 0.045;
          node.vx += dx * influence;
          node.vy += dy * influence;
        }

        node.vx *= 0.88;
        node.vy *= 0.88;
        node.x += node.vx;
        node.y += node.vy;
      }

      for (let i = 0; i < edges.length; i++) {
        const edge = edges[i];
        const a = nodes[edge.a];
        const b = nodes[edge.b];
        if (!a || !b) continue;

        const midX = (a.x + b.x) / 2;
        const midY = (a.y + b.y) / 2;
        const mouseDist = Math.hypot(mouse.x - midX, mouse.y - midY);
        const highlight = mouseDist < MOUSE_RADIUS ? (1 - mouseDist / MOUSE_RADIUS) * 0.18 : 0;

        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);

        const color = i % 2 === 0 ? primary : secondary;
        ctx.strokeStyle = hsla(color, 0.08 + highlight);
        ctx.lineWidth = 0.9;
        ctx.stroke();
      }

      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const color = i % 2 === 0 ? primary : secondary;

        const distToMouse = Math.hypot(mouse.x - node.x, mouse.y - node.y);
        const isHot = distToMouse < MOUSE_RADIUS;
        const boost = isHot ? (1 - distToMouse / MOUSE_RADIUS) * 0.6 : 0;

        ctx.beginPath();
        ctx.arc(node.x, node.y, node.size + boost * 1.6, 0, Math.PI * 2);
        ctx.fillStyle = hsla(color, 0.25 + boost * 0.4);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(node.x, node.y, node.size * 0.65, 0, Math.PI * 2);
        ctx.fillStyle = hsla(foreground, 0.4 + boost * 0.35);
        ctx.fill();
      }

      const spotlight = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 260);
      spotlight.addColorStop(0, hsla(primary, 0.12));
      spotlight.addColorStop(0.4, hsla(secondary, 0.08));
      spotlight.addColorStop(1, hsla(primary, 0));
      ctx.fillStyle = spotlight;
      ctx.fillRect(0, 0, width, height);

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mouseleave', onMouseLeave);
    };
  }, [buildMesh, mouseX, mouseY]);

  return (
    <motion.div
      className="absolute inset-0 pointer-events-auto"
      style={{ x: layerX, y: layerY }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <canvas ref={canvasRef} className="absolute inset-0" />
      <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-background to-transparent" />
    </motion.div>
  );
};

export default InteractiveHeroBg;
