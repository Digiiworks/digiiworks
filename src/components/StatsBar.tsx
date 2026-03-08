import { motion, useInView } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';
import { STATS } from '@/lib/constants';

const AnimatedNumber = ({ value, suffix }: { value: number; suffix: string }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const duration = 1500;
    const steps = 40;
    const increment = value / steps;
    let current = 0;
    const interval = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplay(value);
        clearInterval(interval);
      } else {
        setDisplay(Number(current.toFixed(value % 1 !== 0 ? 1 : 0)));
      }
    }, duration / steps);
    return () => clearInterval(interval);
  }, [inView, value]);

  return (
    <span ref={ref} className="text-2xl font-bold text-foreground md:text-3xl font-mono">
      {value % 1 !== 0 ? display.toFixed(1) : Math.floor(display)}
      {suffix}
    </span>
  );
};

const StatsBar = () => (
  <motion.div
    className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay: 0.4 }}
  >
    {STATS.map((stat) => (
      <div
        key={stat.label}
        className="glass-card flex flex-col items-center gap-1 p-4 text-center md:p-5"
      >
        <AnimatedNumber value={stat.value} suffix={stat.suffix} />
        <span className="text-xs text-muted-foreground font-mono uppercase tracking-wider">
          {stat.label}
        </span>
      </div>
    ))}
  </motion.div>
);

export default StatsBar;
