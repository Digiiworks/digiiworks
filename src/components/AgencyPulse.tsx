import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { AgentLog } from '@/lib/types';
import { useEffect, useRef, useState } from 'react';
import { MOCK_AGENT_LOGS } from '@/lib/constants';
import { motion } from 'framer-motion';

const agentColors: Record<string, string> = {
  Dex: 'text-primary',
  Vantage: 'text-primary',
  Forge: 'text-secondary',
  Pixel: 'text-secondary',
};

const ease = [0.25, 0.1, 0.25, 1] as const;

const AgencyPulse = () => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(0);

  const { data: logs } = useQuery({
    queryKey: ['agent_logs'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('agent_logs' as any)
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5);
        if (error) throw error;
        return (data as unknown as AgentLog[]) ?? [];
      } catch {
        return [];
      }
    },
    staleTime: 60 * 60 * 1000,
    refetchInterval: false,
    retry: false,
  });

  const displayLogs: readonly { id: string; agent: string; message: string }[] =
    logs && logs.length > 0
      ? logs
      : MOCK_AGENT_LOGS.map((l) => ({ ...l, created_at: new Date().toISOString() }));

  useEffect(() => {
    setVisibleCount(0);
    const interval = setInterval(() => {
      setVisibleCount((prev) => {
        if (prev >= displayLogs.length) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, 500);
    return () => clearInterval(interval);
  }, [displayLogs.length]);

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
        {displayLogs.slice(0, visibleCount).map((log, i) => (
          <div
            key={log.id}
            className="mb-1 animate-fade-in"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <span className="text-muted-foreground/40 select-none">→ </span>
            <span className={`font-semibold ${agentColors[log.agent] || 'text-primary'}`}>{log.agent}</span>
            <span className="text-foreground/60"> {log.message}</span>
          </div>
        ))}
        {visibleCount >= displayLogs.length && (
          <div className="mt-3 text-muted-foreground/40 animate-fade-in">
            <span className="inline-block animate-pulse">▊</span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default AgencyPulse;
