import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import AgencyPulse from '@/components/AgencyPulse';
import ConstellationBg from '@/components/ConstellationBg';
import { PILLARS } from '@/lib/constants';

const Index = () => (
  <div className="relative min-h-[calc(100vh-65px)] overflow-hidden">
    <ConstellationBg />
    <div className="absolute inset-0 grid-overlay" style={{ animation: 'data-stream 8s linear infinite' }} />
    <div className="absolute inset-0 bg-gradient-to-b from-background/0 via-background/30 to-background" />

    <div className="relative mx-auto max-w-6xl px-6 py-16 md:py-24">
      {/* Hero */}
      <motion.div
        className="mb-16 text-center md:mb-20"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <p className="font-mono text-xs uppercase tracking-widest mb-4 text-muted-foreground">// autonomous digital agency</p>
        <h1 className="mb-6 font-mono text-4xl font-bold leading-tight md:text-7xl">
          <span className="text-gradient">Build. Automate.</span>
          <br />
          <span className="text-foreground">Dominate.</span>
        </h1>
        <p className="mx-auto max-w-2xl text-base text-muted-foreground md:text-lg">
          Three pillars. One agency. Everything your brand needs to grow, scale, and run on autopilot.
        </p>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-4 md:mt-10">
          <Button asChild className="w-full sm:w-auto glow-blue bg-primary text-primary-foreground font-mono hover:bg-primary/90 px-8 py-3">
            <Link to="/services">Explore Services</Link>
          </Button>
          <Button variant="outline" asChild className="w-full sm:w-auto font-mono border-border hover:border-primary/50 hover:text-primary px-8 py-3">
            <Link to="/contact">Get in Touch</Link>
          </Button>
        </div>
      </motion.div>

      {/* Pillar Cards */}
      <div className="mb-12 grid gap-4 sm:grid-cols-2 md:mb-16 md:grid-cols-3 md:gap-6">
        {PILLARS.map((pillar, i) => (
          <motion.div
            key={pillar.title}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.4, delay: i * 0.15 }}
          >
            <Link
              to={pillar.link}
              className="glass-card group block p-5 transition-all duration-500 hover:scale-[1.02] md:p-6"
              style={{ boxShadow: `0 0 25px hsl(${pillar.glowHsl} / 0.1)` }}
            >
              <span className={`font-mono text-xs uppercase tracking-widest ${pillar.accentColor} mb-3 block`}>
                {pillar.label}
              </span>
              <h3 className="mb-3 font-mono text-lg font-semibold text-foreground md:text-xl">
                {pillar.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {pillar.description}
              </p>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Live Pulse */}
      <div className="mx-auto max-w-2xl">
        <AgencyPulse />
      </div>
    </div>
  </div>
);

export default Index;
