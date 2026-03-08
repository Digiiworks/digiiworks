import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Users, FileText, Mail, TrendingUp } from 'lucide-react';

const StatCard = ({ label, value, icon: Icon, color }: { label: string; value: number | string; icon: any; color: string }) => (
  <div className="glass-card p-5">
    <div className="flex items-center justify-between mb-3">
      <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">{label}</span>
      <Icon className={`h-4 w-4 ${color}`} />
    </div>
    <p className="font-mono text-2xl font-bold text-foreground">{value}</p>
  </div>
);

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

  const { data: recentLeads } = useQuery({
    queryKey: ['admin-recent-leads'],
    queryFn: async () => {
      const { data } = await supabase.from('leads').select('*').order('created_at', { ascending: false }).limit(5);
      return data ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-mono text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="font-mono text-xs text-muted-foreground mt-1">Overview of your agency operations</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Leads" value={leadCount ?? 0} icon={Mail} color="text-neon-blue" />
        <StatCard label="New Leads" value={newLeads ?? 0} icon={TrendingUp} color="text-neon-mint" />
        {!isClient && (
          <>
            <StatCard label="Blog Posts" value={postCount ?? 0} icon={FileText} color="text-neon-purple" />
            <StatCard label="Conversion" value={leadCount && leadCount > 0 ? '—' : '0%'} icon={Users} color="text-primary" />
          </>
        )}
      </div>

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
            <div key={lead.id} className="flex items-center justify-between px-5 py-3">
              <div>
                <p className="font-mono text-sm text-foreground">{lead.name}</p>
                <p className="font-mono text-xs text-muted-foreground">{lead.email}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs text-muted-foreground">{lead.service_interest}</span>
                <span className={`rounded-full px-2 py-0.5 font-mono text-[10px] uppercase ${
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
