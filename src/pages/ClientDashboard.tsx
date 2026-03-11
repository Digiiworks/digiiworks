import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  FileText,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertCircle,
  LogOut,
  ChevronRight,
  User,
  Landmark,
  Download,
} from 'lucide-react';

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
}

interface InvoiceItemRow {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof Clock }> = {
  draft: { label: 'Draft', variant: 'outline', icon: FileText },
  sent: { label: 'Awaiting Payment', variant: 'secondary', icon: Clock },
  paid: { label: 'Paid', variant: 'default', icon: CheckCircle2 },
  overdue: { label: 'Overdue', variant: 'destructive', icon: AlertCircle },
  cancelled: { label: 'Cancelled', variant: 'outline', icon: FileText },
};

const ClientDashboard = () => {
  const { user, profile, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceRow | null>(null);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [yocoLoading, setYocoLoading] = useState(false);
  const [paymentSettings, setPaymentSettings] = useState<any>(null);
  const [clientCurrency, setClientCurrency] = useState('USD');
  const [paymentMessage, setPaymentMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Handle Yoco redirect back
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
      // Clear query params
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  const handleYocoPayment = async (invoiceId: string) => {
    setYocoLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-yoco-checkout', {
        body: { invoice_id: invoiceId },
      });
      if (error) throw error;
      if (data?.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else {
        throw new Error('No redirect URL received');
      }
    } catch (err: any) {
      console.error('Yoco payment error:', err);
      alert(err.message || 'Failed to initiate payment');
      setYocoLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [invoicesRes, settingsRes, profileRes] = await Promise.all([
        supabase.from('invoices').select('*').order('created_at', { ascending: false }),
        supabase.from('page_content').select('content').eq('page_key', 'payment_settings').single(),
        supabase.from('profiles').select('currency').eq('user_id', user.id).single(),
      ]);
      setInvoices((invoicesRes.data as any[]) ?? []);
      if (settingsRes.data) setPaymentSettings(settingsRes.data.content);
      if (profileRes.data) setClientCurrency(profileRes.data.currency || 'USD');
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const fetchItems = async (invoiceId: string) => {
    const { data } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', invoiceId);
    setInvoiceItems((data as any[]) ?? []);
  };

  const openInvoice = (inv: InvoiceRow) => {
    setSelectedInvoice(inv);
    fetchItems(inv.id);
  };

  const totalOwed = invoices
    .filter((i) => i.status === 'sent' || i.status === 'overdue')
    .reduce((s, i) => s + Number(i.total), 0);

  const totalPaid = invoices
    .filter((i) => i.status === 'paid')
    .reduce((s, i) => s + Number(i.total), 0);

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

  const fmtDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-30">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/">
            <img src="/logo.svg" alt="Digiiworks" className="h-8" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              <span>{profile?.display_name || user?.email}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => { signOut(); navigate('/'); }}>
              <LogOut className="h-4 w-4 mr-1" /> Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {/* Payment result banner */}
        {paymentMessage && (
          <div className={`mb-6 rounded-lg p-4 flex items-center justify-between ${
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

        {/* Welcome */}
        <div className="mb-8">
          <h1 className="font-mono text-2xl font-bold text-foreground">
            Welcome back, <span className="text-primary">{profile?.display_name || 'Client'}</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Your invoices and project overview</p>
        </div>

        {/* Summary Cards */}
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <Card className="border-border bg-card">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs font-mono uppercase text-muted-foreground tracking-wider">Invoices</p>
                <p className="text-2xl font-bold text-foreground">{invoices.length}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/10">
                <DollarSign className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <p className="text-xs font-mono uppercase text-muted-foreground tracking-wider">Outstanding</p>
                <p className="text-2xl font-bold text-foreground">{fmt(totalOwed)}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <CheckCircle2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs font-mono uppercase text-muted-foreground tracking-wider">Total Paid</p>
                <p className="text-2xl font-bold text-foreground">{fmt(totalPaid)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Invoice Detail Modal / Panel */}
        {selectedInvoice && (
          <Card className="mb-8 border-primary/20 bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="font-mono text-lg">
                Invoice #{selectedInvoice.invoice_number}
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setSelectedInvoice(null)}>
                Close
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Status:</span>{' '}
                  <Badge variant={statusConfig[selectedInvoice.status]?.variant ?? 'outline'}>
                    {statusConfig[selectedInvoice.status]?.label ?? selectedInvoice.status}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Due:</span> {fmtDate(selectedInvoice.due_date)}
                </div>
                <div>
                  <span className="text-muted-foreground">Total:</span>{' '}
                  <span className="font-bold text-foreground">{fmt(Number(selectedInvoice.total))}</span>
                </div>
              </div>

              {selectedInvoice.notes && (
                <p className="text-sm text-muted-foreground italic">{selectedInvoice.notes}</p>
              )}

              <Separator />

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
                            <td className="px-4 py-2 text-right text-muted-foreground">{fmt(Number(item.unit_price))}</td>
                            <td className="px-4 py-2 text-right font-medium text-foreground">{fmt(Number(item.total))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Banking Details */}
              {paymentSettings && (selectedInvoice.status === 'sent' || selectedInvoice.status === 'overdue') && (() => {
                const currency = clientCurrency;
                const bankKey = currency === 'ZAR' ? 'south_africa' : currency === 'THB' ? 'thai' : 'global';
                const bank = paymentSettings[bankKey];
                const links = paymentSettings.payment_links;
                if (!bank?.bank_name) return null;
                const regionLabel = currency === 'ZAR' ? 'South Africa' : currency === 'THB' ? 'Thailand' : 'International';
                return (
                  <>
                    <Separator />
                    <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-1.5">
                      <p className="font-mono text-xs uppercase tracking-wider text-primary flex items-center gap-1.5">
                        <Landmark className="h-3.5 w-3.5" /> Direct Deposit — {regionLabel}
                      </p>
                      {bank.bank_name && <p className="text-sm text-foreground"><span className="text-muted-foreground">Bank:</span> {bank.bank_name}</p>}
                      {bank.account_name && <p className="text-sm text-foreground"><span className="text-muted-foreground">Account Name:</span> {bank.account_name}</p>}
                      {bank.account_number && <p className="text-sm text-foreground"><span className="text-muted-foreground">Account:</span> {bank.account_number}</p>}
                      {bank.swift_code && <p className="text-sm text-foreground"><span className="text-muted-foreground">SWIFT:</span> {bank.swift_code}</p>}
                      {bank.routing_number && <p className="text-sm text-foreground"><span className="text-muted-foreground">Routing Number:</span> {bank.routing_number}</p>}
                      {bank.branch_code && <p className="text-sm text-foreground"><span className="text-muted-foreground">Branch Code:</span> {bank.branch_code}</p>}
                      {bank.branch && <p className="text-sm text-foreground"><span className="text-muted-foreground">Branch:</span> {bank.branch}</p>}
                      {bank.account_type && <p className="text-sm text-foreground"><span className="text-muted-foreground">Type:</span> {bank.account_type}</p>}
                      {bank.reference_note && <p className="text-xs text-muted-foreground italic mt-2">{bank.reference_note}</p>}
                    </div>
                  </>
                );
              })()}

              {/* Download PDF */}
              <div className="flex flex-wrap gap-3 pt-2">
                <Button variant="outline" className="font-mono" onClick={async () => {
                  try {
                    const { data, error } = await supabase.functions.invoke('generate-invoice-token', {
                      body: { invoice_id: selectedInvoice.id },
                    });
                    if (error || !data?.token) { alert('Could not generate PDF link'); return; }
                    window.open(`/invoice/${selectedInvoice.id}?token=${data.token}`, '_blank');
                  } catch { alert('Could not generate PDF link'); }
                }}>
                  <Download className="h-4 w-4 mr-1" /> Download PDF
                </Button>
              </div>

              {(selectedInvoice.status === 'sent' || selectedInvoice.status === 'overdue') && (
                <div className="flex flex-wrap gap-3 pt-2">
                  <Button className="font-mono glow-blue bg-primary text-primary-foreground hover:bg-primary/90">
                    Pay with Stripe
                  </Button>
                  <Button
                    variant="outline"
                    className="font-mono border-secondary text-secondary hover:bg-secondary/10"
                    disabled={yocoLoading}
                    onClick={() => handleYocoPayment(selectedInvoice.id)}
                  >
                    {yocoLoading ? 'Redirecting…' : 'Pay with Yoco'}
                  </Button>
                  {paymentSettings?.payment_links?.wise_payment_link && (
                    <Button
                      variant="outline"
                      className="font-mono"
                      asChild
                    >
                      <a href={paymentSettings.payment_links.wise_payment_link} target="_blank" rel="noopener noreferrer">
                        Pay with Wise
                      </a>
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Invoice List */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="font-mono text-lg">Your Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            {invoices.length === 0 ? (
              <div className="py-12 text-center">
                <FileText className="mx-auto h-10 w-10 text-muted-foreground/40" />
                <p className="mt-3 text-sm text-muted-foreground">No invoices yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {invoices.map((inv) => {
                  const cfg = statusConfig[inv.status] ?? statusConfig.draft;
                  const Icon = cfg.icon;
                  return (
                    <button
                      key={inv.id}
                      onClick={() => openInvoice(inv)}
                      className="flex w-full items-center justify-between rounded-lg border border-border p-4 text-left transition-colors hover:border-primary/30 hover:bg-muted/30"
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="h-4 w-4 text-muted-foreground" />
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
                        <span className="font-mono text-sm font-bold text-foreground">
                          {fmt(Number(inv.total))}
                        </span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ClientDashboard;
