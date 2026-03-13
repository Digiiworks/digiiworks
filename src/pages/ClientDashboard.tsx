import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ChevronDown,
  Landmark,
  Download,
  CreditCard,
  ExternalLink,
  Building2,
  Loader2,
} from 'lucide-react';
import AdminToolbar from '@/components/admin/AdminToolbar';

interface InvoiceRow {
  id: string;
  invoice_number: string;
  status: string;
  due_date: string | null;
  total: number;
  notes: string | null;
  created_at: string;
  paid_at: string | null;
  payment_method: string | null;
  client_company_id: string | null;
}

interface InvoiceItemRow {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface ClientCompany {
  id: string;
  company_name: string;
  currency: string;
  address: string | null;
}

const clientStatusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof Clock }> = {
  sent: { label: 'New', variant: 'secondary', icon: Clock },
  paid: { label: 'Paid', variant: 'default', icon: CheckCircle2 },
  overdue: { label: 'Overdue', variant: 'destructive', icon: AlertCircle },
  cancelled: { label: 'Cancelled', variant: 'outline', icon: FileText },
};

const fmtCurrency = (amount: number, currency: string = 'USD') => {
  const symbol = currency === 'ZAR' ? 'R' : currency === 'THB' ? '฿' : '$';
  return `${symbol}${Number(amount).toFixed(2)}`;
};

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const ClientDashboard = () => {
  const { user, profile, loading: authLoading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [companies, setCompanies] = useState<ClientCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentSettings, setPaymentSettings] = useState<any>(null);
  const [paymentMessage, setPaymentMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Invoice detail
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceRow | null>(null);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItemRow[]>([]);
  const [dialogView, setDialogView] = useState<'invoice' | 'pay'>('invoice');
  // Payment loading
  const [payingInvoiceId, setPayingInvoiceId] = useState<string | null>(null);
  const [payingMethod, setPayingMethod] = useState<string | null>(null);

  // Expanded businesses
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set());

  // Handle payment redirect
  useEffect(() => {
    const payment = searchParams.get('payment');
    const invoiceNum = searchParams.get('invoice');
    if (payment) {
      if (payment === 'success') {
        setPaymentMessage({ type: 'success', text: `Payment for invoice #${invoiceNum} was successful! It may take a moment to update.` });
      } else if (payment === 'failed') {
        setPaymentMessage({ type: 'error', text: `Payment for invoice #${invoiceNum} failed. Please try again.` });
      } else if (payment === 'cancelled') {
        setPaymentMessage({ type: 'error', text: `Payment for invoice #${invoiceNum} was cancelled.` });
      }
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [invoicesRes, companiesRes, settingsRes] = await Promise.all([
        supabase.from('invoices').select('*').order('created_at', { ascending: false }),
        supabase.from('client_companies').select('id, company_name, currency, address').eq('active', true),
        supabase.from('page_content').select('content').eq('page_key', 'payment_settings').maybeSingle(),
      ]);
      setInvoices(((invoicesRes.data as any[]) ?? []).filter((i: any) => i.status !== 'draft'));
      setCompanies((companiesRes.data as any[]) ?? []);
      if (settingsRes.data) setPaymentSettings(settingsRes.data.content);
      
      // Expand all companies by default
      const companyIds = new Set((companiesRes.data ?? []).map((c: any) => c.id));
      setExpandedCompanies(companyIds);
      setLoading(false);
    };
    fetchData();
  }, [user]);

  // Group invoices by company
  const companiesWithInvoices = useMemo(() => {
    const companyMap = new Map<string, { company: ClientCompany; invoices: InvoiceRow[] }>();
    
    companies.forEach(c => {
      companyMap.set(c.id, { company: c, invoices: [] });
    });

    // Invoices not linked to a company (legacy)
    const unlinked: InvoiceRow[] = [];

    invoices.forEach(inv => {
      if (inv.client_company_id && companyMap.has(inv.client_company_id)) {
        companyMap.get(inv.client_company_id)!.invoices.push(inv);
      } else {
        unlinked.push(inv);
      }
    });

    const result = [...companyMap.values()].filter(g => g.invoices.length > 0 || true);
    
    // Add unlinked invoices as a virtual group if any
    if (unlinked.length > 0) {
      result.push({
        company: { id: '__unlinked__', company_name: 'Other Invoices', currency: 'USD', address: null },
        invoices: unlinked,
      });
    }

    return result;
  }, [companies, invoices]);

  const toggleCompany = (id: string) => {
    setExpandedCompanies(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const fetchItems = async (invoiceId: string) => {
    const { data } = await supabase.from('invoice_items').select('*').eq('invoice_id', invoiceId);
    setInvoiceItems((data as any[]) ?? []);
  };

  const openInvoice = (inv: InvoiceRow) => {
    setSelectedInvoice(inv);
    setDialogView('invoice');
    fetchItems(inv.id);
  };

  // Payment handlers
  const handleStripePayment = async (invoiceId: string) => {
    setPayingInvoiceId(invoiceId);
    setPayingMethod('stripe');
    try {
      const { data, error } = await supabase.functions.invoke('create-stripe-checkout', {
        body: { invoice_id: invoiceId },
      });
      if (error) throw error;
      if (data?.redirectUrl) window.location.href = data.redirectUrl;
      else throw new Error('No redirect URL received');
    } catch (err: any) {
      setPaymentMessage({ type: 'error', text: err.message || 'Failed to initiate Stripe payment' });
    }
    setPayingInvoiceId(null);
    setPayingMethod(null);
  };

  const handleYocoPayment = async (invoiceId: string) => {
    setPayingInvoiceId(invoiceId);
    setPayingMethod('yoco');
    try {
      const { data, error } = await supabase.functions.invoke('create-yoco-checkout', {
        body: { invoice_id: invoiceId },
      });
      if (error) throw error;
      if (data?.redirectUrl) window.location.href = data.redirectUrl;
      else throw new Error('No redirect URL received');
    } catch (err: any) {
      setPaymentMessage({ type: 'error', text: err.message || 'Failed to initiate Yoco payment' });
    }
    setPayingInvoiceId(null);
    setPayingMethod(null);
  };

  // Get currency for a given invoice
  const getCurrencyForInvoice = (inv: InvoiceRow): string => {
    if (inv.client_company_id) {
      const company = companies.find(c => c.id === inv.client_company_id);
      return company?.currency ?? 'USD';
    }
    return 'USD';
  };

  // Overall stats
  const totalOutstanding = invoices
    .filter(i => ['sent', 'overdue'].includes(i.status))
    .reduce((s, i) => s + Number(i.total), 0);

  const totalPaid = invoices
    .filter(i => i.status === 'paid')
    .reduce((s, i) => s + Number(i.total), 0);

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const stripeEnabled = paymentSettings?.stripe_enabled || paymentSettings?.payment_methods?.stripe_enabled === true || paymentSettings?.payment_methods?.stripe_enabled === 'true';
  const yocoEnabled = paymentSettings?.yoco_enabled || paymentSettings?.payment_methods?.yoco_enabled === true || paymentSettings?.payment_methods?.yoco_enabled === 'true' || paymentSettings?.payment_methods?.yoco_enabled === undefined;
  const wiseLink = paymentSettings?.wise_payment_link || paymentSettings?.payment_links?.wise_payment_link;

  const renderPaymentButtons = (inv: InvoiceRow, currency: string) => {
    if (!['sent', 'overdue'].includes(inv.status)) return null;
    const isLoading = payingInvoiceId === inv.id;
    
    return (
      <div className="flex flex-wrap gap-2 pt-2">
        {stripeEnabled && (
          <Button
            size="sm"
            className="gap-1.5 font-mono text-xs"
            disabled={isLoading}
            onClick={(e) => { e.stopPropagation(); handleStripePayment(inv.id); }}
          >
            {isLoading && payingMethod === 'stripe' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CreditCard className="h-3.5 w-3.5" />}
            Stripe
          </Button>
        )}
        {yocoEnabled && currency === 'ZAR' && (
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 font-mono text-xs"
            disabled={isLoading}
            onClick={(e) => { e.stopPropagation(); handleYocoPayment(inv.id); }}
          >
            {isLoading && payingMethod === 'yoco' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CreditCard className="h-3.5 w-3.5" />}
            Yoco
          </Button>
        )}
        {wiseLink && (
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 font-mono text-xs"
            asChild
            onClick={(e) => e.stopPropagation()}
          >
            <a href={wiseLink} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5" /> Wise
            </a>
          </Button>
        )}
      </div>
    );
  };

  const subtitle = companies.length > 0
    ? `You have ${companies.length} business${companies.length > 1 ? 'es' : ''} linked to your account`
    : 'Your invoices and project overview';

  return (
    <div className="space-y-6">
      <AdminToolbar title={`Welcome back, ${profile?.display_name || 'Client'}`} subtitle={subtitle} />

      {/* Payment result banner */}
      {paymentMessage && (
        <div className={`rounded-lg p-4 flex items-center justify-between ${
          paymentMessage.type === 'success'
            ? 'bg-primary/10 border border-primary/30 text-primary'
            : 'bg-destructive/10 border border-destructive/30 text-destructive'
        }`}>
          <div className="flex items-center gap-2">
            {paymentMessage.type === 'success' ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
            <p className="text-sm font-medium">{paymentMessage.text}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setPaymentMessage(null)}>✕</Button>
        </div>
      )}

        {/* Summary Stats */}
        {invoices.length > 0 && (() => {
          const overdueInvs = invoices.filter(i => i.status === 'overdue');
          const overdueTotal = overdueInvs.reduce((s, i) => s + Number(i.total), 0);
          const outstandingInvs = invoices.filter(i => ['sent', 'overdue'].includes(i.status));
          const outstandingTotal = outstandingInvs.reduce((s, i) => s + Number(i.total), 0);
          const paidInvs = invoices.filter(i => i.status === 'paid');
          const paidTotal = paidInvs.reduce((s, i) => s + Number(i.total), 0);
          // Use first company currency or USD
          const mainCurrency = companies[0]?.currency ?? 'USD';

          return (
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 mb-8">
              <Card className="border-border bg-card p-4">
                <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Outstanding</p>
                <p className="font-mono text-xl font-bold text-foreground mt-1">{fmtCurrency(outstandingTotal, mainCurrency)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{outstandingInvs.length} invoice{outstandingInvs.length !== 1 ? 's' : ''}</p>
              </Card>
              {overdueInvs.length > 0 && (
                <Card className="border-destructive/30 bg-destructive/5 p-4">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-destructive">Overdue</p>
                  <p className="font-mono text-xl font-bold text-destructive mt-1">{fmtCurrency(overdueTotal, mainCurrency)}</p>
                  <p className="text-xs text-destructive/70 mt-0.5">{overdueInvs.length} invoice{overdueInvs.length !== 1 ? 's' : ''}</p>
                </Card>
              )}
              <Card className="border-border bg-card p-4">
                <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Paid</p>
                <p className="font-mono text-xl font-bold text-primary mt-1">{fmtCurrency(paidTotal, mainCurrency)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{paidInvs.length} invoice{paidInvs.length !== 1 ? 's' : ''}</p>
              </Card>
            </div>
          );
        })()}

        {/* Businesses with Invoices */}
        <div className="space-y-6">
          {companiesWithInvoices.map(({ company, invoices: companyInvoices }) => {
            const isExpanded = expandedCompanies.has(company.id);
            const outstanding = companyInvoices.filter(i => ['sent', 'overdue'].includes(i.status));
            const paid = companyInvoices.filter(i => i.status === 'paid');
            const overdueCount = companyInvoices.filter(i => i.status === 'overdue').length;
            const outstandingTotal = outstanding.reduce((s, i) => s + Number(i.total), 0);
            const paidTotal = paid.reduce((s, i) => s + Number(i.total), 0);

            return (
              <Card key={company.id} className="border-border bg-card overflow-hidden">
                {/* Business Header */}
                <button
                  className="w-full flex items-center justify-between p-5 text-left hover:bg-muted/20 transition-colors"
                  onClick={() => toggleCompany(company.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 font-mono text-sm font-bold text-primary">
                      {company.company_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h2 className="font-mono text-lg font-bold text-foreground">{company.company_name}</h2>
                      <p className="text-xs text-muted-foreground">{company.currency} · {companyInvoices.length} invoice{companyInvoices.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {overdueCount > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {overdueCount} Overdue
                      </Badge>
                    )}
                    {outstanding.length > 0 && (
                      <div className="text-right hidden sm:block">
                        <p className="text-xs text-muted-foreground">Outstanding</p>
                        <p className="font-mono text-sm font-bold text-foreground">{fmtCurrency(outstandingTotal, company.currency)}</p>
                      </div>
                    )}
                    {paid.length > 0 && (
                      <div className="text-right hidden sm:block">
                        <p className="text-xs text-muted-foreground">Paid</p>
                        <p className="font-mono text-sm font-bold text-primary">{fmtCurrency(paidTotal, company.currency)}</p>
                      </div>
                    )}
                    <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                {/* Invoices List */}
                {isExpanded && (
                  <div className="border-t border-border">
                    {/* Mobile summary */}
                    <div className="flex gap-4 px-5 py-3 sm:hidden border-b border-border/50 bg-muted/10">
                      {outstanding.length > 0 && (
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Outstanding</p>
                          <p className="font-mono text-sm font-bold">{fmtCurrency(outstandingTotal, company.currency)}</p>
                        </div>
                      )}
                      {paid.length > 0 && (
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Paid</p>
                          <p className="font-mono text-sm font-bold text-primary">{fmtCurrency(paidTotal, company.currency)}</p>
                        </div>
                      )}
                    </div>

                    {companyInvoices.length === 0 ? (
                      <div className="py-8 text-center">
                        <FileText className="mx-auto h-8 w-8 text-muted-foreground/30" />
                        <p className="mt-2 text-sm text-muted-foreground">No invoices yet</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-border/50">
                        {companyInvoices.map(inv => {
                          const cfg = clientStatusConfig[inv.status] ?? clientStatusConfig.sent;
                          const Icon = cfg.icon;
                          const isUnpaid = ['sent', 'overdue'].includes(inv.status);

                          return (
                            <div key={inv.id} className="px-5 py-4 hover:bg-muted/10 transition-colors">
                              <button
                                className="flex w-full items-center justify-between text-left"
                                onClick={() => openInvoice(inv)}
                              >
                                <div className="flex items-center gap-3">
                                  <Icon className={`h-4 w-4 shrink-0 ${inv.status === 'overdue' ? 'text-destructive' : 'text-muted-foreground'}`} />
                                  <div>
                                    <p className="font-mono text-sm font-medium text-foreground">
                                      #{inv.invoice_number}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {fmtDate(inv.created_at)}
                                      {inv.due_date && <> · Due {fmtDate(inv.due_date)}</>}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <Badge variant={cfg.variant} className="text-xs">
                                    {cfg.label}
                                  </Badge>
                                  {isUnpaid && (
                                    <span
                                      className="text-xs font-medium text-primary hover:underline cursor-pointer"
                                      onClick={(e) => { e.stopPropagation(); openInvoice(inv); setDialogView('pay'); }}
                                    >
                                      Pay Now
                                    </span>
                                  )}
                                  <span className={`font-mono text-sm font-bold ${inv.status === 'overdue' ? 'text-destructive' : 'text-foreground'}`}>
                                    {fmtCurrency(Number(inv.total), company.currency)}
                                  </span>
                                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                </div>
                              </button>
                              {/* Inline payment buttons for unpaid invoices */}
                              {isUnpaid && renderPaymentButtons(inv, company.currency)}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}

          {companiesWithInvoices.length === 0 && (
            <Card className="border-border bg-card">
              <CardContent className="py-12 text-center">
                <Building2 className="mx-auto h-10 w-10 text-muted-foreground/40" />
                <p className="mt-3 text-sm text-muted-foreground">No businesses or invoices linked to your account yet</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Invoice Detail Dialog */}
        <Dialog open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-card border-border">
            {selectedInvoice && (() => {
              const currency = getCurrencyForInvoice(selectedInvoice);
              const isUnpaid = ['sent', 'overdue'].includes(selectedInvoice.status);

              if (dialogView === 'pay') {
                // Payment options view
                const bankKey = currency === 'ZAR' ? 'south_africa' : currency === 'THB' ? 'thai' : 'global';
                const bank = paymentSettings?.[bankKey];
                const regionLabel = currency === 'ZAR' ? 'South Africa' : currency === 'THB' ? 'Thailand' : 'International';

                return (
                  <div className="space-y-5">
                    <div className="flex items-center gap-3">
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setDialogView('invoice')}>
                        <ChevronRight className="h-4 w-4 rotate-180" />
                      </Button>
                      <div>
                        <DialogHeader className="p-0">
                          <DialogTitle className="font-mono text-lg">Pay Invoice #{selectedInvoice.invoice_number}</DialogTitle>
                        </DialogHeader>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          Total: <span className="font-bold text-foreground">{fmtCurrency(Number(selectedInvoice.total), currency)}</span>
                        </p>
                      </div>
                    </div>

                    <Separator />

                    {/* Online payment */}
                    {(stripeEnabled || (yocoEnabled && currency === 'ZAR')) && (
                      <div className="space-y-3">
                        <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Pay Online</p>
                        <div className="grid gap-3">
                          {stripeEnabled && (
                            <Button
                              className="w-full font-mono gap-2 h-12 text-sm"
                              disabled={payingInvoiceId === selectedInvoice.id}
                              onClick={() => handleStripePayment(selectedInvoice.id)}
                            >
                              {payingInvoiceId === selectedInvoice.id && payingMethod === 'stripe'
                                ? <Loader2 className="h-4 w-4 animate-spin" />
                                : <CreditCard className="h-4 w-4" />}
                              Pay with Stripe
                            </Button>
                          )}
                          {yocoEnabled && currency === 'ZAR' && (
                            <Button
                              variant="outline"
                              className="w-full font-mono gap-2 h-12 text-sm"
                              disabled={payingInvoiceId === selectedInvoice.id}
                              onClick={() => handleYocoPayment(selectedInvoice.id)}
                            >
                              {payingInvoiceId === selectedInvoice.id && payingMethod === 'yoco'
                                ? <Loader2 className="h-4 w-4 animate-spin" />
                                : <CreditCard className="h-4 w-4" />}
                              Pay with Yoco
                            </Button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Wise */}
                    {wiseLink && (
                      <div className="space-y-3">
                        <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">International Transfer</p>
                        <Button variant="outline" className="w-full font-mono gap-2 h-12 text-sm" asChild>
                          <a href={wiseLink} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" /> Pay via Wise
                          </a>
                        </Button>
                      </div>
                    )}

                    {/* Banking details */}
                    {bank?.bank_name && (
                      <div className="space-y-3">
                        <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Direct Deposit — {regionLabel}</p>
                        <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-1.5">
                          <p className="font-mono text-xs text-primary flex items-center gap-1.5">
                            <Landmark className="h-3.5 w-3.5" /> Bank Details
                          </p>
                          {bank.bank_name && <p className="text-sm text-foreground"><span className="text-muted-foreground">Bank:</span> {bank.bank_name}</p>}
                          {bank.account_name && <p className="text-sm text-foreground"><span className="text-muted-foreground">Account Name:</span> {bank.account_name}</p>}
                          {bank.account_number && <p className="text-sm text-foreground"><span className="text-muted-foreground">Account:</span> {bank.account_number}</p>}
                          {bank.swift_code && <p className="text-sm text-foreground"><span className="text-muted-foreground">SWIFT:</span> {bank.swift_code}</p>}
                          {bank.routing_number && <p className="text-sm text-foreground"><span className="text-muted-foreground">Routing:</span> {bank.routing_number}</p>}
                          {bank.branch_code && <p className="text-sm text-foreground"><span className="text-muted-foreground">Branch Code:</span> {bank.branch_code}</p>}
                          {bank.branch && <p className="text-sm text-foreground"><span className="text-muted-foreground">Branch:</span> {bank.branch}</p>}
                          {bank.account_type && <p className="text-sm text-foreground"><span className="text-muted-foreground">Type:</span> {bank.account_type}</p>}
                          {bank.reference_note && <p className="text-xs text-muted-foreground italic mt-2">{bank.reference_note}</p>}
                        </div>
                      </div>
                    )}
                  </div>
                );
              }

              // Invoice detail view
              return (
                <div className="space-y-4">
                  <DialogHeader>
                    <DialogTitle className="font-mono">Invoice #{selectedInvoice.invoice_number}</DialogTitle>
                  </DialogHeader>
                  <div className="flex flex-wrap gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Status:</span>{' '}
                      <Badge variant={clientStatusConfig[selectedInvoice.status]?.variant ?? 'outline'}>
                        {clientStatusConfig[selectedInvoice.status]?.label ?? selectedInvoice.status}
                      </Badge>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Due:</span> {fmtDate(selectedInvoice.due_date)}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Total:</span>{' '}
                      <span className="font-bold text-foreground">{fmtCurrency(Number(selectedInvoice.total), currency)}</span>
                    </div>
                  </div>

                  {selectedInvoice.notes && (
                    <p className="text-sm text-muted-foreground italic">{selectedInvoice.notes}</p>
                  )}

                  <Separator />

                  {/* Line Items */}
                  <div className="space-y-2">
                    <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Line Items</p>
                    {invoiceItems.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No items</p>
                    ) : (
                      <div className="rounded-lg border border-border overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-muted/50">
                            <tr>
                              <th className="px-4 py-2 text-left font-mono text-xs uppercase text-muted-foreground">Description</th>
                              <th className="px-4 py-2 text-right font-mono text-xs uppercase text-muted-foreground">Qty</th>
                              <th className="px-4 py-2 text-right font-mono text-xs uppercase text-muted-foreground">Price</th>
                              <th className="px-4 py-2 text-right font-mono text-xs uppercase text-muted-foreground">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {invoiceItems.map((item) => (
                              <tr key={item.id} className="border-t border-border">
                                <td className="px-4 py-2 text-foreground">{item.description}</td>
                                <td className="px-4 py-2 text-right text-muted-foreground">{item.quantity}</td>
                                <td className="px-4 py-2 text-right text-muted-foreground">{fmtCurrency(Number(item.unit_price), currency)}</td>
                                <td className="px-4 py-2 text-right font-medium text-foreground">{fmtCurrency(Number(item.total), currency)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-3 pt-2">
                    <Button variant="outline" className="font-mono" onClick={async () => {
                      try {
                        const { data, error } = await supabase.functions.invoke('generate-invoice-token', {
                          body: { invoice_id: selectedInvoice.id },
                        });
                        if (error) { alert('Could not generate PDF link: ' + (error.message || JSON.stringify(error))); return; }
                        if (!data?.token) { alert('Could not generate PDF link — no token returned'); return; }
                        window.open(`/invoice/${selectedInvoice.id}?token=${data.token}`, '_blank');
                      } catch (e: any) { alert('Could not generate PDF link: ' + (e.message || 'Unknown error')); }
                    }}>
                      <Download className="h-4 w-4 mr-1" /> Download PDF
                    </Button>

                    {isUnpaid && (
                      <Button className="font-mono gap-2" onClick={() => setDialogView('pay')}>
                        <CreditCard className="h-4 w-4" /> Pay Now
                      </Button>
                    )}
                  </div>
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>
      </div>
  );
};

export default ClientDashboard;
