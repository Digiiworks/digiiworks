import { TECH_STACK } from '@/lib/constants';
import { motion } from 'framer-motion';

const ease = [0.25, 0.1, 0.25, 1] as const;

const TechMarquee = () => {
  const items = [...TECH_STACK, ...TECH_STACK];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8, ease }}
      className="glass-card overflow-hidden py-5 px-0"
    >
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-card/80 to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-card/80 to-transparent" />
        <div className="marquee-track flex w-max items-center gap-0 font-mono text-sm text-muted-foreground/50">
          {items.map((tech, i) => (
            <span key={i} className="flex items-center">
              <span className="whitespace-nowrap transition-colors duration-300 hover:text-primary cursor-default">{tech}</span>
              <span className="mx-6 h-1 w-1 rounded-full bg-primary/20" />
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default TechMarquee;
