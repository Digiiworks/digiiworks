import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import ConfirmDialog from '@/components/ConfirmDialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import {
  Plus, Trash2, Eye, Loader2, CreditCard, ArrowUpDown, Mail, Send, RefreshCw, CalendarIcon, Clock, CheckCircle, XCircle,
} from 'lucide-react';
import { AlertTriangle } from 'lucide-react';
import StatCard from '@/components/admin/StatCard';
import AdminToolbar from '@/components/admin/AdminToolbar';
import AdminPagination from '@/components/admin/AdminPagination';
import PageLoader from '@/components/admin/PageLoader';
import EmptyState from '@/components/admin/EmptyState';
import ProductCombobox from '@/components/admin/ProductCombobox';

type Invoice = {
  id: string;
  invoice_number: string;
  client_id: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  subtotal: number;
  tax_rate: number;
  total: number;
  due_date: string | null;
  send_date: string | null;
  notes: string | null;
  payment_method: string | null;
  payment_reference: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
  client_name?: string;
  client_email?: string;
};

type InvoiceItem = {
  id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  product_id: string | null;
};

type InvoiceEmail = {
  id: string;
  invoice_id: string;
  sent_to: string;
  sent_at: string | null;
  scheduled_for: string | null;
  status: 'scheduled' | 'sent' | 'failed';
  error: string | null;
  created_at: string;
};

type Profile = { user_id: string; display_name: string | null; email: string | null };
type Product = { id: string; name: string; price_usd: number; description?: string | null; category?: string | null };

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  sent: 'bg-blue-500/20 text-blue-400',
  paid: 'bg-green-500/20 text-green-400',
  overdue: 'bg-orange-500/20 text-orange-400',
  cancelled: 'bg-muted text-muted-foreground line-through',
};

const EMAIL_STATUS_ICON: Record<string, React.ReactNode> = {
  sent: <CheckCircle className="h-3.5 w-3.5 text-green-400" />,
  failed: <XCircle className="h-3.5 w-3.5 text-destructive" />,
  scheduled: <Clock className="h-3.5 w-3.5 text-blue-400" />,
};

const STATUSES = ['draft', 'sent', 'paid', 'overdue', 'cancelled'] as const;
const PAGE_SIZE = 10;

type SortField = 'invoice_number' | 'total' | 'due_date' | 'created_at' | 'status';
type SortDir = 'asc' | 'desc';

function getFirstOfNextMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1);
}

export default function Invoices() {
  const { toast } = useToast();
  const { isAdmin } = useAuth();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Dialog state
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState<Invoice | null>(null);
  const [detailItems, setDetailItems] = useState<InvoiceItem[]>([]);
  const [detailEmails, setDetailEmails] = useState<InvoiceEmail[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  // Create form
  const [form, setForm] = useState({ client_id: '', due_date: '', notes: '', tax_rate: 0 });
  const [sendDate, setSendDate] = useState<Date | undefined>(getFirstOfNextMonth());
  const [lineItems, setLineItems] = useState<InvoiceItem[]>([
    { description: '', quantity: 1, unit_price: 0, total: 0, product_id: null },
  ]);

  const fetchAll = async () => {
    setLoading(true);
    const [invRes, profRes, prodRes] = await Promise.all([
      supabase.from('invoices').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('user_id, display_name, email'),
      supabase.from('products').select('id, name, price_usd, description, category').eq('active', true),
    ]);
    const profileMap = new Map((profRes.data ?? []).map(p => [p.user_id, p]));
    const enriched = (invRes.data ?? []).map(inv => ({
      ...inv,
      client_name: profileMap.get(inv.client_id)?.display_name ?? 'Unknown',
      client_email: profileMap.get(inv.client_id)?.email ?? '',
    }));
    setInvoices(enriched);
    setProfiles(profRes.data ?? []);
    setProducts(prodRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  // Sort, filter, search, then paginate — overdue always on top
  const processed = useMemo(() => {
    let list = [...invoices];
    if (filterStatus !== 'all') list = list.filter(i => i.status === filterStatus);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(i =>
        i.invoice_number.toLowerCase().includes(q) ||
        (i.client_name ?? '').toLowerCase().includes(q) ||
        (i.client_email ?? '').toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      if (a.status === 'overdue' && b.status !== 'overdue') return -1;
      if (b.status === 'overdue' && a.status !== 'overdue') return 1;
      let cmp = 0;
      if (sortField === 'total' || sortField === 'invoice_number') {
        const av = sortField === 'total' ? a.total : a.invoice_number;
        const bv = sortField === 'total' ? b.total : b.invoice_number;
        cmp = av < bv ? -1 : av > bv ? 1 : 0;
      } else if (sortField === 'due_date') {
        const ad = a.due_date ?? '';
        const bd = b.due_date ?? '';
        cmp = ad < bd ? -1 : ad > bd ? 1 : 0;
      } else if (sortField === 'status') {
        cmp = a.status < b.status ? -1 : a.status > b.status ? 1 : 0;
      } else {
        cmp = a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [invoices, filterStatus, search, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(processed.length / PAGE_SIZE));
  const paginated = processed.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [filterStatus, search, sortField, sortDir]);

  const outstandingTotal = invoices
    .filter(i => ['draft', 'sent', 'overdue'].includes(i.status))
    .reduce((s, i) => s + i.total, 0);
  const paidTotal = invoices
    .filter(i => i.status === 'paid')
    .reduce((s, i) => s + i.total, 0);
  const overdueCount = invoices.filter(i => i.status === 'overdue').length;

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const updateLineItem = (idx: number, field: keyof InvoiceItem, value: any) => {
    setLineItems(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      next[idx].total = next[idx].quantity * next[idx].unit_price;
      return next;
    });
  };

  const pickProduct = (idx: number, productId: string) => {
    const p = products.find(pr => pr.id === productId);
    if (!p) return;
    setLineItems(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], product_id: productId, description: p.name, unit_price: p.price_usd, total: next[idx].quantity * p.price_usd };
      return next;
    });
  };

  const subtotal = lineItems.reduce((s, li) => s + li.total, 0);
  const taxAmount = subtotal * (form.tax_rate / 100);
  const grandTotal = subtotal + taxAmount;
  const nextNumber = `INV-${String((invoices.length || 0) + 1).padStart(4, '0')}`;

  const handleCreate = async () => {
    if (!form.client_id || lineItems.every(li => !li.description)) {
      toast({ title: 'Fill in client and at least one line item', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { data: inv, error } = await supabase.from('invoices').insert({
      invoice_number: nextNumber, client_id: form.client_id,
      due_date: form.due_date || null, notes: form.notes || null,
      tax_rate: form.tax_rate, subtotal, total: grandTotal, status: 'draft' as const,
      send_date: sendDate ? format(sendDate, 'yyyy-MM-dd') : null,
    }).select().single();

    if (error || !inv) {
      toast({ title: 'Error creating invoice', description: error?.message, variant: 'destructive' });
      setSaving(false); return;
    }

    const items = lineItems.filter(li => li.description).map(li => ({
      invoice_id: inv.id, description: li.description, quantity: li.quantity,
      unit_price: li.unit_price, total: li.total, product_id: li.product_id,
    }));
    if (items.length) {
      const { error: itemErr } = await supabase.from('invoice_items').insert(items);
      if (itemErr) toast({ title: 'Error adding line items', description: itemErr.message, variant: 'destructive' });
    }
    toast({ title: `Invoice ${nextNumber} created` });
    setSaving(false); setShowCreate(false); resetForm(); fetchAll();
  };

  const resetForm = () => {
    setForm({ client_id: '', due_date: '', notes: '', tax_rate: 0 });
    setSendDate(getFirstOfNextMonth());
    setLineItems([{ description: '', quantity: 1, unit_price: 0, total: 0, product_id: null }]);
  };

  const updateStatus = async (id: string, status: string) => {
    const extra: any = { status };
    if (status === 'paid') extra.paid_at = new Date().toISOString();
    const { error } = await supabase.from('invoices').update(extra).eq('id', id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: `Status updated to ${status}` }); fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await supabase.from('invoice_items').delete().eq('invoice_id', deleteId);
    const { error } = await supabase.from('invoices').delete().eq('id', deleteId);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Invoice deleted' }); setDeleteId(null); fetchAll();
  };

  const viewDetail = async (inv: Invoice) => {
    setShowDetail(inv);
    const [itemsRes, emailsRes] = await Promise.all([
      supabase.from('invoice_items').select('*').eq('invoice_id', inv.id),
      supabase.from('invoice_emails').select('*').eq('invoice_id', inv.id).order('created_at', { ascending: false }),
    ]);
    setDetailItems((itemsRes.data ?? []) as InvoiceItem[]);
    setDetailEmails((emailsRes.data ?? []) as unknown as InvoiceEmail[]);
  };

  const handleSendEmail = async (invoiceId: string, isResend = false) => {
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-invoice-email', {
        body: { invoice_id: invoiceId, force_resend: isResend },
      });
      if (error) throw error;
      toast({ title: isResend ? 'Invoice resent' : 'Invoice emailed', description: `Sent to ${data.sent_to}` });
      fetchAll();
      // Refresh email history if detail is open
      if (showDetail) {
        const { data: emails } = await supabase.from('invoice_emails').select('*').eq('invoice_id', invoiceId).order('created_at', { ascending: false });
        setDetailEmails((emails ?? []) as unknown as InvoiceEmail[]);
      }
    } catch (err: any) {
      toast({ title: 'Failed to send email', description: err.message, variant: 'destructive' });
    }
    setSending(false);
  };

  const handlePayClick = (inv: Invoice) => {
    toast({ title: 'Payment', description: `Payment link for ${inv.invoice_number} ($${inv.total.toFixed(2)}) coming soon.` });
  };

  const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <TableHead
      className="font-mono text-xs cursor-pointer select-none hover:text-foreground transition-colors"
      onClick={() => toggleSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        <ArrowUpDown className={`h-3 w-3 ${sortField === field ? 'text-primary' : 'text-muted-foreground/40'}`} />
      </span>
    </TableHead>
  );

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Outstanding"
          value={`$${outstandingTotal.toFixed(2)}`}
          subtitle={`${invoices.filter(i => ['draft', 'sent', 'overdue'].includes(i.status)).length} invoice(s)`}
        />
        <StatCard
          label="Paid"
          value={`$${paidTotal.toFixed(2)}`}
          valueColor="text-green-400"
          subtitle={`${invoices.filter(i => i.status === 'paid').length} invoice(s)`}
        />
        {overdueCount > 0 && (
          <StatCard
            label="Overdue"
            value={`$${invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + i.total, 0).toFixed(2)}`}
            icon={AlertTriangle}
            iconColor="text-orange-400"
            valueColor="text-orange-400"
            variant="alert"
            alertColor="orange-500"
            subtitle={`${overdueCount} invoice(s)`}
          />
        )}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-mono text-2xl font-bold text-foreground">Invoices</h1>
        <div className="flex flex-wrap gap-2">
          <Input
            placeholder="Search invoices..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-48 bg-card border-border h-9 text-sm"
          />
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-32 bg-card border-border h-9">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
            </SelectContent>
          </Select>
          {isAdmin && (
            <Button onClick={() => { resetForm(); setShowCreate(true); }} className="gap-1.5 h-9">
              <Plus className="h-4 w-4" /> New Invoice
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : processed.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground font-mono text-sm">No invoices found.</p>
      ) : (
        <>
          <div className="rounded-lg border border-border bg-card/50 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50">
                  <SortHeader field="invoice_number">Invoice #</SortHeader>
                  <TableHead className="font-mono text-xs">Client</TableHead>
                  <SortHeader field="status">Status</SortHeader>
                  <SortHeader field="total"><span className="ml-auto">Total</span></SortHeader>
                  <SortHeader field="due_date">Due Date</SortHeader>
                  <TableHead className="font-mono text-xs">Send Date</TableHead>
                  <TableHead className="font-mono text-xs text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map(inv => {
                  const isOverdue = inv.status === 'overdue';
                  const isUnpaid = ['sent', 'overdue'].includes(inv.status);
                  return (
                    <TableRow
                      key={inv.id}
                      className={`border-border/30 transition-colors ${
                        isOverdue ? 'bg-orange-500/5 border-l-2 border-l-orange-500' : ''
                      }`}
                    >
                      <TableCell className="font-mono text-sm">
                        {isOverdue && <AlertTriangle className="inline h-3.5 w-3.5 text-orange-400 mr-1.5 -mt-0.5" />}
                        {inv.invoice_number}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{inv.client_name}</span>
                        <span className="block text-xs text-muted-foreground">{inv.client_email}</span>
                      </TableCell>
                      <TableCell>
                        {isAdmin ? (
                          <Select value={inv.status} onValueChange={(v) => updateStatus(inv.id, v)}>
                            <SelectTrigger className="h-7 w-28 border-0 bg-transparent p-0">
                              <Badge className={`${STATUS_COLORS[inv.status]} border-0 capitalize`}>{inv.status}</Badge>
                            </SelectTrigger>
                            <SelectContent>
                              {STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge className={`${STATUS_COLORS[inv.status]} border-0 capitalize`}>{inv.status}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        <span className={isOverdue ? 'text-orange-400 font-bold' : ''}>${inv.total.toFixed(2)}</span>
                      </TableCell>
                      <TableCell className={`text-sm ${isOverdue ? 'text-orange-400' : 'text-muted-foreground'}`}>
                        {inv.due_date ? format(new Date(inv.due_date), 'MMM d, yyyy') : '—'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {inv.send_date ? (
                          <span className="inline-flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {format(new Date(inv.send_date), 'MMM d')}
                          </span>
                        ) : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {isAdmin && inv.status !== 'cancelled' && inv.status !== 'paid' && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 gap-1 font-mono text-xs border-primary/50 text-primary hover:bg-primary/10"
                              onClick={() => handleSendEmail(inv.id)}
                              disabled={sending}
                            >
                              {sending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                              Email
                            </Button>
                          )}
                          {isUnpaid && (
                            <Button
                              variant="outline"
                              size="sm"
                              className={`h-7 gap-1 font-mono text-xs ${
                                isOverdue
                                  ? 'border-orange-500/50 text-orange-400 hover:bg-orange-500/10'
                                  : 'border-primary/50 text-primary hover:bg-primary/10'
                              }`}
                              onClick={() => handlePayClick(inv)}
                            >
                              <CreditCard className="h-3 w-3" />
                              Pay ${inv.total.toFixed(2)}
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => viewDetail(inv)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {isAdmin && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(inv.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <p className="font-mono text-xs text-muted-foreground">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, processed.length)} of {processed.length}
            </p>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <Button
                  key={p}
                  variant={p === page ? 'default' : 'outline'}
                  size="icon"
                  className="h-8 w-8 font-mono text-xs"
                  onClick={() => setPage(p)}
                >
                  {p}
                </Button>
              ))}
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-mono">New Invoice — {nextNumber}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="font-mono text-xs">Client</Label>
                <Select value={form.client_id} onValueChange={v => setForm(f => ({ ...f, client_id: v }))}>
                  <SelectTrigger className="bg-background border-border"><SelectValue placeholder="Select client" /></SelectTrigger>
                  <SelectContent>
                    {profiles.map(p => (
                      <SelectItem key={p.user_id} value={p.user_id}>{p.display_name || p.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="font-mono text-xs">Due Date</Label>
                <Input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} className="bg-background border-border" />
              </div>
            </div>

            {/* Send Date Picker */}
            <div>
              <Label className="font-mono text-xs">Email Send Date</Label>
              <p className="text-[10px] text-muted-foreground mb-1">Invoice will be emailed to the client on this date (defaults to 1st of next month)</p>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal bg-background border-border",
                      !sendDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {sendDate ? format(sendDate, 'PPP') : <span>Pick a send date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={sendDate}
                    onSelect={setSendDate}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label className="font-mono text-xs mb-2 block">Line Items</Label>
              <div className="space-y-2">
                {lineItems.map((li, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                     <div className="col-span-4">
                      {idx === 0 && <span className="text-[10px] font-mono text-muted-foreground">Product / Description</span>}
                      <ProductCombobox
                        products={products}
                        value={li.product_id}
                        onSelect={(p) => pickProduct(idx, p.id)}
                        placeholder="Search products..."
                      />
                    </div>
                    <div className="col-span-3">
                      {idx === 0 && <span className="text-[10px] font-mono text-muted-foreground">Description</span>}
                      <Input value={li.description} onChange={e => updateLineItem(idx, 'description', e.target.value)} className="h-9 text-xs bg-background border-border" placeholder="Custom desc" />
                    </div>
                    <div className="col-span-1">
                      {idx === 0 && <span className="text-[10px] font-mono text-muted-foreground">Qty</span>}
                      <Input type="number" min={1} value={li.quantity} onChange={e => updateLineItem(idx, 'quantity', +e.target.value)} className="h-9 text-xs bg-background border-border" />
                    </div>
                    <div className="col-span-2">
                      {idx === 0 && <span className="text-[10px] font-mono text-muted-foreground">Price</span>}
                      <Input type="number" min={0} step={0.01} value={li.unit_price} onChange={e => updateLineItem(idx, 'unit_price', +e.target.value)} className="h-9 text-xs bg-background border-border" />
                    </div>
                    <div className="col-span-1 text-right font-mono text-xs text-muted-foreground pt-1">${li.total.toFixed(2)}</div>
                    <div className="col-span-1">
                      {lineItems.length > 1 && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setLineItems(prev => prev.filter((_, i) => i !== idx))}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" className="mt-2 font-mono text-xs" onClick={() => setLineItems(prev => [...prev, { description: '', quantity: 1, unit_price: 0, total: 0, product_id: null }])}>
                + Add Line
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="font-mono text-xs">Tax Rate (%)</Label>
                <Input type="number" min={0} step={0.5} value={form.tax_rate} onChange={e => setForm(f => ({ ...f, tax_rate: +e.target.value }))} className="bg-background border-border" />
              </div>
              <div className="text-right space-y-1 pt-4">
                <p className="font-mono text-xs text-muted-foreground">Subtotal: ${subtotal.toFixed(2)}</p>
                <p className="font-mono text-xs text-muted-foreground">Tax: ${taxAmount.toFixed(2)}</p>
                <p className="font-mono text-sm font-bold text-foreground">Total: ${grandTotal.toFixed(2)}</p>
              </div>
            </div>
            <div>
              <Label className="font-mono text-xs">Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="bg-background border-border" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!showDetail} onOpenChange={() => setShowDetail(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-mono">{showDetail?.invoice_number}</DialogTitle>
          </DialogHeader>
          {showDetail && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Client:</span> {showDetail.client_name}</div>
                <div><span className="text-muted-foreground">Status:</span> <Badge className={`${STATUS_COLORS[showDetail.status]} border-0 capitalize`}>{showDetail.status}</Badge></div>
                <div><span className="text-muted-foreground">Due:</span> {showDetail.due_date ? format(new Date(showDetail.due_date), 'MMM d, yyyy') : '—'}</div>
                <div><span className="text-muted-foreground">Created:</span> {format(new Date(showDetail.created_at), 'MMM d, yyyy')}</div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">Send Date:</span>{' '}
                  {showDetail.send_date ? (
                    <span className="inline-flex items-center gap-1">
                      <Mail className="h-3 w-3 text-primary" />
                      {format(new Date(showDetail.send_date), 'MMM d, yyyy')}
                    </span>
                  ) : '—'}
                </div>
              </div>
              {detailItems.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50">
                      <TableHead className="font-mono text-xs">Item</TableHead>
                      <TableHead className="font-mono text-xs text-right">Qty</TableHead>
                      <TableHead className="font-mono text-xs text-right">Price</TableHead>
                      <TableHead className="font-mono text-xs text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detailItems.map((it, i) => (
                      <TableRow key={i} className="border-border/30">
                        <TableCell className="text-sm">{it.description}</TableCell>
                        <TableCell className="text-right text-sm">{it.quantity}</TableCell>
                        <TableCell className="text-right font-mono text-sm">${it.unit_price.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-mono text-sm">${it.total.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              <div className="text-right space-y-1 border-t border-border/50 pt-3">
                <p className="font-mono text-xs text-muted-foreground">Subtotal: ${showDetail.subtotal.toFixed(2)}</p>
                <p className="font-mono text-xs text-muted-foreground">Tax ({showDetail.tax_rate}%): ${(showDetail.subtotal * showDetail.tax_rate / 100).toFixed(2)}</p>
                <p className="font-mono text-sm font-bold text-foreground">Total: ${showDetail.total.toFixed(2)}</p>
              </div>

              {/* Email Actions */}
              {isAdmin && showDetail.status !== 'cancelled' && (
                <div className="flex gap-2">
                  <Button
                    className="flex-1 gap-2 font-mono"
                    onClick={() => handleSendEmail(showDetail.id)}
                    disabled={sending}
                  >
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Send Email Now
                  </Button>
                  {detailEmails.some(e => e.status === 'sent') && (
                    <Button
                      variant="outline"
                      className="gap-2 font-mono"
                      onClick={() => handleSendEmail(showDetail.id, true)}
                      disabled={sending}
                    >
                      <RefreshCw className="h-4 w-4" />
                      Resend
                    </Button>
                  )}
                </div>
              )}

              {['sent', 'overdue'].includes(showDetail.status) && (
                <Button
                  className={`w-full gap-2 font-mono ${
                    showDetail.status === 'overdue'
                      ? 'bg-orange-500 hover:bg-orange-600 text-white'
                      : ''
                  }`}
                  onClick={() => handlePayClick(showDetail)}
                >
                  <CreditCard className="h-4 w-4" />
                  Pay Now — ${showDetail.total.toFixed(2)}
                </Button>
              )}

              {showDetail.notes && <p className="text-sm text-muted-foreground italic">{showDetail.notes}</p>}

              {/* Email History */}
              {detailEmails.length > 0 && (
                <div className="border-t border-border/50 pt-3">
                  <h4 className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" /> Email History
                  </h4>
                  <div className="space-y-2">
                    {detailEmails.map(email => (
                      <div key={email.id} className="flex items-center justify-between rounded-md border border-border/50 bg-background/50 px-3 py-2">
                        <div className="flex items-center gap-2">
                          {EMAIL_STATUS_ICON[email.status]}
                          <div>
                            <p className="text-xs font-mono">{email.sent_to}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {email.sent_at ? format(new Date(email.sent_at), 'MMM d, yyyy HH:mm') : 'Pending'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant={email.status === 'sent' ? 'default' : email.status === 'failed' ? 'destructive' : 'secondary'} className="text-[10px] capitalize">
                            {email.status}
                          </Badge>
                          {email.error && (
                            <p className="text-[10px] text-destructive mt-0.5 max-w-[200px] truncate">{email.error}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoice?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this invoice and all its line items.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
