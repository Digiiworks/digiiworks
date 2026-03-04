import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import AgencyPulse from '@/components/AgencyPulse';

const pillars = [
  {
    title: 'Digital Architecture',
    description: 'Custom Web Development, Responsive Design, UX/UI, CMS Integration, and the Rent-A-Website model.',
    glowStyle: { boxShadow: '0 0 25px hsl(184 100% 50% / 0.1)' } as React.CSSProperties,
    labelColor: 'text-neon-blue',
    link: '/services',
  },
  {
    title: 'Growth Engine',
    description: 'Data-Driven SEO, Performance Optimization, Google & Social Media Ads, and Market Research.',
    glowStyle: { boxShadow: '0 0 25px hsl(184 100% 50% / 0.1)' } as React.CSSProperties,
    labelColor: 'text-neon-blue',
    link: '/services',
  },
  {
    title: 'Autonomous Agency',
    description: 'AI-Powered Social Media, n8n Workflow Automation, and Content Strategy by Vantage & Pixel.',
    glowStyle: { boxShadow: '0 0 25px hsl(280 99% 53% / 0.1)' } as React.CSSProperties,
    labelColor: 'text-neon-purple',
    link: '/ai',
  },
];

const Index = () => (
  <div className="relative min-h-[calc(100vh-65px)] overflow-hidden">
    {/* Grid background */}
    <div className="absolute inset-0 grid-overlay" style={{ animation: 'data-stream 8s linear infinite' }} />
    <div className="absolute inset-0 bg-gradient-to-b from-background/0 via-background/50 to-background" />

    <div className="relative mx-auto max-w-6xl px-6 py-24">
      {/* Hero */}
      <div className="mb-20 text-center">
        <p className="font-mono-label mb-4 text-muted-foreground">// autonomous digital agency</p>
        <h1 className="mb-6 font-mono text-5xl font-bold leading-tight md:text-7xl">
          <span className="text-gradient">Build. Automate.</span>
          <br />
          <span className="text-foreground">Dominate.</span>
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
          Three pillars. One agency. Everything your brand needs to grow, scale, and run on autopilot.
        </p>

        <div className="mt-10 flex justify-center gap-4">
          <Button asChild className="glow-blue bg-primary text-primary-foreground font-mono hover:bg-primary/90 px-8 py-3">
            <Link to="/services">Explore Services</Link>
          </Button>
          <Button variant="outline" asChild className="font-mono border-border hover:border-primary/50 hover:text-primary px-8 py-3">
            <Link to="/contact">Get in Touch</Link>
          </Button>
        </div>
      </div>

      {/* Pillar Cards */}
      <div className="mb-16 grid gap-6 md:grid-cols-3">
        {pillars.map((pillar, i) => (
          <Link
            key={pillar.title}
            to={pillar.link}
            className="glass-card group p-6 transition-all duration-500 hover:scale-[1.02]"
            style={pillar.glowStyle}
          >
            <span className={`font-mono-label ${pillar.labelColor} mb-3 block`}>
              Pillar {String(i + 1).padStart(2, '0')}
            </span>
            <h3 className="mb-3 font-mono text-xl font-semibold text-foreground">
              {pillar.title}
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {pillar.description}
            </p>
          </Link>
        ))}
      </div>

      {/* Live Pulse on Homepage */}
      <div className="mx-auto max-w-2xl">
        <AgencyPulse />
      </div>
    </div>
  </div>
);

export default Index;
