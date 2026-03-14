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
    const duration = 1800;
    const steps = 50;
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
    <span ref={ref} className="text-3xl font-extrabold text-foreground md:text-4xl font-mono tracking-tight">
      {value % 1 !== 0 ? display.toFixed(1) : Math.floor(display)}
      <span className="text-primary">{suffix}</span>
    </span>
  );
};

const StatsBar = () => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-60px' }}
    transition={{ duration: 0.6, ease }}
  >
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-5 rounded-2xl bg-background/70 backdrop-blur-2xl border border-border/30 shadow-lg shadow-background/20 p-4 sm:p-5">
      {STATS.map((stat, i) => (
        <motion.div
          key={stat.label}
          className="glass-card flex flex-col items-center gap-2 p-6 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: i * 0.08, ease }}
        >
          <AnimatedNumber value={stat.value} suffix={stat.suffix} live={stat.label === 'Automations Running'} />
          <span className="text-[11px] text-muted-foreground font-mono uppercase tracking-[0.15em]">
            {stat.label}
          </span>
        </motion.div>
      ))}
    </div>
  </motion.div>
);

export default StatsBar;
