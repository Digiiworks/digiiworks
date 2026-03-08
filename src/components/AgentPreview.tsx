import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { AGENTS } from '@/lib/constants';

const AgentPreview = () => (
  <div>
    <div className="mb-5 flex items-center gap-3">
      <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">// agents_online</span>
      <div className="h-px flex-1 bg-border" />
    </div>
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
      {AGENTS.map((agent, i) => (
        <motion.div
          key={agent.name}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.35, delay: i * 0.1 }}
        >
          <Link
            to="/ai"
            className="glass-card group flex items-center gap-3 p-4 transition-all duration-300 hover:scale-[1.03]"
            style={{ boxShadow: `0 0 20px hsl(${agent.glowHsl} / 0.08)` }}
          >
            <span
              className="relative flex h-2.5 w-2.5 shrink-0"
            >
              <span
                className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
                style={{ background: `hsl(${agent.glowHsl})` }}
              />
              <span
                className="relative inline-flex h-2.5 w-2.5 rounded-full"
                style={{
                  background: `hsl(${agent.glowHsl})`,
                  boxShadow: `0 0 6px hsl(${agent.glowHsl} / 0.8)`,
                }}
              />
            </span>
            <div className="min-w-0">
              <p className={`font-mono text-sm font-semibold ${agent.color}`}>{agent.name}</p>
              <p className="truncate text-xs text-muted-foreground">{agent.role}</p>
            </div>
          </Link>
        </motion.div>
      ))}
    </div>
  </div>
);

export default AgentPreview;
