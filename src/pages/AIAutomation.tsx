import { Link } from 'react-router-dom';
import AgencyPulse from '@/components/AgencyPulse';

const agents = [
  {
    name: 'Dex',
    role: 'AI Concierge',
    desc: '24/7 lead qualification, scheduling, and client onboarding. Dex never sleeps — it handles first-touch conversations, qualifies prospects, and books meetings while you focus on delivery.',
    color: 'text-neon-mint',
    glowStyle: { boxShadow: '0 0 25px hsl(106 100% 55% / 0.15)' },
  },
  {
    name: 'Vantage',
    role: 'Autonomous SEO',
    desc: 'Monitors search trends, competitor movements, and algorithm shifts in real-time. Vantage feeds insights to Pixel so your content stays ahead of the curve — every single day.',
    color: 'text-neon-blue',
    glowStyle: { boxShadow: '0 0 25px hsl(184 100% 50% / 0.15)' },
  },
  {
    name: 'Pixel',
    role: 'Creative Engine',
    desc: 'Generates social media assets, blog visuals, and marketing collateral on demand. Pixel turns Vantage\'s data into scroll-stopping content — no human bottleneck required.',
    color: 'text-neon-purple',
    glowStyle: { boxShadow: '0 0 25px hsl(280 99% 53% / 0.15)' },
  },
  {
    name: 'Forge',
    role: 'Infrastructure',
    desc: 'Manages deployments, server health, and system updates across your entire stack. Forge keeps the lights on so your team can focus on growth.',
    color: 'text-neon-blue',
    glowStyle: { boxShadow: '0 0 25px hsl(184 100% 50% / 0.15)' },
  },
];

const connectorApps = ['Slack', 'Gmail', 'HubSpot', 'Notion', 'Google Sheets', 'Stripe'];

const AIAutomation = () => (
  <div className="relative min-h-screen">
    <div className="absolute inset-0 grid-overlay opacity-20" />
    <div className="relative mx-auto max-w-6xl px-6 py-20">

      {/* Hero */}
      <div className="mb-20 text-center">
        <p className="font-mono-label mb-3 text-muted-foreground">// pillar_03 :: autonomous_agency</p>
        <h1 className="mb-6 font-mono text-4xl font-bold leading-tight md:text-6xl">
          <span className="text-foreground">Human Creativity.</span>
          <br />
          <span className="text-gradient">Autonomous Execution.</span>
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
          Our AI agents run 24/7 — handling SEO, content, lead qualification, and infrastructure so you can focus on what matters.
        </p>
      </div>

      {/* n8n Workflow Engineering */}
      <section className="mb-24">
        <div className="mb-8 flex items-center gap-3">
          <span className="font-mono-label text-neon-blue">Section 01</span>
          <div className="h-px flex-1 bg-border" />
          <h2 className="font-mono text-2xl font-semibold">n8n Workflow Engineering</h2>
        </div>

        <div className="glass-card p-8">
          <p className="mb-8 text-muted-foreground max-w-2xl">
            We design zero-touch workflows that connect your entire tech stack. Data flows automatically between your tools — no copy-pasting, no manual handoffs, no dropped balls.
          </p>

          {/* Connector visual */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            {connectorApps.map((app, i) => (
              <div key={app} className="flex items-center gap-3">
                <div className="glass-card px-4 py-2 transition-all duration-300 hover:glow-blue">
                  <span className="font-mono text-sm text-foreground">{app}</span>
                </div>
                {i < connectorApps.length - 1 && (
                  <span className="font-mono text-neon-blue text-lg">→</span>
                )}
              </div>
            ))}
          </div>

          <p className="mt-6 text-center font-mono-label text-neon-blue">
            All connected. All automated. Zero manual effort.
          </p>
        </div>
      </section>

      {/* Agent Cards */}
      <section className="mb-24">
        <div className="mb-8 flex items-center gap-3">
          <span className="font-mono-label text-neon-purple">Section 02</span>
          <div className="h-px flex-1 bg-border" />
          <h2 className="font-mono text-2xl font-semibold">Meet the Agents</h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {agents.map((agent) => (
            <div
              key={agent.name}
              className="glass-card group p-6 transition-all duration-500"
              style={agent.glowStyle}
            >
              <div className="mb-3 flex items-center gap-3">
                <span className="relative flex h-2 w-2">
                  <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${
                    agent.color === 'text-neon-mint' ? 'bg-neon-mint' :
                    agent.color === 'text-neon-purple' ? 'bg-neon-purple' : 'bg-neon-blue'
                  }`} />
                  <span className={`relative inline-flex h-2 w-2 rounded-full ${
                    agent.color === 'text-neon-mint' ? 'bg-neon-mint' :
                    agent.color === 'text-neon-purple' ? 'bg-neon-purple' : 'bg-neon-blue'
                  }`} />
                </span>
                <span className={`font-mono text-lg font-bold ${agent.color}`}>{agent.name}</span>
                <span className="font-mono-label text-muted-foreground">{agent.role}</span>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">{agent.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Live Pulse */}
      <section className="mb-24">
        <div className="mb-8 flex items-center gap-3">
          <span className="font-mono-label text-neon-mint">Section 03</span>
          <div className="h-px flex-1 bg-border" />
          <h2 className="font-mono text-2xl font-semibold">Live Agency Pulse</h2>
        </div>
        <AgencyPulse />
      </section>

      {/* CTA */}
      <div className="text-center">
        <Link
          to="/contact"
          className="inline-block glow-purple rounded-lg bg-secondary px-10 py-4 font-mono font-semibold text-secondary-foreground transition-all duration-300 hover:bg-secondary/90"
        >
          Initialize Consultation →
        </Link>
      </div>
    </div>
  </div>
);

export default AIAutomation;
