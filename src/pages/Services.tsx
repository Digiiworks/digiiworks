import { useState } from 'react';

type PillarType = 'architecture' | 'growth' | 'autonomous';

interface Service {
  name: string;
  desc: string;
}

interface Pillar {
  id: PillarType;
  title: string;
  label: string;
  accentColor: string;
  glowClass: string;
  services: Service[];
}

const pillars: Pillar[] = [
  {
    id: 'architecture',
    title: 'Digital Architecture',
    label: 'Pillar 01',
    accentColor: 'text-neon-blue',
    glowClass: 'glow-blue',
    services: [
      { name: 'Custom Web Development', desc: 'Bespoke websites built from the ground up to match your vision.' },
      { name: 'Responsive Design', desc: 'Pixel-perfect experiences across every device and screen size.' },
      { name: 'UX/UI Design', desc: 'Intuitive interfaces designed around user behavior and business goals.' },
      { name: 'CMS Integration', desc: 'Headless or traditional CMS setups for effortless content management.' },
      { name: 'Rent-A-Website', desc: 'Professional site, zero upfront cost. Pay monthly, worry about nothing.' },
    ],
  },
  {
    id: 'growth',
    title: 'Growth Engine',
    label: 'Pillar 02',
    accentColor: 'text-neon-blue',
    glowClass: 'glow-blue',
    services: [
      { name: 'Data-Driven SEO', desc: 'Keyword strategy, technical audits, and content optimization for organic growth.' },
      { name: 'Performance Optimization', desc: 'Speed, Core Web Vitals, and server-level tuning for peak performance.' },
      { name: 'Google & Social Media Ads', desc: 'Targeted ad campaigns across Google, Meta, and beyond.' },
      { name: 'Market & Competitor Research', desc: 'Deep-dive analysis to find gaps and opportunities in your market.' },
    ],
  },
  {
    id: 'autonomous',
    title: 'Autonomous Agency',
    label: 'Pillar 03',
    accentColor: 'text-neon-purple',
    glowClass: 'glow-purple',
    services: [
      { name: 'AI-Powered Social Media', desc: 'Content creation and scheduling driven by AI agents.' },
      { name: 'n8n Workflow Automation', desc: 'Automate repetitive tasks across your entire tech stack.' },
      { name: 'Content Strategy', desc: 'Our agents Vantage & Pixel handle research, copywriting, and visuals.' },
    ],
  },
];

const Services = () => {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  return (
    <div className="relative min-h-screen">
      <div className="absolute inset-0 grid-overlay opacity-30" />
      <div className="relative mx-auto max-w-6xl px-6 py-20">
        <div className="mb-16 text-center">
          <p className="font-mono-label mb-3 text-muted-foreground">// service_catalog</p>
          <h1 className="font-mono text-4xl font-bold md:text-5xl">
            <span className="text-gradient">Our Services</span>
          </h1>
        </div>

        <div className="space-y-20">
          {pillars.map((pillar) => (
            <section key={pillar.id}>
              <div className="mb-8 flex items-center gap-3">
                <span className={`font-mono-label ${pillar.accentColor}`}>{pillar.label}</span>
                <div className="h-px flex-1 bg-border" />
                <h2 className="font-mono text-2xl font-semibold text-foreground">{pillar.title}</h2>
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {pillar.services.map((svc) => {
                  const cardKey = `${pillar.id}-${svc.name}`;
                  const isHovered = hoveredCard === cardKey;
                  const isAi = pillar.id === 'autonomous';

                  return (
                    <div
                      key={svc.name}
                      className="glass-card group cursor-default p-6 transition-all duration-500"
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
                    </div>
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
