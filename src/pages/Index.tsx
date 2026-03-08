import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Code2, TrendingUp, Bot, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AgencyPulse from '@/components/AgencyPulse';
import ConstellationBg from '@/components/ConstellationBg';
import HeroOrbs from '@/components/HeroOrbs';
import StatsBar from '@/components/StatsBar';
import TechMarquee from '@/components/TechMarquee';
import AgentPreview from '@/components/AgentPreview';
import LatestArticles from '@/components/LatestArticles';
import { PILLARS } from '@/lib/constants';

const PILLAR_ICONS: Record<string, React.ReactNode> = {
  architecture: <Code2 className="h-5 w-5" />,
  growth: <TrendingUp className="h-5 w-5" />,
  autonomous: <Bot className="h-5 w-5" />,
};

const Index = () => (
  <div className="relative min-h-[calc(100vh-65px)] overflow-hidden">
    <ConstellationBg />
    <HeroOrbs />
    <div className="absolute inset-0 grid-overlay" style={{ animation: 'data-stream 8s linear infinite' }} />
    <div className="absolute inset-0 bg-gradient-to-b from-background/0 via-background/30 to-background" />

    <div className="relative mx-auto max-w-6xl px-6 py-16 md:py-24">
      {/* Hero */}
      <motion.div
        className="mb-12 text-center md:mb-16"
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
        <p className="mx-auto max-w-2xl text-base text-muted-foreground md:text-lg lg:text-xl">
          Three pillars. One agency. Everything your brand needs to grow, scale, and run on autopilot.
        </p>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-4 md:mt-10">
          <Button asChild className="w-full sm:w-auto glow-blue bg-primary text-primary-foreground font-mono hover:bg-primary/90 px-8 py-3">
            <Link to="/services">Explore Services</Link>
          </Button>
          <Button variant="outline" asChild className="w-full sm:w-auto font-mono border-border hover:border-primary/50 hover:text-primary px-8 py-3">
            <Link to="/get-started">Get Started</Link>
          </Button>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="mb-14 md:mb-20">
        <StatsBar />
      </div>

      {/* Pillar Cards */}
      <div className="mb-4 flex items-center gap-3 md:mb-6">
        <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">// core_services</span>
        <div className="h-px flex-1 bg-border" />
      </div>
      <div className="mb-14 grid gap-4 sm:grid-cols-2 md:mb-20 md:grid-cols-3 md:gap-6">
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
              className="glass-card group relative block overflow-hidden p-5 transition-all duration-500 hover:scale-[1.02] md:p-6"
              style={{ boxShadow: `0 0 25px hsl(${pillar.glowHsl} / 0.1)` }}
            >
              {/* Colored top accent */}
              <div
                className="absolute inset-x-0 top-0 h-[2px]"
                style={{ background: `hsl(${pillar.glowHsl})`, boxShadow: `0 0 12px hsl(${pillar.glowHsl} / 0.5)` }}
              />

              <div className="mb-3 flex items-center justify-between">
                <span className={`font-mono text-xs uppercase tracking-widest ${pillar.accentColor}`}>
                  {pillar.label}
                </span>
                <span className={pillar.accentColor}>
                  {PILLAR_ICONS[pillar.id]}
                </span>
              </div>

              <h3 className="mb-3 font-mono text-lg font-semibold text-foreground md:text-xl">
                {pillar.title}
              </h3>
              <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
                {pillar.description}
              </p>

              <div className="flex items-center gap-1 text-xs font-mono text-muted-foreground transition-colors group-hover:text-primary">
                <span>Explore</span>
                <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Tech Marquee */}
      <div className="mb-14 md:mb-20">
        <TechMarquee />
      </div>

      {/* Agent Preview */}
      <div className="mb-14 md:mb-20">
        <AgentPreview />
      </div>

      {/* Latest Articles */}
      <div className="mb-14 md:mb-20">
        <div className="mb-4 flex items-center gap-3 md:mb-6">
          <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">// latest_articles</span>
          <div className="h-px flex-1 bg-border" />
          <Link to="/blog" className="font-mono text-xs text-primary hover:underline">View all →</Link>
        </div>
        <LatestArticles />
      </div>

      {/* Live Pulse */}
      <div className="mx-auto max-w-2xl">
        <div className="mb-4 flex items-center gap-3">
          <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">// live_feed</span>
          <div className="h-px flex-1 bg-border" />
        </div>
        <AgencyPulse />
      </div>
    </div>
  </div>
);

export default Index;
