import { motion } from 'framer-motion';

const orbs = [
  { x: '20%', y: '30%', size: 320, color: 'var(--neon-blue)', delay: 0 },
  { x: '70%', y: '20%', size: 280, color: 'var(--neon-purple)', delay: 1.5 },
  { x: '50%', y: '60%', size: 200, color: 'var(--neon-mint)', delay: 3 },
];

const HeroOrbs = () => (
  <div className="pointer-events-none absolute inset-0 overflow-hidden">
    {orbs.map((orb, i) => (
      <motion.div
        key={i}
        className="absolute rounded-full"
        style={{
          left: orb.x,
          top: orb.y,
          width: orb.size,
          height: orb.size,
          background: `radial-gradient(circle, hsl(${orb.color} / 0.15) 0%, transparent 70%)`,
          filter: 'blur(60px)',
          transform: 'translate(-50%, -50%)',
        }}
        animate={{
          x: [0, 30, -20, 0],
          y: [0, -25, 15, 0],
          scale: [1, 1.1, 0.95, 1],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          delay: orb.delay,
          ease: 'easeInOut',
        }}
      />
    ))}
  </div>
);

export default HeroOrbs;
