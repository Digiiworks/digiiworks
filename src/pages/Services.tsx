import { useState } from 'react';
import { motion } from 'framer-motion';
import { PILLARS } from '@/lib/constants';

const Services = () => {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  return (
    <div className="relative min-h-screen">
      <div className="absolute inset-0 grid-overlay opacity-30" />
      <div className="relative mx-auto max-w-6xl px-6 py-16 md:py-20">
        <div className="mb-12 text-center md:mb-16">
          <p className="font-mono text-xs uppercase tracking-widest mb-3 text-muted-foreground">// service_catalog</p>
          <h1 className="font-mono text-3xl font-bold md:text-5xl">
            <span className="text-gradient">Our Services</span>
          </h1>
        </div>

        <div className="space-y-14 md:space-y-20">
          {PILLARS.map((pillar) => (
            <section key={pillar.id}>
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

                  return (
                    <motion.div
                      key={svc.name}
                      initial={{ opacity: 0, y: 24 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: '-40px' }}
                      transition={{ duration: 0.4, delay: idx * 0.1 }}
                      className="glass-card group cursor-default p-5 transition-all duration-500 md:p-6"
                      style={{
                        boxShadow: isHovered
                          ? isAi
                            ? '0 0 30px hsl(280 99% 53% / 0.3), 0 0 60px hsl(280 99% 53% / 0.1)'
                            : '0 0 30px hsl(184 100% 50% / 0.3), 0 0 60px hsl(184 100% 50% / 0.1)'
                          : 'none',
                      }}
                      onMouseEnter={() => setHoveredCard(cardKey)}
                      onMouseLeave={() => setHoveredCard(null)}
                    >
                      <h3 className={`mb-2 font-mono text-base font-semibold transition-colors duration-300 ${
                        isHovered
                          ? isAi ? 'text-neon-purple' : 'text-neon-blue'
                          : 'text-foreground'
                      }`}>
                        {svc.name}
                      </h3>
                      <p className="text-sm leading-relaxed text-muted-foreground">{svc.desc}</p>
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
