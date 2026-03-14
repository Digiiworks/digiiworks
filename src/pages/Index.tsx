import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import InteractiveHeroBg from '@/components/InteractiveHeroBg';
import StatsBar from '@/components/StatsBar';
import TechMarquee from '@/components/TechMarquee';
import AgentPreview from '@/components/AgentPreview';
import LatestArticles from '@/components/LatestArticles';
import LazySection from '@/components/LazySection';
import AgencyPulse from '@/components/AgencyPulse';
import { PILLARS } from '@/lib/constants';

const ease = [0.25, 0.1, 0.25, 1] as const;

const PILLAR_ACCENTS: Record<string, string> = {
  architecture: 'border-l-[hsl(210,100%,65%)]',
  growth: 'border-l-[hsl(330,85%,65%)]',
  autonomous: 'border-l-[hsl(280,80%,60%)]',
};

const Index = () => (
  <div className="relative min-h-screen">
    {/* Fixed interactive background */}
    <InteractiveHeroBg />

    <div className="relative mx-auto max-w-6xl px-6 pt-20 pb-16 md:pt-32 md:pb-24">
      {/* Hero */}
      <motion.section
        className="mb-20 text-center md:mb-28"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.15 } },
        }}
      >
        <motion.h1
          className="mb-6 font-mono text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl md:text-7xl"
          variants={{ hidden: { opacity: 0, y: 40 }, visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease } } }}
        >
          <span className="text-gradient">Build. Automate.</span>
          <br />
          <span className="text-foreground">Dominate.</span>
        </motion.h1>

        <motion.p
          className="mx-auto mb-10 max-w-lg text-base text-muted-foreground md:text-lg"
          variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease } } }}
        >
          Three pillars. One agency. Everything your brand needs to grow, scale, and run on autopilot.
        </motion.p>

        <motion.div
          className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-4"
          variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease } } }}
        >
          <Button
            asChild
            className="w-full sm:w-auto bg-primary text-primary-foreground font-mono hover:bg-primary/90 px-8 py-3 transition-shadow hover:shadow-[0_0_30px_hsl(330_85%_65%/0.25)]"
          >
            <Link to="/get-started">Get Started</Link>
          </Button>
          <Button variant="ghost" asChild className="w-full sm:w-auto font-mono text-muted-foreground hover:text-foreground px-8 py-3 group">
            <Link to="/services">
              Explore Services
              <ArrowRight className="ml-1.5 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
        </motion.div>
      </motion.section>

      {/* Stats */}
      <section className="mb-20 md:mb-28">
        <StatsBar />
      </section>

      {/* Services */}
      <LazySection className="mb-20 md:mb-28">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6, ease }}
        >
          <h2 className="mb-2 font-mono text-2xl font-bold text-foreground md:text-3xl">What We Do</h2>
          <p className="mb-8 text-sm text-muted-foreground max-w-md">End-to-end digital services across three pillars.</p>
        </motion.div>

        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 md:gap-5">
          {PILLARS.map((pillar, i) => (
            <motion.div
              key={pillar.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.5, delay: i * 0.12, ease }}
              whileHover={{ y: -4 }}
            >
              <Link
                to={pillar.link}
                className={`glass-card group block p-5 md:p-6 border-l-[3px] ${PILLAR_ACCENTS[pillar.id] || ''}`}
              >
                <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                  {pillar.label}
                </span>
                <h3 className="mt-2 mb-3 font-mono text-lg font-semibold text-foreground md:text-xl">
                  {pillar.title}
                </h3>
                <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
                  {pillar.description}
                </p>
                <span className="inline-flex items-center gap-1 text-xs font-mono text-muted-foreground transition-colors group-hover:text-primary">
                  Explore <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      </LazySection>

      {/* Tech Marquee */}
      <LazySection className="mb-20 md:mb-28">
        <TechMarquee />
      </LazySection>

      {/* Agents */}
      <LazySection className="mb-20 md:mb-28">
        <AgentPreview />
      </LazySection>

      {/* Latest Articles */}
      <LazySection className="mb-20 md:mb-28">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6, ease }}
          className="mb-6 flex items-center justify-between"
        >
          <h2 className="font-mono text-2xl font-bold text-foreground md:text-3xl">Latest Articles</h2>
          <Link to="/blog" className="font-mono text-sm text-primary hover:underline">
            View all →
          </Link>
        </motion.div>
        <LatestArticles />
      </LazySection>

      {/* Agency Pulse */}
      <LazySection className="mx-auto max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease }}
        >
          <h2 className="mb-4 font-mono text-lg font-semibold text-foreground">Live Agent Feed</h2>
          <AgencyPulse />
        </motion.div>
      </LazySection>
    </div>
  </div>
);

export default Index;
