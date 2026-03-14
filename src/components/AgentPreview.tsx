import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { AGENTS } from '@/lib/constants';

const ease = [0.25, 0.1, 0.25, 1] as const;

const AgentPreview = () => (
  <div>
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, ease }}
    >
      <h2 className="mb-2 font-mono text-2xl font-bold text-foreground md:text-3xl">Our Agents</h2>
      <p className="mb-6 text-sm text-muted-foreground">Autonomous AI agents working 24/7 for your brand.</p>
    </motion.div>

    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
      {AGENTS.map((agent, i) => (
        <motion.div
          key={agent.name}
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: i * 0.08, ease }}
          whileHover={{ y: -4 }}
        >
          <Link
            to="/ai"
            className="glass-card group flex items-center gap-3 p-4 transition-all duration-300"
          >
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span
                className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
                style={{ background: `hsl(${agent.glowHsl})` }}
              />
              <span
                className="relative inline-flex h-2.5 w-2.5 rounded-full"
                style={{ background: `hsl(${agent.glowHsl})` }}
              />
            </span>
            <div className="min-w-0">
              <p className="font-mono text-sm font-semibold text-foreground">{agent.name}</p>
              <p className="truncate text-xs text-muted-foreground">{agent.role}</p>
            </div>
          </Link>
        </motion.div>
      ))}
    </div>
  </div>
);

export default AgentPreview;
