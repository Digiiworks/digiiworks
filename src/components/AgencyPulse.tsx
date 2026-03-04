import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { AgentLog } from '@/lib/types';
import { useEffect, useRef, useState } from 'react';

const MOCK_LOGS: AgentLog[] = [
  { id: '1', agent: 'Dex', message: 'Analyzing new lead from digiiworks.co...', created_at: new Date().toISOString() },
  { id: '2', agent: 'Vantage', message: "Scraping SEO trends for 'AI Automation 2026'...", created_at: new Date().toISOString() },
  { id: '3', agent: 'Forge', message: 'Deploying system update to KVM 2 node...', created_at: new Date().toISOString() },
  { id: '4', agent: 'Pixel', message: 'Generating social assets for Q1 campaign...', created_at: new Date().toISOString() },
  { id: '5', agent: 'Dex', message: 'Scheduling follow-up for qualified lead #0847...', created_at: new Date().toISOString() },
];

const agentColors: Record<string, string> = {
  Dex: 'text-neon-mint',
  Vantage: 'text-neon-blue',
  Forge: 'text-neon-purple',
  Pixel: 'text-neon-purple',
};

const AgencyPulse = () => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(0);

  const { data: logs } = useQuery({
    queryKey: ['agent_logs'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('agent_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5);
        if (error) throw error;
        return (data as AgentLog[]) ?? [];
      } catch {
        return [];
      }
    },
    refetchInterval: 15000,
  });

  const displayLogs = logs && logs.length > 0 ? logs : MOCK_LOGS;

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
    <div className="glass-card overflow-hidden">
      {/* Terminal header */}
      <div className="flex items-center gap-2 border-b border-border/50 px-4 py-2.5">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-destructive/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-neon-mint/40" />
          <span className="h-2.5 w-2.5 rounded-full bg-neon-blue/40" />
        </div>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-neon-mint opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-neon-mint" style={{ boxShadow: '0 0 6px hsl(106 100% 55% / 0.8)' }} />
          </span>
          <span className="font-mono text-xs text-muted-foreground">live_agency_pulse</span>
        </div>
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
            <span className="text-foreground/80"> {log.message}</span>
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
