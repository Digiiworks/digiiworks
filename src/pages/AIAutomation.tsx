import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import AgencyPulse from '@/components/AgencyPulse';
import Breadcrumbs from '@/components/Breadcrumbs';
import { AGENTS, CONNECTOR_APPS } from '@/lib/constants';

const AIJsonLd = () => (
  <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "AI Automation — Digiiworks",
    "url": "https://digiiworks.co/ai",
    "description": "Human Creativity. Autonomous Execution. Our AI agents run 24/7 — handling SEO, content, lead qualification, and infrastructure.",
    "publisher": {
      "@type": "Organization",
      "name": "Digiiworks",
      "url": "https://digiiworks.co"
    }
  }) }} />
);

const AIAutomation = () => (
  <div className="relative min-h-screen">
    <AIJsonLd />
    <div className="absolute inset-0 grid-overlay opacity-20" />
    <div className="relative mx-auto max-w-6xl px-6 py-16 md:py-20">

      <Breadcrumbs items={[{ label: 'AI Automation' }]} />

      {/* Hero */}
      <div className="mb-16 text-center md:mb-20">
        <p className="font-mono text-xs uppercase tracking-widest mb-3 text-muted-foreground">// pillar_03 :: autonomous_agency</p>
        <h1 className="mb-6 font-mono text-3xl font-bold leading-tight md:text-6xl">
          <span className="text-foreground">Human Creativity.</span>
          <br />
          <span className="text-gradient">Autonomous Execution.</span>
        </h1>
        <p className="mx-auto max-w-2xl text-base text-muted-foreground md:text-lg">
          Our AI agents run 24/7 — handling SEO, content, lead qualification, and infrastructure so you can focus on what matters.
        </p>
      </div>

      {/* n8n Workflow Engineering */}
      <section className="mb-16 md:mb-24">
        <div className="mb-6 flex items-center gap-3 md:mb-8">
          <span className="font-mono text-xs uppercase tracking-widest text-neon-blue">Section 01</span>
          <div className="h-px flex-1 bg-border" />
          <h2 className="font-mono text-xl font-semibold md:text-2xl">n8n Workflow Engineering</h2>
        </div>

        <div className="glass-card p-6 md:p-8">
          <p className="mb-6 text-muted-foreground max-w-2xl md:mb-8">
            We design zero-touch workflows that connect your entire tech stack. Data flows automatically between your tools — no copy-pasting, no manual handoffs, no dropped balls.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3">
            {CONNECTOR_APPS.map((app, i) => (
              <div key={app} className="flex items-center gap-2 md:gap-3">
                <div className="glass-card px-3 py-1.5 transition-all duration-300 hover:glow-blue md:px-4 md:py-2">
                  <span className="font-mono text-xs text-foreground md:text-sm">{app}</span>
                </div>
                {i < CONNECTOR_APPS.length - 1 && (
                  <span className="hidden font-mono text-neon-blue text-lg sm:inline">→</span>
                )}
              </div>
            ))}
          </div>

          <p className="mt-4 text-center font-mono text-xs uppercase tracking-widest text-neon-blue md:mt-6">
            All connected. All automated. Zero manual effort.
          </p>
        </div>
      </section>

      {/* Agent Cards */}
      <section className="mb-16 md:mb-24">
        <div className="mb-6 flex items-center gap-3 md:mb-8">
          <span className="font-mono text-xs uppercase tracking-widest text-neon-purple">Section 02</span>
          <div className="h-px flex-1 bg-border" />
          <h2 className="font-mono text-xl font-semibold md:text-2xl">Meet the Agents</h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 md:gap-6">
          {AGENTS.map((agent, i) => (
            <motion.div
              key={agent.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="glass-card group p-5 transition-all duration-500 md:p-6"
              style={{ boxShadow: `0 0 25px hsl(${agent.glowHsl} / 0.15)` }}
            >
              <div className="mb-3 flex items-center gap-3">
                <span className="relative flex h-2 w-2">
                  <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${agent.bgColor}`} />
                  <span className={`relative inline-flex h-2 w-2 rounded-full ${agent.bgColor}`} />
                </span>
                <span className={`font-mono text-lg font-bold ${agent.color}`}>{agent.name}</span>
                <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">{agent.role}</span>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">{agent.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Live Pulse */}
      <section className="mb-16 md:mb-24">
        <div className="mb-6 flex items-center gap-3 md:mb-8">
          <span className="font-mono text-xs uppercase tracking-widest text-neon-mint">Section 03</span>
          <div className="h-px flex-1 bg-border" />
          <h2 className="font-mono text-xl font-semibold md:text-2xl">Live Agency Pulse</h2>
        </div>
        <AgencyPulse />
      </section>

      {/* CTA */}
      <div className="text-center">
        <Link
          to="/contact"
          className="inline-block glow-purple rounded-lg bg-secondary px-8 py-3 font-mono font-semibold text-secondary-foreground transition-all duration-300 hover:bg-secondary/90 md:px-10 md:py-4"
        >
          Initialize Consultation →
        </Link>
      </div>
    </div>
  </div>
);

export default AIAutomation;
