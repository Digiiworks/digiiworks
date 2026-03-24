import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Users, FileText, Mail, TrendingUp, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format, subDays, startOfDay, addMonths } from 'date-fns';
import StatCard from '@/components/admin/StatCard';
import AdminToolbar from '@/components/admin/AdminToolbar';
import ClientDashboard from '@/pages/ClientDashboard';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const COLORS = ['hsl(184, 100%, 50%)', 'hsl(280, 99%, 53%)', 'hsl(106, 100%, 55%)', 'hsl(0, 72%, 51%)', 'hsl(45, 100%, 60%)'];
const CURRENCY_SYMBOLS: Record<string, string> = { USD: '$', ZAR: 'R', THB: '฿' };


const AdminDashboardContent = () => {
  const [forecastMonths, setForecastMonths] = useState<1 | 3 | 6 | 12>(3);
  const [forecastCurrency, setForecastCurrency] = useState<'USD' | 'ZAR' | 'THB'>('USD');

  const { data: stats } = useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: async () => {
      const { data } = await supabase.rpc('get_dashboard_stats');
      return (data as { lead_count: number; new_leads: number; converted_count: number; post_count: number }) ?? { lead_count: 0, new_leads: 0, converted_count: 0, post_count: 0 };
    },
  });

  const leadCount = stats?.lead_count ?? 0;
  const newLeads = stats?.new_leads ?? 0;
  const convertedCount = stats?.converted_count ?? 0;
  const postCount = stats?.post_count ?? 0;

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

  const { data: forecastInvoices } = useQuery({
    queryKey: ['income-forecast', forecastMonths],
    queryFn: async () => {
      const cutoff = addMonths(new Date(), forecastMonths).toISOString().slice(0, 10);
      // Drafts: always include regardless of due date
      const { data: drafts } = await supabase
        .from('invoices')
        .select('id, total, paid_amount, currency, status, due_date')
        .eq('status', 'draft');
      // Sent/overdue/partial: include if due within period or no due date set
      const { data: nonDrafts } = await supabase
        .from('invoices')
        .select('id, total, paid_amount, currency, status, due_date')
        .in('status', ['sent', 'overdue', 'partial'])
        .or(`due_date.is.null,due_date.lte.${cutoff}`);
      return [...(drafts ?? []), ...(nonDrafts ?? [])];
    },
  });

  const { data: recurringServices } = useQuery({
    queryKey: ['recurring-services-forecast'],
    queryFn: async () => {
      const { data } = await supabase
        .from('client_recurring_services')
        .select('id, quantity, unit_price_override, billing_cycle, products(price_usd, price_zar, price_thb), client_companies(currency)')
        .eq('active', true);
      return data ?? [];
    },
  });

  const { data: fxRates } = useQuery({
    queryKey: ['fx-rates-live'],
    staleTime: 60 * 60 * 1000, // cache 1 hour
    queryFn: async () => {
      // Always fetch live rates from Frankfurter first (ECB-sourced, no API key, CORS-safe)
      const res = await fetch('https://api.frankfurter.app/latest?from=USD&to=ZAR,THB');
      if (!res.ok) throw new Error(`FX API unavailable (${res.status})`);
      const { rates } = await res.json() as { rates: Record<string, number> };
      const map = new Map<string, { rate_vs_usd: number; margin_pct: number }>(
        Object.entries(rates).map(([code, rate]) => [code, { rate_vs_usd: rate, margin_pct: 0 }])
      );
      // Overlay admin-configured margin_pct from DB if available
      try {
        const { data: dbRates } = await supabase
          .from('exchange_rates')
          .select('currency_code, margin_pct');
        (dbRates ?? []).forEach((r: any) => {
          const existing = map.get(r.currency_code);
          if (existing) map.set(r.currency_code, { ...existing, margin_pct: r.margin_pct ?? 0 });
        });
      } catch { /* table may not exist yet — live rates work without margins */ }
      return map;
    },
  });

  const getBillingOccurrences = (cycle: string, months: number): number => {
    switch (cycle) {
      case 'weekly':    return Math.round(months * 4.333);
      case 'monthly':   return months;
      case 'quarterly': return Math.floor(months / 3);
      case 'yearly':    return Math.floor(months / 12);
      default:          return months;
    }
  };

  const forecastTotal = useMemo(() => {
    const convertToDisplay = (amount: number, fromCurrency: string): number => {
      if (fromCurrency === forecastCurrency) return amount;
      let usdAmount = amount;
      if (fromCurrency !== 'USD') {
        const r = fxRates?.get(fromCurrency) as any;
        if (r) usdAmount = amount / r.rate_vs_usd;
      }
      if (forecastCurrency === 'USD') return usdAmount;
      const r = fxRates?.get(forecastCurrency) as any;
      if (r) return usdAmount * r.rate_vs_usd * (1 + r.margin_pct / 100);
      return usdAmount;
    };

    // Component 1: outstanding invoices (draft + sent + overdue + partial)
    const invoiceTotal = (forecastInvoices ?? []).reduce((sum: number, inv: any) => {
      const remaining = inv.status === 'partial'
        ? ((inv.total ?? 0) - (inv.paid_amount ?? 0))
        : (inv.total ?? 0);
      return sum + convertToDisplay(remaining, inv.currency ?? 'USD');
    }, 0);

    // Component 2: projected recurring service revenue for the period
    const recurringTotal = (recurringServices ?? []).reduce((sum: number, svc: any) => {
      const occurrences = getBillingOccurrences(svc.billing_cycle ?? 'monthly', forecastMonths);
      if (occurrences === 0) return sum;
      const clientCurrency = (svc.client_companies as any)?.currency ?? 'USD';
      let unitPrice: number;
      if (svc.unit_price_override != null) {
        unitPrice = svc.unit_price_override;
      } else {
        const p = svc.products as any;
        if (!p) return sum;
        if (clientCurrency === 'ZAR' && p.price_zar) unitPrice = p.price_zar;
        else if (clientCurrency === 'THB' && p.price_thb) unitPrice = p.price_thb;
        else unitPrice = p.price_usd ?? 0;
      }
      return sum + convertToDisplay(unitPrice * (svc.quantity ?? 1) * occurrences, clientCurrency);
    }, 0);

    return invoiceTotal + recurringTotal;
  }, [forecastInvoices, recurringServices, forecastCurrency, fxRates, forecastMonths]);

  const fmtForecast = (amount: number) => {
    const sym = CURRENCY_SYMBOLS[forecastCurrency] ?? '';
    return `${sym}${amount.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

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

  const statusDist = (() => {
    if (!allLeads) return [];
    const counts: Record<string, number> = {};
    allLeads.forEach((l: any) => { counts[l.status] = (counts[l.status] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  })();

  const serviceDist = (() => {
    if (!allLeads) return [];
    const counts: Record<string, number> = {};
    allLeads.forEach((l: any) => {
      const svc = l.service_interest || 'Unspecified';
      counts[svc] = (counts[svc] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  })();

  const conversionRate = leadCount > 0 && convertedCount
    ? `${Math.round((convertedCount / leadCount) * 100)}%`
    : '0%';

  return (
    <div className="space-y-6">
      <AdminToolbar title="Dashboard" subtitle="Overview of your agency operations" />

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Leads" value={leadCount} icon={Mail} iconColor="text-neon-blue" />
        <StatCard label="New Leads" value={newLeads} icon={TrendingUp} iconColor="text-neon-mint" />
        <StatCard label="Blog Posts" value={postCount} icon={FileText} iconColor="text-neon-purple" />
        <StatCard label="Conversion Rate" value={conversionRate} icon={Users} iconColor="text-primary" />
      </div>

      {/* Income Forecast */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-neon-mint" />
            <h3 className="font-mono text-sm font-semibold">Income Forecast</h3>
          </div>
          <div className="flex items-center gap-2">
            <Select value={forecastCurrency} onValueChange={(v) => setForecastCurrency(v as 'USD' | 'ZAR' | 'THB')}>
              <SelectTrigger className="w-20 h-7 border-border bg-background/50 font-mono text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD" className="font-mono text-xs">USD</SelectItem>
                <SelectItem value="ZAR" className="font-mono text-xs">ZAR</SelectItem>
                <SelectItem value="THB" className="font-mono text-xs">THB</SelectItem>
              </SelectContent>
            </Select>
            <Select value={String(forecastMonths)} onValueChange={(v) => setForecastMonths(Number(v) as 1 | 3 | 6 | 12)}>
              <SelectTrigger className="w-24 h-7 border-border bg-background/50 font-mono text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1" className="font-mono text-xs">1 month</SelectItem>
                <SelectItem value="3" className="font-mono text-xs">3 months</SelectItem>
                <SelectItem value="6" className="font-mono text-xs">6 months</SelectItem>
                <SelectItem value="12" className="font-mono text-xs">12 months</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1">
          <p className="font-mono text-3xl font-bold text-neon-mint">
            {fmtForecast(forecastTotal)}
          </p>
          <p className="font-mono text-xs text-muted-foreground">
            {forecastInvoices?.length ?? 0} outstanding invoice{forecastInvoices?.length !== 1 ? 's' : ''} · {recurringServices?.length ?? 0} recurring service{recurringServices?.length !== 1 ? 's' : ''} × {forecastMonths} month{forecastMonths !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
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

      {serviceDist.length > 0 && (
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

const Dashboard = () => {
  const { isClient, isAdmin, isEditor } = useAuth();
  // Admins/editors always see admin dashboard, even if they also have 'client' role
  if (isClient && !isAdmin && !isEditor) return <ClientDashboard />;
  return <AdminDashboardContent />;
};

export default Dashboard;
