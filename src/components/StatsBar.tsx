import { motion, useInView } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';
import { STATS } from '@/lib/constants';

const ease = [0.25, 0.1, 0.25, 1] as const;

const AnimatedNumber = ({ value, suffix, live }: { value: number; suffix: string; live?: boolean }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [display, setDisplay] = useState(0);
  const [doneCountUp, setDoneCountUp] = useState(false);

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
        setDoneCountUp(true);
      } else {
        setDisplay(Number(current.toFixed(value % 1 !== 0 ? 1 : 0)));
      }
    }, duration / steps);
    return () => clearInterval(interval);
  }, [inView, value]);

  useEffect(() => {
    if (!live || !doneCountUp) return;
    const interval = setInterval(() => {
      setDisplay((prev) => {
        const delta = Math.random() < 0.5 ? -1 : 1;
        return Math.max(value - 5, Math.min(value + 5, prev + delta));
      });
    }, 2000 + Math.random() * 3000);
    return () => clearInterval(interval);
  }, [live, doneCountUp, value]);

  return (
    <span ref={ref} className="text-2xl font-bold text-foreground md:text-3xl font-mono">
      {value % 1 !== 0 ? display.toFixed(1) : Math.floor(display)}
      {suffix}
    </span>
  );
};

const StatsBar = () => (
  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
    {STATS.map((stat, i) => (
      <motion.div
        key={stat.label}
        className="flex flex-col items-center gap-1.5 rounded-xl bg-card border border-border/50 p-5 text-center"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: i * 0.1, ease }}
      >
        <AnimatedNumber value={stat.value} suffix={stat.suffix} live={stat.label === 'Automations Running'} />
        <span className="text-xs text-muted-foreground font-mono uppercase tracking-wider">
          {stat.label}
        </span>
      </motion.div>
    ))}
  </div>
);

export default StatsBar;
