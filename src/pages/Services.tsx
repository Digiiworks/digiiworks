import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { PILLARS } from '@/lib/constants';
import { SERVICE_PAGES } from '@/lib/service-pages';
import { cn } from '@/lib/utils';

const getSlugForService = (name: string) => {
  const page = SERVICE_PAGES.find((p) => p.name === name);
  return page ? `/services/${page.slug}` : '/services';
};

const Services = () => {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [activePillar, setActivePillar] = useState<string>(PILLARS[0].id);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  // Track which section is in view
  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    PILLARS.forEach((pillar) => {
      const el = sectionRefs.current[pillar.id];
      if (!el) return;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActivePillar(pillar.id);
        },
        { rootMargin: '-40% 0px -50% 0px' }
      );
      observer.observe(el);
      observers.push(observer);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, []);

  const scrollTo = (id: string) => {
    sectionRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="relative min-h-screen">
      
      <div className="relative mx-auto max-w-6xl px-6 py-16 md:py-20">
        <div className="mb-12 text-center md:mb-16">
          <p className="font-mono text-xs uppercase tracking-widest mb-3 text-muted-foreground">// service_catalog</p>
          <h1 className="font-mono text-3xl font-bold md:text-5xl">
            <span className="text-gradient">Our Services</span>
          </h1>
        </div>

        {/* Sticky filter bar */}
        <div className="sticky top-16 z-30 -mx-6 px-6 py-4 mb-8 backdrop-blur-xl bg-background/70 border-b border-border/40">
          <div className="flex items-center justify-center gap-3 overflow-x-auto scrollbar-hide">
            {PILLARS.map((pillar) => {
              const isActive = activePillar === pillar.id;
              const isPurple = pillar.id === 'autonomous';
              return (
                <button
                  key={pillar.id}
                  onClick={() => scrollTo(pillar.id)}
                  className={cn(
                    'shrink-0 rounded-full px-5 py-2 font-mono text-sm transition-all duration-300 border',
                    isActive
                      ? isPurple
                        ? 'bg-neon-purple/10 border-neon-purple/50 text-neon-purple shadow-[0_0_16px_hsl(280_99%_53%/0.15)]'
                        : 'bg-primary/10 border-primary/50 text-primary shadow-[0_0_16px_hsl(184_100%_50%/0.15)]'
                      : 'border-border/40 text-muted-foreground hover:text-foreground hover:border-border hover:bg-muted/20'
                  )}
                >
                  <span className={cn('mr-2', isActive ? 'opacity-80' : 'opacity-40')}>{pillar.label}</span>
                  {pillar.title}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-14 md:space-y-20">
          {PILLARS.map((pillar) => (
            <section
              key={pillar.id}
              id={pillar.id}
              ref={(el) => { sectionRefs.current[pillar.id] = el; }}
              className="scroll-mt-32"
            >
              <div className="mb-6 flex items-center gap-3 md:mb-8">
                <span className={`font-mono text-xs uppercase tracking-widest ${pillar.accentColor}`}>{pillar.label}</span>
                <div className="h-px flex-1 bg-border" />
                <h2 className="font-mono text-xl font-semibold text-foreground md:text-2xl">{pillar.title}</h2>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {pillar.services.map((svc, idx) => {
                  const cardKey = `${pillar.id}-${svc.name}`;
                  const isHovered = hoveredCard === cardKey;
                  const isAi = pillar.id === 'autonomous';
                  const serviceLink = getSlugForService(svc.name);

                  return (
                    <motion.div
                      key={svc.name}
                      initial={{ opacity: 0, y: 24 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: '-40px' }}
                      transition={{ duration: 0.4, delay: idx * 0.1 }}
                    >
                      <Link
                        to={serviceLink}
                        className="glass-card group relative block overflow-hidden p-5 transition-all duration-500 hover:scale-[1.02] md:p-6"
                        style={{
                          boxShadow: isHovered
                            ? '0 0 30px hsl(175 100% 42% / 0.3), 0 0 60px hsl(175 100% 42% / 0.1)'
                            : 'none',
                            : 'none',
                        }}
                        onMouseEnter={() => setHoveredCard(cardKey)}
                        onMouseLeave={() => setHoveredCard(null)}
                      >
                        <div
                          className="absolute inset-x-0 top-0 h-[2px] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                          style={{ background: `hsl(${pillar.glowHsl})`, boxShadow: `0 0 12px hsl(${pillar.glowHsl} / 0.5)` }}
                        />
                        <h3 className={`mb-2 font-mono text-base font-semibold transition-colors duration-300 ${
                          isHovered
                            ? isAi ? 'text-neon-purple' : 'text-neon-blue'
                            : 'text-foreground'
                        }`}>
                          {svc.name}
                        </h3>
                        <p className="mb-3 text-sm leading-relaxed text-muted-foreground">{svc.desc}</p>
                        <span className="flex items-center gap-1 text-xs font-mono text-muted-foreground transition-colors group-hover:text-primary">
                          Learn more <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
                        </span>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Services;
