import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { AgentLog } from '@/lib/types';
import { useEffect, useRef, useState } from 'react';
import { MOCK_AGENT_LOGS } from '@/lib/constants';

const agentColors: Record<string, string> = {
  Dex: 'text-[hsl(160,70%,50%)]',
  Vantage: 'text-[hsl(210,100%,65%)]',
  Forge: 'text-[hsl(280,80%,60%)]',
  Pixel: 'text-[hsl(330,85%,65%)]',
};

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
    }, 400);
    return () => clearInterval(interval);
  }, [displayLogs.length]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [visibleCount]);

  return (
    <div className="rounded-xl bg-card border border-border/50 overflow-hidden">
      {/* Terminal header */}
      <div className="flex items-center gap-2 border-b border-border/40 px-4 py-2.5">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
          <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
        </div>
        <span className="font-mono text-xs text-muted-foreground">live_agency_pulse</span>
      </div>

      {/* Log entries */}
      <div ref={scrollRef} className="max-h-48 overflow-y-auto p-4 font-mono text-xs leading-relaxed">
        {displayLogs.slice(0, visibleCount).map((log, i) => (
          <div
            key={log.id}
            className="mb-1.5 animate-fade-in"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <span className="text-muted-foreground">{'>'} </span>
            <span className={agentColors[log.agent] || 'text-primary'}>[{log.agent}]</span>
            <span className="text-foreground/70"> {log.message}</span>
          </div>
        ))}
        {visibleCount >= displayLogs.length && (
          <div className="mt-2 text-muted-foreground animate-fade-in">
            <span className="inline-block animate-pulse">_</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default AgencyPulse;
