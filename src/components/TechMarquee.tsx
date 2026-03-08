import { TECH_STACK } from '@/lib/constants';

const TechMarquee = () => {
  const items = [...TECH_STACK, ...TECH_STACK];

  return (
    <div className="relative overflow-hidden py-8">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-background to-transparent" />
      <div className="marquee-track flex w-max gap-8 font-mono text-sm text-muted-foreground/50">
        {items.map((tech, i) => (
          <span key={i} className="whitespace-nowrap transition-colors hover:text-primary">
            {tech}
          </span>
        ))}
      </div>
    </div>
  );
};

export default TechMarquee;
