import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { AGENTS } from '@/lib/constants';
import { ArrowRight } from 'lucide-react';

const ease = [0.25, 0.1, 0.25, 1] as const;

const AgentPreview = () => (
  <div>
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, ease }}
    >
      <span className="section-label">AI Workforce</span>
      <h2 className="section-title">Our Agents</h2>
      <p className="section-subtitle">Autonomous AI agents working around the clock for your brand.</p>
    </motion.div>

    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
      {AGENTS.map((agent, i) => (
        <motion.div
          key={agent.name}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45, delay: i * 0.08, ease }}
          whileHover={{ y: -6, transition: { duration: 0.3 } }}
        >
          <Link to="/ai" className="glass-card group flex flex-col p-5 h-full">
            {/* Status dot + name */}
            <div className="flex items-center gap-2.5 mb-3">
              <span className="relative flex h-2 w-2 shrink-0">
                <span
                  className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-50"
                  style={{ background: `hsl(${agent.glowHsl})` }}
                />
                <span
                  className="relative inline-flex h-2 w-2 rounded-full"
                  style={{ background: `hsl(${agent.glowHsl})` }}
                />
              </span>
              <span className="font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground">Online</span>
            </div>

            <h3 className="font-mono text-base font-bold text-foreground mb-1">{agent.name}</h3>
            <p className="text-xs text-muted-foreground mb-4 flex-1">{agent.role}</p>

            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-primary/60 group-hover:text-primary transition-colors">
              Details <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        </motion.div>
      ))}
    </div>
  </div>
);

export default AgentPreview;
