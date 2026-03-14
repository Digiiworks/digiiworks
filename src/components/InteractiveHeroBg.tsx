import { useRef, useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

const ORBS = [
  { x: '15%', y: '25%', size: 500, color: '330 85% 65%', delay: 0 },
  { x: '75%', y: '15%', size: 420, color: '280 80% 60%', delay: 0.5 },
  { x: '50%', y: '65%', size: 350, color: '210 100% 65%', delay: 1 },
  { x: '85%', y: '70%', size: 280, color: '330 85% 65%', delay: 1.5 },
  { x: '25%', y: '80%', size: 300, color: '280 80% 60%', delay: 2 },
];

const GRID_LINES = 12;

const InteractiveHeroBg = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);

  const smoothX = useSpring(mouseX, { stiffness: 40, damping: 30, mass: 1 });
  const smoothY = useSpring(mouseY, { stiffness: 40, damping: 30, mass: 1 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      mouseX.set(x);
      mouseY.set(y);
    };

    const el = containerRef.current;
    if (el) {
      el.addEventListener('mousemove', handleMouseMove);
      return () => el.removeEventListener('mousemove', handleMouseMove);
    }
  }, [mouseX, mouseY]);

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden pointer-events-auto">
      {/* Floating grid */}
      <motion.div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          x: useTransform(smoothX, [0, 1], [-8, 8]),
          y: useTransform(smoothY, [0, 1], [-8, 8]),
        }}
      >
        {Array.from({ length: GRID_LINES }).map((_, i) => (
          <div
            key={`h-${i}`}
            className="absolute left-0 right-0 h-px bg-foreground/30"
            style={{ top: `${(i + 1) * (100 / (GRID_LINES + 1))}%` }}
          />
        ))}
        {Array.from({ length: GRID_LINES }).map((_, i) => (
          <div
            key={`v-${i}`}
            className="absolute top-0 bottom-0 w-px bg-foreground/30"
            style={{ left: `${(i + 1) * (100 / (GRID_LINES + 1))}%` }}
          />
        ))}
      </motion.div>

      {/* Reactive orbs */}
      {ORBS.map((orb, i) => {
        const parallaxFactor = 0.6 + i * 0.15;
        return (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              left: orb.x,
              top: orb.y,
              width: orb.size,
              height: orb.size,
              x: useTransform(smoothX, [0, 1], [-30 * parallaxFactor, 30 * parallaxFactor]),
              y: useTransform(smoothY, [0, 1], [-25 * parallaxFactor, 25 * parallaxFactor]),
              background: `radial-gradient(circle, hsl(${orb.color} / 0.18) 0%, transparent 70%)`,
              filter: 'blur(80px)',
              transform: 'translate(-50%, -50%)',
            }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, delay: orb.delay, ease: [0.25, 0.1, 0.25, 1] }}
          />
        );
      })}

      {/* Floating particles */}
      {Array.from({ length: 20 }).map((_, i) => {
        const size = 2 + Math.random() * 3;
        const startX = `${5 + Math.random() * 90}%`;
        const startY = `${5 + Math.random() * 90}%`;
        const parallax = 0.3 + Math.random() * 0.7;
        const color = i % 3 === 0 ? '330 85% 65%' : i % 3 === 1 ? '280 80% 60%' : '210 100% 65%';

        return (
          <motion.div
            key={`p-${i}`}
            className="absolute rounded-full"
            style={{
              left: startX,
              top: startY,
              width: size,
              height: size,
              background: `hsl(${color} / 0.5)`,
              boxShadow: `0 0 ${size * 3}px hsl(${color} / 0.3)`,
              x: useTransform(smoothX, [0, 1], [-15 * parallax, 15 * parallax]),
              y: useTransform(smoothY, [0, 1], [-15 * parallax, 15 * parallax]),
            }}
            initial={{ opacity: 0 }}
            animate={{
              opacity: [0, 0.6, 0.3, 0.7, 0.4],
              scale: [1, 1.2, 0.9, 1.1, 1],
            }}
            transition={{
              duration: 6 + Math.random() * 4,
              delay: Math.random() * 2,
              repeat: Infinity,
              repeatType: 'reverse',
              ease: 'easeInOut',
            }}
          />
        );
      })}

      {/* Noise texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
          backgroundSize: '128px 128px',
        }}
      />

      {/* Bottom fade to content */}
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background to-transparent" />
    </div>
  );
};

export default InteractiveHeroBg;
