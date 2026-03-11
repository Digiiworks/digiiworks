import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Users, FileText, Mail, TrendingUp, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format, subDays, startOfDay } from 'date-fns';
import StatCard from '@/components/admin/StatCard';
import AdminToolbar from '@/components/admin/AdminToolbar';

const COLORS = ['hsl(184, 100%, 50%)', 'hsl(280, 99%, 53%)', 'hsl(106, 100%, 55%)', 'hsl(0, 72%, 51%)', 'hsl(45, 100%, 60%)'];

const Dashboard = () => {
  const { isClient } = useAuth();

  const { data: leadCount } = useQuery({
    queryKey: ['admin-lead-count'],
    queryFn: async () => {
      const { count } = await supabase.from('leads').select('*', { count: 'exact', head: true });
      return count ?? 0;
    },
  });

  const { data: postCount } = useQuery({
    queryKey: ['admin-post-count'],
    queryFn: async () => {
      const { count } = await supabase.from('posts').select('*', { count: 'exact', head: true });
      return count ?? 0;
    },
    enabled: !isClient,
  });

  const { data: newLeads } = useQuery({
    queryKey: ['admin-new-leads'],
    queryFn: async () => {
      const { count } = await supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'new');
      return count ?? 0;
    },
  });

  const { data: convertedCount } = useQuery({
    queryKey: ['admin-converted-count'],
    queryFn: async () => {
      const { count } = await supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'converted');
      return count ?? 0;
    },
  });

  const { data: recentLeads } = useQuery({
    queryKey: ['admin-recent-leads'],
    queryFn: async () => {
      const { data } = await supabase.from('leads').select('*').order('created_at', { ascending: false }).limit(5);
      return data ?? [];
    },
  });

  const { data: allLeads } = useQuery({
    queryKey: ['admin-all-leads-chart'],
    queryFn: async () => {
      const { data } = await supabase.from('leads').select('created_at, status, service_interest').order('created_at');
      return data ?? [];
    },
  });

  // Leads per day (last 14 days)
  const leadsPerDay = (() => {
    if (!allLeads) return [];
    const days: { date: string; count: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const day = startOfDay(subDays(new Date(), i));
      const dayStr = format(day, 'yyyy-MM-dd');
      const count = allLeads.filter((l: any) => format(new Date(l.created_at), 'yyyy-MM-dd') === dayStr).length;
      days.push({ date: format(day, 'MMM d'), count });
    }
    return days;
  })();

  // Status distribution
  const statusDist = (() => {
    if (!allLeads) return [];
    const counts: Record<string, number> = {};
    allLeads.forEach((l: any) => { counts[l.status] = (counts[l.status] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  })();

  // Service interest breakdown
  const serviceDist = (() => {
    if (!allLeads) return [];
    const counts: Record<string, number> = {};
    allLeads.forEach((l: any) => {
      const svc = l.service_interest || 'Unspecified';
      counts[svc] = (counts[svc] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  })();

  const conversionRate = leadCount && leadCount > 0 && convertedCount
    ? `${Math.round((convertedCount / leadCount) * 100)}%`
    : '0%';

  return (
    <div className="space-y-6">
      <AdminToolbar title="Dashboard" subtitle="Overview of your agency operations" />

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Leads" value={leadCount ?? 0} icon={Mail} iconColor="text-neon-blue" />
        <StatCard label="New Leads" value={newLeads ?? 0} icon={TrendingUp} iconColor="text-neon-mint" />
        {!isClient && (
          <>
            <StatCard label="Blog Posts" value={postCount ?? 0} icon={FileText} iconColor="text-neon-purple" />
            <StatCard label="Conversion Rate" value={conversionRate} icon={Users} iconColor="text-primary" />
          </>
        )}
      </div>

      {/* Charts row */}
      {!isClient && (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Leads over time */}
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="h-4 w-4 text-neon-blue" />
              <h3 className="font-mono text-sm font-semibold">Leads (Last 14 Days)</h3>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={leadsPerDay}>
                <XAxis dataKey="date" tick={{ fontSize: 10, fontFamily: 'monospace', fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fontFamily: 'monospace', fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontFamily: 'monospace', fontSize: 12 }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Bar dataKey="count" fill="hsl(184, 100%, 50%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Status distribution */}
          <div className="glass-card p-5">
            <h3 className="font-mono text-sm font-semibold mb-4">Lead Status</h3>
            {statusDist.length > 0 ? (
              <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                <ResponsiveContainer width={140} height={140}>
                  <PieChart>
                    <Pie data={statusDist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} strokeWidth={0}>
                      {statusDist.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-x-4 gap-y-1.5 sm:flex-col sm:space-y-2 sm:gap-0 justify-center">
                  {statusDist.map((item, i) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="font-mono text-xs capitalize text-muted-foreground">{item.name}</span>
                      <span className="font-mono text-xs font-bold text-foreground">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="font-mono text-sm text-muted-foreground text-center py-12">No data yet</p>
            )}
          </div>
        </div>
      )}

      {/* Service Interest Breakdown */}
      {!isClient && serviceDist.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="font-mono text-sm font-semibold mb-4">Leads by Service Interest</h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {serviceDist.map((svc, i) => (
              <div key={svc.name} className="flex items-center justify-between rounded-lg border border-border/30 px-3 py-2">
                <span className="font-mono text-xs text-muted-foreground truncate">{svc.name}</span>
                <span className="font-mono text-sm font-bold ml-2" style={{ color: COLORS[i % COLORS.length] }}>{svc.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Leads */}
      <div className="glass-card overflow-hidden">
        <div className="border-b border-border/50 px-5 py-3">
          <h2 className="font-mono text-sm font-semibold">Recent Leads</h2>
        </div>
        <div className="divide-y divide-border/30">
          {recentLeads?.length === 0 && (
            <p className="px-5 py-8 text-center font-mono text-sm text-muted-foreground">No leads yet.</p>
          )}
          {recentLeads?.map((lead: any) => (
            <div key={lead.id} className="flex items-center justify-between gap-2 px-4 sm:px-5 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-mono text-sm text-foreground truncate">{lead.name}</p>
                <p className="font-mono text-xs text-muted-foreground truncate">{lead.email}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-mono text-xs text-muted-foreground hidden sm:inline truncate max-w-[120px]">{lead.service_interest}</span>
                <span className={`rounded-full px-2 py-0.5 font-mono text-[10px] uppercase whitespace-nowrap ${
                  lead.status === 'new' ? 'bg-neon-blue/10 text-neon-blue' :
                  lead.status === 'contacted' ? 'bg-neon-purple/10 text-neon-purple' :
                  lead.status === 'converted' ? 'bg-neon-mint/10 text-neon-mint' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {lead.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
