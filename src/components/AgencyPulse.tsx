import { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { AGENT_TASKS } from '@/lib/constants';

const AGENT_ORDER = ['Dex', 'Vantage', 'Forge', 'Pixel', 'Dex'] as const;

const agentColors: Record<string, string> = {
  Dex: 'text-primary',
  Vantage: 'text-primary',
  Forge: 'text-secondary',
  Pixel: 'text-secondary',
};

const ease = [0.25, 0.1, 0.25, 1] as const;

interface RowState {
  taskIndex: number;
  charsTyped: number;
  fullText: string;
  doneTyping: boolean;
  rotateAt: number; // timestamp when to rotate
}

function randomDelay() {
  return 5000 + Math.random() * 10000; // 5-15s
}

function pickNewIndex(current: number, max: number) {
  let next: number;
  do {
    next = Math.floor(Math.random() * max);
  } while (next === current && max > 1);
  return next;
}

const AgencyPulse = () => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(0);
  const [rows, setRows] = useState<RowState[]>(() =>
    AGENT_ORDER.map((agent) => {
      const idx = 0;
      return {
        taskIndex: idx,
        charsTyped: 0,
        fullText: AGENT_TASKS[agent]?.[idx] ?? '',
        doneTyping: false,
        rotateAt: Date.now() + randomDelay(),
      };
    })
  );

  // Staggered reveal
  useEffect(() => {
    setVisibleCount(0);
    const interval = setInterval(() => {
      setVisibleCount((prev) => {
        if (prev >= AGENT_ORDER.length) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Typewriter + rotation tick
  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();
      setRows((prev) =>
        prev.map((row, i) => {
          // Not visible yet
          if (i >= visibleCount) return row;

          // Check rotation
          if (row.doneTyping && now >= row.rotateAt) {
            const agent = AGENT_ORDER[i];
            const tasks = AGENT_TASKS[agent] ?? [];
            const newIdx = pickNewIndex(row.taskIndex, tasks.length);
            return {
              taskIndex: newIdx,
              charsTyped: 0,
              fullText: tasks[newIdx] ?? '',
              doneTyping: false,
              rotateAt: now + randomDelay(),
            };
          }

          // Typewriter
          if (!row.doneTyping) {
            const next = row.charsTyped + 1;
            if (next > row.fullText.length) {
              return { ...row, doneTyping: true, charsTyped: row.fullText.length };
            }
            return { ...row, charsTyped: next };
          }

          return row;
        })
      );
    }, 30);
    return () => clearInterval(id);
  }, [visibleCount]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [visibleCount]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, ease }}
      className="glass-card overflow-hidden"
    >
      {/* Terminal header */}
      <div className="flex items-center gap-3 border-b border-border/30 px-5 py-3">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-destructive/50" />
          <span className="h-2.5 w-2.5 rounded-full bg-primary/30" />
          <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/20" />
        </div>
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60">live_agency_pulse</span>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
          </span>
          <span className="font-mono text-[10px] text-primary/60">Live</span>
        </div>
      </div>

      {/* Log entries */}
      <div ref={scrollRef} className="max-h-52 overflow-y-auto p-5 font-mono text-xs leading-loose">
        {AGENT_ORDER.slice(0, visibleCount).map((agent, i) => {
          const row = rows[i];
          const typed = row.fullText.slice(0, row.charsTyped);
          return (
            <div key={i} className="mb-1 animate-fade-in" style={{ animationDelay: `${i * 100}ms` }}>
              <span className="text-muted-foreground/40 select-none">→ </span>
              <span className={`font-semibold ${agentColors[agent] || 'text-primary'}`}>{agent}</span>
              <span className="text-foreground/60"> {typed}</span>
              {row.doneTyping ? (
                <span className="inline-flex gap-1 ml-1">
                  <span className="animate-pulse text-muted-foreground/50">.</span>
                  <span className="animate-pulse text-muted-foreground/50" style={{ animationDelay: '200ms' }}>.</span>
                  <span className="animate-pulse text-muted-foreground/50" style={{ animationDelay: '400ms' }}>.</span>
                </span>
              ) : (
                <span className="inline-block animate-pulse text-primary">▊</span>
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default AgencyPulse;
