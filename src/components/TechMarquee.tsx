import { TECH_STACK } from '@/lib/constants';

const TechMarquee = () => {
  const items = [...TECH_STACK, ...TECH_STACK];

  return (
    <div className="relative overflow-hidden py-6">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-background to-transparent" />
      <div className="marquee-track flex w-max items-center gap-0 font-mono text-sm text-muted-foreground/40">
        {items.map((tech, i) => (
          <span key={i} className="flex items-center">
            <span className="whitespace-nowrap transition-colors duration-300 hover:text-primary">{tech}</span>
            <span className="mx-5 h-1 w-1 rounded-full bg-muted-foreground/20" />
          </span>
        ))}
      </div>
    </div>
  );
};

export default TechMarquee;
