import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Users, FileText, Mail, TrendingUp, BarChart3, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
      const today = new Date().toISOString().slice(0, 10);
      const cutoff = addMonths(new Date(), forecastMonths).toISOString().slice(0, 10);
      // Only invoices with an explicit due_date in [today, cutoff].
      // Null-due-date invoices are excluded — timing unknown, not a real forecast.
      // Overdue excluded — shown separately in the panel below.
      const { data } = await (supabase as any)
        .from('invoices')
        .select('id, total, paid_amount, currency, status, due_date, client_companies!client_company_id(currency)')
        .in('status', ['draft', 'sent', 'partial'])
        .gte('due_date', today)
        .lte('due_date', cutoff);
      return (data ?? []).map((inv: any) => ({
        ...inv,
        currency: inv.client_companies?.currency ?? inv.currency ?? 'USD',
      }));
    },
  });

  const { data: recurringServices } = useQuery({
    queryKey: ['recurring-services-forecast'],
    queryFn: async () => {
      // Use three separate queries instead of FK joins — joins were silently
      // returning null and causing the whole recurring bucket to be $0.
      const { data: services, error } = await supabase
        .from('client_recurring_services')
        .select('id, quantity, unit_price_override, billing_cycle, product_id, client_company_id')
        .eq('active', true);
      if (error) { console.error('[recurring-services]', error); return []; }
      if (!services?.length) return [];

      const productIds = [...new Set(services.map((s: any) => s.product_id).filter(Boolean))];
      const companyIds = [...new Set(services.map((s: any) => s.client_company_id).filter(Boolean))];

      const [{ data: products }, { data: companies }] = await Promise.all([
        supabase.from('products').select('id, price_usd, price_zar, price_thb').in('id', productIds),
        supabase.from('client_companies').select('id, currency').in('id', companyIds),
      ]);

      const productMap = new Map((products ?? []).map((p: any) => [p.id, p]));
      const companyMap = new Map((companies ?? []).map((c: any) => [c.id, c]));

      return services.map((svc: any) => ({
        ...svc,
        product: productMap.get(svc.product_id) ?? null,
        resolvedClientCurrency: (companyMap.get(svc.client_company_id) as any)?.currency ?? 'USD',
      }));
    },
  });

  const { data: fxRates, refetch: refetchFx, isFetching: fxFetching } = useQuery({
    queryKey: ['fx-rates-live'],
    staleTime: 0, // always refetch on explicit refetch()
    queryFn: async () => {
      // Run both sources in parallel — use whichever succeeds
      const [dbResult, apiResult] = await Promise.allSettled([
        (supabase as any).from('exchange_rates').select('currency_code, rate_vs_usd, margin_pct'),
        fetch('https://api.frankfurter.app/latest?from=USD&to=ZAR,THB')
          .then(r => r.ok ? r.json() : Promise.reject(r.status)),
      ]);

      const map = new Map<string, { rate_vs_usd: number; margin_pct: number }>();

      // DB rates first (seeded by migration; includes admin margin_pct)
      if (dbResult.status === 'fulfilled' && dbResult.value.data?.length) {
        (dbResult.value.data as any[]).forEach(r =>
          map.set(r.currency_code, { rate_vs_usd: r.rate_vs_usd, margin_pct: r.margin_pct ?? 0 })
        );
      }

      // Live Frankfurter rates override rate_vs_usd (keep margin_pct from DB)
      if (apiResult.status === 'fulfilled' && apiResult.value?.rates) {
        Object.entries(apiResult.value.rates as Record<string, number>).forEach(([code, rate]) => {
          const existing = map.get(code);
          map.set(code, { rate_vs_usd: rate, margin_pct: existing?.margin_pct ?? 0 });
        });
      }

      return map;
    },
  });

  const { data: revenueThisMonth } = useQuery({
    queryKey: ['revenue-this-month'],
    queryFn: async () => {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const { data } = await (supabase as any)
        .from('invoices')
        .select('total, currency')
        .eq('status', 'paid')
        .gte('paid_at', startOfMonth.toISOString());
      return (data ?? []).reduce((sum: number, inv: any) => sum + (inv.total ?? 0), 0);
    },
  });

  const { data: overdueInvoices } = useQuery({
    queryKey: ['overdue-invoices-dashboard'],
    queryFn: async () => {
      const { data } = await supabase
        .from('invoices')
        .select('id, invoice_number, total, due_date, client_id, client_company_id')
        .eq('status', 'overdue')
        .order('due_date', { ascending: true })
        .limit(10);
      // Enrich with client name
      return (data ?? []).map((inv: any) => ({ ...inv, client_name: null }));
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

  type ForecastBreakdown = { currency: string; native: number };

  const forecast = useMemo((): {
    total: number | null;
    invoiceBreakdown: ForecastBreakdown[];
    recurringBreakdown: ForecastBreakdown[];
  } => {
    const getEntry = (code: string) => (fxRates?.get(code) as any) ?? null;

    const toDisplay = (amount: number, fromCurrency: string): number | null => {
      if (fromCurrency === forecastCurrency) return amount;
      let usdAmount = amount;
      if (fromCurrency !== 'USD') {
        const e = getEntry(fromCurrency);
        if (!e) return null;
        usdAmount = amount / e.rate_vs_usd;
      }
      if (forecastCurrency === 'USD') return usdAmount;
      const e = getEntry(forecastCurrency);
      if (!e) return null;
      return usdAmount * e.rate_vs_usd * (1 + e.margin_pct / 100);
    };

    // --- Invoice bucket ---
    // DB query already filtered to [today, cutoff] — just aggregate here.
    const invByCurrency: Record<string, number> = {};
    for (const inv of (forecastInvoices ?? [])) {
      const currency = inv.currency ?? 'USD';
      const remaining = inv.status === 'partial'
        ? ((inv.total ?? 0) - (inv.paid_amount ?? 0))
        : (inv.total ?? 0);
      invByCurrency[currency] = (invByCurrency[currency] ?? 0) + remaining;
    }

    // --- Recurring services bucket ---
    const recByCurrency: Record<string, number> = {};
    for (const svc of (recurringServices ?? [])) {
      const occurrences = getBillingOccurrences(svc.billing_cycle ?? 'monthly', forecastMonths);
      if (occurrences === 0) continue;

      // resolvedClientCurrency is always set (company → profile → USD)
      const clientCurrency: string = (svc as any).resolvedClientCurrency ?? 'USD';
      let priceAmount: number;
      let priceCurrency: string;

      if (svc.unit_price_override != null) {
        priceAmount = svc.unit_price_override;
        priceCurrency = clientCurrency;
      } else {
        const p = svc.product as any;
        if (!p) continue;
        if (clientCurrency === 'ZAR' && p.price_zar) { priceAmount = p.price_zar; priceCurrency = 'ZAR'; }
        else if (clientCurrency === 'THB' && p.price_thb) { priceAmount = p.price_thb; priceCurrency = 'THB'; }
        else { priceAmount = p.price_usd ?? 0; priceCurrency = 'USD'; }
      }

      recByCurrency[priceCurrency] = (recByCurrency[priceCurrency] ?? 0) + priceAmount * (svc.quantity ?? 1) * occurrences;
    }

    // Build breakdowns first (always complete), then sum
    const invoiceBreakdown: ForecastBreakdown[] = Object.entries(invByCurrency).map(([currency, native]) => ({ currency, native }));
    const recurringBreakdown: ForecastBreakdown[] = Object.entries(recByCurrency).map(([currency, native]) => ({ currency, native }));

    // Convert and sum — if any rate is missing, return null total but keep full breakdown visible
    let total = 0;
    for (const { currency, native } of invoiceBreakdown) {
      const converted = toDisplay(native, currency);
      if (converted === null) return { total: null, invoiceBreakdown, recurringBreakdown };
      total += converted;
    }
    for (const { currency, native } of recurringBreakdown) {
      const converted = toDisplay(native, currency);
      if (converted === null) return { total: null, invoiceBreakdown, recurringBreakdown };
      total += converted;
    }

    return { total, invoiceBreakdown, recurringBreakdown };
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

      {/* Action Required Banner */}
      {((stats?.new_leads ?? 0) > 0 || (overdueInvoices?.length ?? 0) > 0) && (
        <div className="glass-card border border-amber-500/20 bg-amber-500/5 p-3 flex items-center gap-3 flex-wrap">
          <AlertCircle className="h-4 w-4 text-amber-400 flex-shrink-0" />
          <div className="flex items-center gap-4 flex-wrap font-mono text-xs">
            {(overdueInvoices?.length ?? 0) > 0 && (
              <a href="/admin/invoices" className="text-amber-400 hover:underline">
                {overdueInvoices!.length} overdue invoice{overdueInvoices!.length !== 1 ? 's' : ''}
              </a>
            )}
            {(stats?.new_leads ?? 0) > 0 && (
              <a href="/admin/leads" className="text-amber-400 hover:underline">
                {stats!.new_leads} new lead{stats!.new_leads !== 1 ? 's' : ''}
              </a>
            )}
          </div>
        </div>
      )}

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Leads" value={leadCount} icon={Mail} iconColor="text-neon-blue" />
        <StatCard label="New Leads" value={newLeads} icon={TrendingUp} iconColor="text-neon-mint" />
        <StatCard label="Blog Posts" value={postCount} icon={FileText} iconColor="text-neon-purple" />
        <StatCard label="Conversion Rate" value={conversionRate} icon={Users} iconColor="text-primary" />
        <StatCard
          label="Revenue This Month"
          value={`$${(revenueThisMonth ?? 0).toLocaleString('en', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
          icon={TrendingUp}
          iconColor="text-neon-mint"
        />
      </div>

      {/* Income Forecast */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-neon-mint" />
            <h3 className="font-mono text-sm font-semibold">Income Forecast</h3>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              title="Refresh exchange rates"
              onClick={() => refetchFx()}
              disabled={fxFetching}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${fxFetching ? 'animate-spin' : ''}`} />
            </Button>
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
        <div className="space-y-2">
          {forecast.total === null ? (
            <p className="font-mono text-sm text-amber-400">
              Exchange rates not configured — go to Settings → Exchange Rates and click "Refresh Live Rates"
            </p>
          ) : (
            <p className="font-mono text-3xl font-bold text-neon-mint">
              {fmtForecast(forecast.total)}
            </p>
          )}
          {/* Invoices breakdown */}
          {forecast.invoiceBreakdown.length > 0 && (
            <div className="flex flex-wrap gap-x-4 gap-y-0.5">
              <span className="font-mono text-[11px] text-muted-foreground/60 w-full">Invoices due in period (excl. overdue):</span>
              {forecast.invoiceBreakdown.map(({ currency, native }) => {
                const sym = CURRENCY_SYMBOLS[currency] ?? currency + ' ';
                return (
                  <span key={currency} className="font-mono text-[11px] text-muted-foreground">
                    {sym}{native.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    {currency !== forecastCurrency && <span className="text-primary/60"> →{forecastCurrency}</span>}
                  </span>
                );
              })}
            </div>
          )}
          {/* Recurring services breakdown — always visible so count is clear */}
          <div className="flex flex-wrap gap-x-4 gap-y-0.5">
            <span className="font-mono text-[11px] text-muted-foreground/60 w-full">
              Recurring ({recurringServices?.length ?? 0} active × {forecastMonths}mo):
            </span>
            {forecast.recurringBreakdown.length > 0 ? forecast.recurringBreakdown.map(({ currency, native }) => {
              const sym = CURRENCY_SYMBOLS[currency] ?? currency + ' ';
              return (
                <span key={currency} className="font-mono text-[11px] text-muted-foreground">
                  {sym}{native.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  {currency !== forecastCurrency && <span className="text-primary/60"> →{forecastCurrency}</span>}
                </span>
              );
            }) : (
              <span className="font-mono text-[11px] text-muted-foreground/40">
                {recurringServices?.length ? 'No product prices set' : 'No active recurring services'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Overdue Invoices */}
      {overdueInvoices && overdueInvoices.length > 0 && (
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <h3 className="font-mono text-sm font-semibold text-red-400">Overdue Invoices</h3>
            <span className="font-mono text-xs text-muted-foreground ml-auto">{overdueInvoices.length} total</span>
          </div>
          <div className="space-y-2">
            {overdueInvoices.slice(0, 5).map((inv: any) => {
              const daysOverdue = Math.floor((Date.now() - new Date(inv.due_date).getTime()) / 86400000);
              return (
                <div key={inv.id} className="flex items-center justify-between font-mono text-xs py-1.5 border-b border-border/50 last:border-0">
                  <div>
                    <span className="font-medium">{inv.client_name ?? inv.invoice_number}</span>
                    <span className="text-muted-foreground ml-2">{inv.invoice_number}</span>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-red-400">{daysOverdue}d overdue</span>
                    <span>${(inv.total ?? 0).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
