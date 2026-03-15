import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Code2, TrendingUp, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';

import StatsBar from '@/components/StatsBar';
import TechMarquee from '@/components/TechMarquee';
import AgentPreview from '@/components/AgentPreview';
import LatestArticles from '@/components/LatestArticles';
import LazySection from '@/components/LazySection';
import { PILLARS } from '@/lib/constants';

const ease = [0.25, 0.1, 0.25, 1] as const;

const PILLAR_ICONS: Record<string, React.ReactNode> = {
  architecture: <Code2 className="h-5 w-5" />,
  growth: <TrendingUp className="h-5 w-5" />,
  autonomous: <Bot className="h-5 w-5" />,
};

const Index = () => (
  <div className="relative min-h-screen">
    

    {/* ── HERO ── */}
    <section className="relative z-10 flex min-h-[90vh] items-center justify-center px-6 pt-20 sm:pt-16">
      <motion.div
        className="mx-auto max-w-4xl text-center"
        initial="hidden"
        animate="visible"
        variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.18 } } }}
      >
        <motion.span
          className="section-label inline-block mb-5"
          variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease } } }}
        >
          Autonomous Digital Agency
        </motion.span>

        <motion.h1
          className="mb-8 font-mono text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl md:text-8xl"
          variants={{ hidden: { opacity: 0, y: 50 }, visible: { opacity: 1, y: 0, transition: { duration: 0.9, ease } } }}
        >
          <span className="text-gradient">Build. Automate.</span>
          <br />
          <span className="text-foreground">Dominate.</span>
        </motion.h1>

        <motion.p
          className="mx-auto mb-12 max-w-xl text-base leading-relaxed text-foreground/80 md:text-lg drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
          variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease } } }}
        >
          Three pillars. One agency. Based in South Africa, serving clients globally. Everything your brand needs to grow, scale, and run on autopilot.
        </motion.p>

        <motion.div
          className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
          variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease } } }}
        >
          <Button
            asChild
            size="lg"
            className="bg-primary text-primary-foreground font-mono text-sm hover:bg-primary/90 px-10 py-6 rounded-xl transition-all duration-300 hover:shadow-[0_0_40px_hsl(175_100%_42%/0.3)] hover:scale-[1.02]"
          >
            <Link to="/get-started">Get Started</Link>
          </Button>
          <Button
            variant="outline"
            size="lg"
            asChild
            className="font-mono text-sm border-border/50 text-muted-foreground hover:text-foreground hover:border-primary/30 px-10 py-6 rounded-xl group"
          >
            <Link to="/services">
              Explore Services
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
        </motion.div>

        {/* Trust line */}
        <motion.p
          className="mt-10 text-xs text-muted-foreground/50 font-mono tracking-wider"
          variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0.8, delay: 0.5, ease } } }}
        >
          Trusted by 50+ brands worldwide
        </motion.p>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 0.8 }}
      >
        <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground/40">Scroll</span>
        <motion.div
          className="w-5 h-8 rounded-full border border-border/40 flex items-start justify-center p-1"
          animate={{ borderColor: ['hsl(var(--border) / 0.4)', 'hsl(var(--primary) / 0.3)', 'hsl(var(--border) / 0.4)'] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          <motion.div
            className="w-1 h-1.5 rounded-full bg-primary/60"
            animate={{ y: [0, 12, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
        </motion.div>
      </motion.div>
    </section>

    {/* Content sections — elevated above fixed bg */}
    <div className="relative z-10">
      <div className="mx-auto max-w-6xl px-6 py-14 md:py-20 space-y-16 md:space-y-22">

        {/* ── STATS ── */}
        <StatsBar />

        {/* ── SERVICES ── */}
        <LazySection>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6, ease }}
          >
            <span className="section-label">Core Services</span>
            <h2 className="section-title">What We Do</h2>
            <p className="section-subtitle">End-to-end digital services across three pillars — from code to growth to full autonomy.</p>
          </motion.div>

          <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3">
            {PILLARS.map((pillar, i) => (
              <motion.div
                key={pillar.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.5, delay: i * 0.1, ease }}
                whileHover={{ y: -6, transition: { duration: 0.3 } }}
              >
                <Link to={pillar.link} className="glass-card group block p-6 md:p-7 h-full">
                  {/* Icon */}
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    {PILLAR_ICONS[pillar.id]}
                  </div>

                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    {pillar.label}
                  </span>
                  <h3 className="mt-1.5 mb-3 font-mono text-lg font-bold text-foreground md:text-xl">
                    {pillar.title}
                  </h3>
                  <p className="mb-5 text-sm leading-relaxed text-muted-foreground">
                    {pillar.description}
                  </p>
                  <span className="inline-flex items-center gap-1.5 text-xs font-mono text-primary/70 transition-all duration-300 group-hover:text-primary group-hover:gap-2">
                    Learn more <ArrowRight className="h-3 w-3" />
                  </span>
                </Link>
              </motion.div>
            ))}
          </div>
        </LazySection>

        {/* ── ARTICLES ── */}
        <LazySection>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6, ease }}
            className="mb-8 flex items-end justify-between"
          >
            <div>
              <span className="section-label">From the Blog</span>
              <h2 className="section-title">Latest Articles</h2>
            </div>
            <Link to="/blog" className="font-mono text-sm text-primary hover:text-primary/80 transition-colors group flex items-center gap-1">
              View all <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </motion.div>
          <LatestArticles />
        </LazySection>

        {/* ── AGENTS ── */}
        <LazySection>
          <AgentPreview />
        </LazySection>

        {/* ── TECH MARQUEE ── */}
        <LazySection>
          <TechMarquee />
        </LazySection>

        {/* ── CTA ── */}
        <LazySection>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease }}
            className="glass-card relative overflow-hidden p-10 md:p-16 text-center"
          >
            <div
              className="absolute -top-20 left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full pointer-events-none"
              style={{ background: 'radial-gradient(circle, hsl(175 100% 42% / 0.08), transparent 70%)' }}
            />
            <h2 className="relative font-mono text-2xl font-bold text-foreground md:text-4xl mb-4">
              Ready to <span className="text-gradient">automate</span> your growth?
            </h2>
            <p className="relative mx-auto max-w-md text-sm text-muted-foreground mb-8">
              Let's build something that works while you sleep. Start with a free consultation.
            </p>
            <Button
              asChild
              size="lg"
              className="relative bg-primary text-primary-foreground font-mono text-sm hover:bg-primary/90 px-10 py-6 rounded-xl transition-all duration-300 hover:shadow-[0_0_40px_hsl(175_100%_42%/0.25)] hover:scale-[1.02]"
            >
              <Link to="/get-started">Get Started →</Link>
            </Button>
          </motion.div>
        </LazySection>
      </div>
    </div>
  </div>
);

export default Index;
