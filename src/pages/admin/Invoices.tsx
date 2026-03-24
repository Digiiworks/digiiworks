import React, { useState, useEffect, useMemo } from 'react';
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
  Plus, Trash2, Eye, Loader2, CreditCard, ArrowUpDown, Mail, Send, RefreshCw, CalendarIcon, Clock, CheckCircle, XCircle, Pencil, ExternalLink, CircleDollarSign, CheckSquare,
} from 'lucide-react';
import { AlertTriangle } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import StatCard from '@/components/admin/StatCard';
import AdminToolbar from '@/components/admin/AdminToolbar';
import AdminPagination from '@/components/admin/AdminPagination';
import PageLoader from '@/components/admin/PageLoader';
import EmptyState, { ErrorState } from '@/components/admin/EmptyState';
import ProductCombobox from '@/components/admin/ProductCombobox';

type Invoice = {
  id: string;
  invoice_number: string;
  client_id: string;
  client_company_id: string | null;
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
  currency?: string;
  company_name?: string;
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

type Profile = { user_id: string; display_name: string | null; email: string | null; company: string | null; currency?: string };
type ClientCompanyOption = { id: string; user_id: string; company_name: string; currency: string; display_name: string | null; email: string | null };
type Product = { id: string; name: string; price_usd: number; price_zar: number; price_thb: number; description?: string | null; category?: string | null };

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  sent: 'bg-green-500/20 text-green-950',
  paid: 'bg-primary/20 text-primary',
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

const isPayableStatus = (status: Invoice['status']) => !['paid', 'cancelled'].includes(status);
const isSentAlready = (status: string) => ['sent', 'overdue', 'paid'].includes(status);

const fmtCurrency = (amount: number, currency: string = 'USD') => {
  const symbol = currency === 'ZAR' ? 'R' : currency === 'THB' ? '฿' : '$';
  return `${symbol}${amount.toFixed(2)}`;
};

type SortField = 'invoice_number' | 'total' | 'due_date' | 'created_at' | 'status';
type SortDir = 'asc' | 'desc';

function getFirstOfNextMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1);
}

function get25thOfCurrentMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 25);
}

export default function Invoices() {
  const { toast } = useToast();
  const { isAdmin } = useAuth();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [clientCompanies, setClientCompanies] = useState<ClientCompanyOption[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const visibleStatuses = isAdmin ? STATUSES : STATUSES.filter((s) => s !== 'draft');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Dialog state
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [showDetail, setShowDetail] = useState<Invoice | null>(null);
  const [detailItems, setDetailItems] = useState<InvoiceItem[]>([]);
  const [detailEmails, setDetailEmails] = useState<InvoiceEmail[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [payDialog, setPayDialog] = useState<Invoice | null>(null);
  const [resendConfirmId, setResendConfirmId] = useState<string | null>(null);
  const [editSentInvoice, setEditSentInvoice] = useState<Invoice | null>(null);
  const [resendAfterEditId, setResendAfterEditId] = useState<string | null>(null);
  const [originalFormSnapshot, setOriginalFormSnapshot] = useState<string>('');
  const [paymentSettings, setPaymentSettings] = useState<any>(null);
  const [payingMethod, setPayingMethod] = useState<string | null>(null);

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState<string | null>(null);

  // Create/Edit form
  const [form, setForm] = useState({ client_id: '', client_company_id: '', due_date: format(getFirstOfNextMonth(), 'yyyy-MM-dd'), notes: '', tax_rate: 0 });
  const [sendDate, setSendDate] = useState<Date | undefined>(get25thOfCurrentMonth());
  const [lineItems, setLineItems] = useState<InvoiceItem[]>([
    { description: '', quantity: 1, unit_price: 0, total: 0, product_id: null },
  ]);

  const fetchAll = async () => {
    setLoading(true);
    setFetchError(false);
    try {
      const [invRes, profRes, prodRes, compRes, paySettingsRes] = await Promise.all([
        supabase.from('invoices').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('user_id, display_name, email, company, currency'),
        supabase.from('products').select('id, name, price_usd, price_zar, price_thb, description, category').eq('active', true),
        supabase.from('client_companies').select('id, user_id, company_name, currency').eq('active', true),
        supabase.from('page_content').select('content').eq('page_key', 'payment_settings').maybeSingle(),
      ]);
      if (paySettingsRes.data?.content) setPaymentSettings(paySettingsRes.data.content);
      const profileMap = new Map((profRes.data ?? []).map(p => [p.user_id, p]));
      const companyMap = new Map((compRes.data ?? []).map((c: any) => [c.id, c]));

      const companyOptions: ClientCompanyOption[] = (compRes.data ?? []).map((c: any) => {
        const profile = profileMap.get(c.user_id);
        return {
          id: c.id,
          user_id: c.user_id,
          company_name: c.company_name,
          currency: c.currency,
          display_name: profile?.display_name ?? null,
          email: profile?.email ?? null,
        };
      });

      const enriched = (invRes.data ?? []).map(inv => {
        const company = inv.client_company_id ? companyMap.get(inv.client_company_id) : null;
        const profile = profileMap.get(inv.client_id);
        return {
          ...inv,
          client_name: company?.company_name ?? profile?.display_name ?? 'Unknown',
          client_email: profile?.email ?? '',
          currency: company?.currency ?? profile?.currency ?? 'USD',
          company_name: company?.company_name ?? profile?.company ?? '',
        };
      });
      setInvoices(enriched);
      setProfiles(profRes.data ?? []);
      setClientCompanies(companyOptions);
      setProducts(prodRes.data ?? []);
    } catch {
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const visibleInvoices = useMemo(
    () => (isAdmin ? invoices : invoices.filter(i => i.status !== 'draft')),
    [invoices, isAdmin]
  );

  // Sort, filter, search, then paginate — overdue always on top
  const processed = useMemo(() => {
    let list = [...visibleInvoices];
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
  }, [visibleInvoices, filterStatus, search, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(processed.length / PAGE_SIZE));
  const paginated = processed.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [filterStatus, search, sortField, sortDir]);

  useEffect(() => {
    if (!isAdmin && filterStatus === 'draft') setFilterStatus('all');
  }, [isAdmin, filterStatus]);

  const outstandingByCurrency = useMemo(() => {
    const map: Record<string, { total: number; count: number }> = {};
    visibleInvoices.filter(i => ['draft', 'sent', 'overdue'].includes(i.status)).forEach(i => {
      const c = i.currency ?? 'USD';
      if (!map[c]) map[c] = { total: 0, count: 0 };
      map[c].total += i.total;
      map[c].count++;
    });
    return map;
  }, [visibleInvoices]);

  const paidByCurrency = useMemo(() => {
    const map: Record<string, { total: number; count: number }> = {};
    visibleInvoices.filter(i => i.status === 'paid').forEach(i => {
      const c = i.currency ?? 'USD';
      if (!map[c]) map[c] = { total: 0, count: 0 };
      map[c].total += i.total;
      map[c].count++;
    });
    return map;
  }, [visibleInvoices]);

  const overdueByCurrency = useMemo(() => {
    const map: Record<string, { total: number; count: number }> = {};
    visibleInvoices.filter(i => i.status === 'overdue').forEach(i => {
      const c = i.currency ?? 'USD';
      if (!map[c]) map[c] = { total: 0, count: 0 };
      map[c].total += i.total;
      map[c].count++;
    });
    return map;
  }, [visibleInvoices]);

  const overdueCount = visibleInvoices.filter(i => i.status === 'overdue').length;

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

  const getProductPrice = (p: Product, currency: string = 'USD') => {
    if (currency === 'ZAR') return p.price_zar || p.price_usd;
    if (currency === 'THB') return p.price_thb || p.price_usd;
    return p.price_usd;
  };

  const pickProduct = (idx: number, productId: string) => {
    const p = products.find(pr => pr.id === productId);
    if (!p) return;
    const selectedCompany = clientCompanies.find(cc => cc.id === form.client_company_id);
    const clientCurrency = selectedCompany?.currency ?? 'USD';
    const unitPrice = getProductPrice(p, clientCurrency);
    setLineItems(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], product_id: productId, description: p.name, unit_price: unitPrice, total: next[idx].quantity * unitPrice };
      return next;
    });
  };

  const subtotal = lineItems.reduce((s, li) => s + li.total, 0);
  const taxAmount = subtotal * (form.tax_rate / 100);
  const grandTotal = subtotal + taxAmount;
  const nextNumber = `INV-${String((invoices.length || 0) + 1).padStart(4, '0')}`;

  const handleCreate = async () => {
    if (!form.client_company_id || lineItems.every(li => !li.description)) {
      toast({ title: 'Fill in client company and at least one line item', variant: 'destructive' });
      return;
    }
    const selectedCompany = clientCompanies.find(cc => cc.id === form.client_company_id);
    setSaving(true);
    const { data: inv, error } = await supabase.from('invoices').insert({
      invoice_number: nextNumber, client_id: selectedCompany?.user_id ?? form.client_id,
      client_company_id: form.client_company_id || null,
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
    setForm({ client_id: '', client_company_id: '', due_date: format(getFirstOfNextMonth(), 'yyyy-MM-dd'), notes: '', tax_rate: 0 });
    setSendDate(get25thOfCurrentMonth());
    setLineItems([{ description: '', quantity: 1, unit_price: 0, total: 0, product_id: null }]);
    setEditingInvoice(null);
  };

  const openEdit = async (inv: Invoice) => {
    setEditingInvoice(inv);
    setForm({
      client_id: inv.client_id,
      client_company_id: inv.client_company_id ?? '',
      due_date: inv.due_date ?? '',
      notes: inv.notes ?? '',
      tax_rate: inv.tax_rate,
    });
    setSendDate(inv.send_date ? new Date(inv.send_date + 'T00:00:00') : undefined);
    const { data: items } = await supabase.from('invoice_items').select('*').eq('invoice_id', inv.id);
    const loadedItems = (items && items.length > 0)
      ? items.map(it => ({ id: it.id, description: it.description, quantity: it.quantity, unit_price: it.unit_price, total: it.total, product_id: it.product_id }))
      : [{ description: '', quantity: 1, unit_price: 0, total: 0, product_id: null }];
    setLineItems(loadedItems);
    // Capture snapshot for change detection on sent invoices
    const formSnap = {
      client_id: inv.client_id,
      client_company_id: inv.client_company_id ?? '',
      due_date: inv.due_date ?? '',
      notes: inv.notes ?? '',
      tax_rate: inv.tax_rate,
      send_date: inv.send_date ?? '',
    };
    setOriginalFormSnapshot(JSON.stringify({ form: formSnap, lineItems: loadedItems }));
    setShowEdit(true);
  };

  const handleUpdate = async () => {
    if (!editingInvoice) return;
    if (!form.client_company_id || lineItems.every(li => !li.description)) {
      toast({ title: 'Fill in client company and at least one line item', variant: 'destructive' });
      return;
    }
    const selectedCompany = clientCompanies.find(cc => cc.id === form.client_company_id);
    setSaving(true);
    const { error } = await supabase.from('invoices').update({
      client_id: selectedCompany?.user_id ?? form.client_id,
      client_company_id: form.client_company_id || null,
      due_date: form.due_date || null,
      notes: form.notes || null,
      tax_rate: form.tax_rate,
      subtotal,
      total: grandTotal,
      send_date: sendDate ? format(sendDate, 'yyyy-MM-dd') : null,
    }).eq('id', editingInvoice.id);

    if (error) {
      toast({ title: 'Error updating invoice', description: error.message, variant: 'destructive' });
      setSaving(false); return;
    }

    // Replace line items: delete old, insert new
    await supabase.from('invoice_items').delete().eq('invoice_id', editingInvoice.id);
    const items = lineItems.filter(li => li.description).map(li => ({
      invoice_id: editingInvoice.id, description: li.description, quantity: li.quantity,
      unit_price: li.unit_price, total: li.total, product_id: li.product_id,
    }));
    if (items.length) {
      const { error: itemErr } = await supabase.from('invoice_items').insert(items);
      if (itemErr) toast({ title: 'Error updating line items', description: itemErr.message, variant: 'destructive' });
    }
    toast({ title: `Invoice ${editingInvoice.invoice_number} updated` });
    // Check if invoice was previously sent and changes were made
    const currentSnapshot = JSON.stringify({
      form: { ...form, send_date: sendDate ? format(sendDate, 'yyyy-MM-dd') : '' },
      lineItems: lineItems.map(li => ({ description: li.description, quantity: li.quantity, unit_price: li.unit_price, total: li.total, product_id: li.product_id })),
    });
    const hasChanges = currentSnapshot !== originalFormSnapshot;
    const wasSent = isSentAlready(editingInvoice.status);
    setSaving(false);
    setShowEdit(false);
    if (hasChanges && wasSent) {
      setResendAfterEditId(editingInvoice.id);
      resetForm();
      fetchAll();
    } else {
      resetForm();
      fetchAll();
    }
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
    setSendingId(invoiceId);
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
    setSendingId(null);
  };

  const handlePayClick = (inv: Invoice) => {
    setPayDialog(inv);
  };

  const handleManualPay = async () => {
    if (!payDialog) return;
    setPayingMethod('manual');
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('invoices')
        .update({ status: 'paid', paid_at: now, payment_method: 'manual' })
        .eq('id', payDialog.id);
      if (error) throw error;
      toast({ title: 'Invoice marked as paid (manual)', description: `${payDialog.invoice_number} has been marked as paid.` });
      fetchAll();
      if (showDetail?.id === payDialog.id) {
        setShowDetail({ ...payDialog, status: 'paid', paid_at: now, payment_method: 'manual' } as any);
      }
      setPayDialog(null);
    } catch (err: any) {
      toast({ title: 'Failed to mark as paid', description: err.message, variant: 'destructive' });
    }
    setPayingMethod(null);
  };

  const handleStripeCheckout = async () => {
    if (!payDialog) return;
    setPayingMethod('stripe');
    try {
      const { data, error } = await supabase.functions.invoke('create-stripe-checkout', {
        body: { invoice_id: payDialog.id },
      });
      if (error) throw error;
      if (data?.redirectUrl) {
        window.open(data.redirectUrl, '_blank');
        setPayDialog(null);
      }
    } catch (err: any) {
      toast({ title: 'Stripe checkout failed', description: err.message, variant: 'destructive' });
    }
    setPayingMethod(null);
  };

  const handleYocoCheckout = async () => {
    if (!payDialog) return;
    setPayingMethod('yoco');
    try {
      const { data, error } = await supabase.functions.invoke('create-yoco-checkout', {
        body: { invoice_id: payDialog.id },
      });
      if (error) throw error;
      if (data?.redirectUrl) {
        window.open(data.redirectUrl, '_blank');
        setPayDialog(null);
      }
    } catch (err: any) {
      toast({ title: 'Yoco checkout failed', description: err.message, variant: 'destructive' });
    }
    setPayingMethod(null);
  };

  const handleWisePayment = () => {
    const wiseLink = paymentSettings?.wise_payment_link;
    if (wiseLink) {
      window.open(wiseLink, '_blank');
      setPayDialog(null);
    }
  };

  // Bulk actions
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === paginated.length && paginated.every(i => selectedIds.has(i.id))) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginated.map(i => i.id)));
    }
  };

  const selectedInvoices = invoices.filter(i => selectedIds.has(i.id));

  const bulkMarkPaid = async () => {
    const payable = selectedInvoices.filter(i => isPayableStatus(i.status));
    if (!payable.length) { toast({ title: 'No unpaid invoices selected', variant: 'destructive' }); return; }
    setBulkLoading('paid');
    const now = new Date().toISOString();
    for (const inv of payable) {
      await supabase.from('invoices').update({ status: 'paid' as const, paid_at: now, payment_method: 'manual' as const }).eq('id', inv.id);
    }
    toast({ title: `${payable.length} invoice(s) marked as paid` });
    setSelectedIds(new Set());
    setBulkLoading(null);
    fetchAll();
  };

  const bulkSendReminder = async () => {
    const sendable = selectedInvoices.filter(i => !['paid', 'cancelled'].includes(i.status));
    if (!sendable.length) { toast({ title: 'No sendable invoices selected', variant: 'destructive' }); return; }
    setBulkLoading('send');
    let sent = 0;
    for (const inv of sendable) {
      try {
        await supabase.functions.invoke('send-invoice-email', { body: { invoice_id: inv.id, force_resend: true } });
        sent++;
      } catch { /* skip failed */ }
    }
    toast({ title: `${sent} reminder(s) sent` });
    setSelectedIds(new Set());
    setBulkLoading(null);
    fetchAll();
  };

  const bulkUpdateStatus = async (newStatus: string) => {
    if (!selectedIds.size) return;
    setBulkLoading('status');
    const extra: Record<string, unknown> = { status: newStatus };
    if (newStatus === 'paid') extra.paid_at = new Date().toISOString();
    for (const id of selectedIds) {
      await supabase.from('invoices').update(extra as any).eq('id', id);
    }
    toast({ title: `${selectedIds.size} invoice(s) updated to ${newStatus}` });
    setSelectedIds(new Set());
    setBulkLoading(null);
    fetchAll();
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
      {(() => {
        const currencyOrder = ['ZAR', 'THB', 'USD'];
        const allCurrencies = [...new Set([
          ...Object.keys(outstandingByCurrency),
          ...Object.keys(overdueByCurrency),
        ])].sort((a, b) => {
          const ai = currencyOrder.indexOf(a);
          const bi = currencyOrder.indexOf(b);
          return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
        });

        return (
          <>
            {/* Desktop: 3 columns, each currency is a column with Outstanding on top, Overdue below */}
            <div className="hidden lg:grid lg:grid-cols-3 gap-3">
              {allCurrencies.length === 0 ? (
                <div className="space-y-3">
                  <StatCard label="Outstanding" value={fmtCurrency(0)} subtitle="0 invoice(s)" />
                  <StatCard label="Overdue" value={fmtCurrency(0)} subtitle="0 invoice(s)" />
                </div>
              ) : (
                allCurrencies.map(currency => {
                  const out = outstandingByCurrency[currency];
                  const od = overdueByCurrency[currency];
                  return (
                    <div key={currency} className="space-y-3">
                      <StatCard
                        label={`Outstanding (${currency})`}
                        value={fmtCurrency(out?.total ?? 0, currency)}
                        subtitle={`${out?.count ?? 0} invoice(s)`}
                      />
                      {od ? (
                        <StatCard
                          label={`Overdue (${currency})`}
                          value={fmtCurrency(od.total, currency)}
                          icon={AlertTriangle}
                          iconColor="text-orange-400"
                          valueColor="text-orange-400"
                          variant="alert"
                          alertColor="orange-500"
                          subtitle={`${od.count} invoice(s)`}
                        />
                      ) : (
                        <StatCard
                          label={`Overdue (${currency})`}
                          value={fmtCurrency(0, currency)}
                          subtitle="0 invoice(s)"
                        />
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Mobile/Tablet: 2 columns, Outstanding | Overdue per currency row */}
            <div className="grid gap-3 grid-cols-2 lg:hidden">
              {allCurrencies.length === 0 ? (
                <>
                  <StatCard label="Outstanding" value={fmtCurrency(0)} subtitle="0 invoice(s)" />
                  <StatCard label="Overdue" value={fmtCurrency(0)} subtitle="0 invoice(s)" />
                </>
              ) : (
                allCurrencies.map(currency => {
                  const out = outstandingByCurrency[currency];
                  const od = overdueByCurrency[currency];
                  return (
                    <React.Fragment key={currency}>
                      <StatCard
                        label={`Outstanding (${currency})`}
                        value={fmtCurrency(out?.total ?? 0, currency)}
                        subtitle={`${out?.count ?? 0} invoice(s)`}
                      />
                      {od ? (
                        <StatCard
                          label={`Overdue (${currency})`}
                          value={fmtCurrency(od.total, currency)}
                          icon={AlertTriangle}
                          iconColor="text-orange-400"
                          valueColor="text-orange-400"
                          variant="alert"
                          alertColor="orange-500"
                          subtitle={`${od.count} invoice(s)`}
                        />
                      ) : (
                        <StatCard
                          label={`Overdue (${currency})`}
                          value={fmtCurrency(0, currency)}
                          subtitle="0 invoice(s)"
                        />
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </div>
          </>
        );
      })()}

      <AdminToolbar title="Invoices">
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
            {visibleStatuses.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
          </SelectContent>
        </Select>
        {isAdmin && (
          <Button onClick={() => { resetForm(); setShowCreate(true); }} className="gap-1.5 h-9">
            <Plus className="h-4 w-4" /> New Invoice
          </Button>
        )}
      </AdminToolbar>

      {/* Bulk action bar */}
      {isAdmin && selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2.5 animate-in fade-in duration-200">
          <Checkbox
            checked={true}
            onCheckedChange={() => setSelectedIds(new Set())}
            className="border-primary data-[state=checked]:bg-primary"
          />
          <span className="font-mono text-xs text-foreground">{selectedIds.size} selected</span>
          <div className="flex gap-2 ml-auto">
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1.5 font-mono text-xs border-primary/50 text-primary hover:bg-primary/10"
              onClick={bulkMarkPaid}
              disabled={!!bulkLoading}
            >
              {bulkLoading === 'paid' ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
              Mark Paid
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1.5 font-mono text-xs border-primary/50 text-primary hover:bg-primary/10"
              onClick={bulkSendReminder}
              disabled={!!bulkLoading}
            >
              {bulkLoading === 'send' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
              Send Reminders
            </Button>
            <Select onValueChange={bulkUpdateStatus} disabled={!!bulkLoading}>
              <SelectTrigger className="h-7 w-32 border-border bg-card font-mono text-xs">
                <SelectValue placeholder="Set Status" />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 font-mono text-xs text-muted-foreground"
              onClick={() => setSelectedIds(new Set())}
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <PageLoader />
      ) : fetchError ? (
        <ErrorState message="Failed to load invoices." onRetry={fetchAll} />
      ) : processed.length === 0 ? (
        <EmptyState message="No invoices found." />
      ) : (
        <>
          {/* Mobile card view */}
          <div className="space-y-3 lg:hidden">
            {paginated.map(inv => {
              const isOverdue = inv.status === 'overdue';
              const isUnpaid = isPayableStatus(inv.status);
              return (
                <div key={inv.id} className={`rounded-lg border bg-card/50 p-3 space-y-2 ${isOverdue ? 'border-orange-500/40' : 'border-border'} ${selectedIds.has(inv.id) ? 'ring-1 ring-primary/50' : ''}`}>
                  <div className="flex items-center justify-between gap-2">
                    {isAdmin && (
                      <Checkbox
                        checked={selectedIds.has(inv.id)}
                        onCheckedChange={() => toggleSelect(inv.id)}
                        className="border-muted-foreground/50 shrink-0"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-sm font-medium truncate">
                        {isOverdue && <AlertTriangle className="inline h-3.5 w-3.5 text-orange-400 mr-1 -mt-0.5" />}
                        {inv.invoice_number}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{inv.client_name}</p>
                    </div>
                    <Badge className={`${STATUS_COLORS[inv.status]} border-0 capitalize shrink-0`}>{inv.status}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className={`font-mono font-bold text-sm ${isOverdue ? 'text-orange-400' : ''}`}>{fmtCurrency(inv.total, inv.currency)}</span>
                    <span className="text-muted-foreground">Due: {inv.due_date ? format(new Date(inv.due_date), 'MMM d') : '—'}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1 border-t border-border/30">
                    {isUnpaid && (
                      <Button variant="outline" size="sm" className="h-7 gap-1 font-mono text-xs" onClick={() => handlePayClick(inv)}>
                        <CreditCard className="h-3 w-3" /> Pay Now
                      </Button>
                    )}
                    {isAdmin && inv.status !== 'cancelled' && (
                      <Button
                        variant="outline"
                        size="icon"
                        className={`h-7 w-7 ${isSentAlready(inv.status) ? 'border-orange-500/50 text-orange-400 hover:bg-orange-500/10' : ''}`}
                        onClick={() => isSentAlready(inv.status) ? setResendConfirmId(inv.id) : handleSendEmail(inv.id)}
                        disabled={sendingId === inv.id}
                      >
                        {sendingId === inv.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-7 w-7 ml-auto" onClick={() => viewDetail(inv)}>
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    {isAdmin && inv.status !== 'cancelled' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`h-7 w-7 ${isSentAlready(inv.status) ? 'text-orange-400' : ''}`}
                        onClick={() => isSentAlready(inv.status) ? setEditSentInvoice(inv) : openEdit(inv)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {isAdmin && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(inv.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop table view */}
          <div className="rounded-lg border border-border bg-card/50 overflow-x-auto hidden lg:block">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50">
                  {isAdmin && (
                    <TableHead className="w-10">
                      <Checkbox
                        checked={paginated.length > 0 && paginated.every(i => selectedIds.has(i.id))}
                        onCheckedChange={toggleSelectAll}
                        className="border-muted-foreground/50"
                      />
                    </TableHead>
                  )}
                  <SortHeader field="invoice_number">Invoice #</SortHeader>
                  <TableHead className="font-mono text-xs">Client</TableHead>
                  <SortHeader field="status">Status</SortHeader>
                  <SortHeader field="due_date">Due Date</SortHeader>
                  <TableHead className="font-mono text-xs">Send Date</TableHead>
                  <SortHeader field="total"><span className="ml-auto">Total</span></SortHeader>
                  <TableHead className="font-mono text-xs text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map(inv => {
                  const isOverdue = inv.status === 'overdue';
                  const isUnpaid = isPayableStatus(inv.status);
                  return (
                    <TableRow
                      key={inv.id}
                      className={`border-border/30 transition-colors hover:bg-muted/40 hover:outline hover:outline-1 hover:outline-border ${
                        isOverdue ? 'bg-orange-500/5 border-l-2 border-l-orange-500' : ''
                      } ${selectedIds.has(inv.id) ? 'bg-primary/5' : ''}`}
                    >
                      {isAdmin && (
                        <TableCell className="w-10">
                          <Checkbox
                            checked={selectedIds.has(inv.id)}
                            onCheckedChange={() => toggleSelect(inv.id)}
                            className="border-muted-foreground/50"
                          />
                        </TableCell>
                      )}
                      <TableCell className="font-mono text-sm">
                        {isOverdue && <AlertTriangle className="inline h-3.5 w-3.5 text-orange-400 mr-1.5 -mt-0.5" />}
                        {inv.invoice_number}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{inv.client_name}</span>
                        {inv.client_email && (
                          <a href={`mailto:${inv.client_email}`} className="block text-xs text-muted-foreground hover:text-primary transition-colors underline-offset-2 hover:underline">
                            {inv.client_email}
                          </a>
                        )}
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
                      <TableCell className={`text-xs ${isOverdue ? 'text-orange-400' : 'text-muted-foreground'}`}>
                        {inv.due_date ? format(new Date(inv.due_date), 'MMM d, yyyy') : '—'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {inv.send_date ? format(new Date(inv.send_date), 'MMM d') : '—'}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        <span className={isOverdue ? 'text-orange-400 font-bold' : ''}>{fmtCurrency(inv.total, inv.currency)}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
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
                              Pay Now
                            </Button>
                          )}
                          {isAdmin && inv.status !== 'cancelled' && (
                            <Button
                              variant="outline"
                              size="icon"
                              className={`h-7 w-7 ${isSentAlready(inv.status) ? 'border-orange-500/50 text-orange-400 hover:bg-orange-500/10' : 'border-primary/50 text-primary hover:bg-primary/10'}`}
                              onClick={() => isSentAlready(inv.status) ? setResendConfirmId(inv.id) : handleSendEmail(inv.id)}
                              disabled={sendingId === inv.id}
                            >
                              {sendingId === inv.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                            </Button>
                          )}
                          {isAdmin && inv.status !== 'cancelled' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className={`h-8 w-8 ${isSentAlready(inv.status) ? 'text-orange-400' : ''}`}
                              onClick={() => isSentAlready(inv.status) ? setEditSentInvoice(inv) : openEdit(inv)}
                            >
                              <Pencil className="h-4 w-4" />
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

          <AdminPagination page={page} totalPages={totalPages} totalItems={processed.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
        </>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-mono">New Invoice — {nextNumber}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="font-mono text-xs">Client Company</Label>
                <Select value={form.client_company_id} onValueChange={v => {
                  const cc = clientCompanies.find(c => c.id === v);
                  setForm(f => ({ ...f, client_company_id: v, client_id: cc?.user_id ?? '' }));
                }}>
                  <SelectTrigger className="bg-background border-border"><SelectValue placeholder="Select company" /></SelectTrigger>
                  <SelectContent>
                    {clientCompanies.map(cc => (
                      <SelectItem key={cc.id} value={cc.id}>
                        {cc.company_name} — {cc.display_name ?? cc.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="font-mono text-xs">Due Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal bg-background border-border",
                        !form.due_date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.due_date ? format(new Date(form.due_date + 'T00:00:00'), 'MMM d, yyyy') : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={form.due_date ? new Date(form.due_date + 'T00:00:00') : undefined}
                      onSelect={(date) => setForm(f => ({ ...f, due_date: date ? format(date, 'yyyy-MM-dd') : '' }))}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Send Date Picker */}
            <div>
              <Label className="font-mono text-xs">Email Send Date</Label>
              <p className="text-[10px] text-muted-foreground mb-1">Invoice will be emailed to the client on this date (defaults to 25th of current month)</p>
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
                    <div key={idx} className="space-y-2 sm:space-y-0 sm:grid sm:grid-cols-12 sm:gap-2 sm:items-end border-b border-border/30 pb-2 sm:border-0 sm:pb-0">
                     <div className="sm:col-span-4">
                      {idx === 0 && <span className="text-[10px] font-mono text-muted-foreground">Product</span>}
                      <ProductCombobox
                        products={products}
                        value={li.product_id}
                        onSelect={(p) => pickProduct(idx, p.id)}
                        placeholder="Search products..."
                      />
                    </div>
                    <div className="sm:col-span-3">
                      {idx === 0 && <span className="text-[10px] font-mono text-muted-foreground hidden sm:block">Description</span>}
                      <Input value={li.description} onChange={e => updateLineItem(idx, 'description', e.target.value)} className="h-9 text-xs bg-background border-border" placeholder="Description" />
                    </div>
                    <div className="grid grid-cols-3 gap-2 sm:contents">
                      <div className="sm:col-span-1">
                        <span className="text-[10px] font-mono text-muted-foreground sm:hidden">Qty</span>
                        {idx === 0 && <span className="text-[10px] font-mono text-muted-foreground hidden sm:block">Qty</span>}
                        <Input type="number" min={1} value={li.quantity} onChange={e => updateLineItem(idx, 'quantity', +e.target.value)} className="h-9 text-xs bg-background border-border" />
                      </div>
                      <div className="sm:col-span-2">
                        <span className="text-[10px] font-mono text-muted-foreground sm:hidden">Price</span>
                        {idx === 0 && <span className="text-[10px] font-mono text-muted-foreground hidden sm:block">Price</span>}
                        <Input type="number" min={0} step={0.01} value={li.unit_price} onChange={e => updateLineItem(idx, 'unit_price', +e.target.value)} className="h-9 text-xs bg-background border-border" />
                      </div>
                      <div className="flex items-end justify-between sm:col-span-1">
                        <span className="font-mono text-xs text-muted-foreground pb-2 sm:hidden">{fmtCurrency(li.total, profiles.find(p => p.user_id === form.client_id)?.currency)}</span>
                        <span className="hidden sm:block sm:text-right font-mono text-xs text-muted-foreground pt-1 w-full">{fmtCurrency(li.total, profiles.find(p => p.user_id === form.client_id)?.currency)}</span>
                        {lineItems.length > 1 && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0" onClick={() => setLineItems(prev => prev.filter((_, i) => i !== idx))}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
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
                {(() => { const c = profiles.find(p => p.user_id === form.client_id)?.currency; return (<>
                  <p className="font-mono text-xs text-muted-foreground">Subtotal: {fmtCurrency(subtotal, c)}</p>
                  <p className="font-mono text-xs text-muted-foreground">Tax: {fmtCurrency(taxAmount, c)}</p>
                  <p className="font-mono text-sm font-bold text-foreground">Total: {fmtCurrency(grandTotal, c)}</p>
                </>); })()}
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

      {/* Edit Dialog */}
      <Dialog open={showEdit} onOpenChange={(open) => { if (!open) { setShowEdit(false); resetForm(); } }}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-mono">Edit Invoice — {editingInvoice?.invoice_number}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="font-mono text-xs">Client Company</Label>
                <Select value={form.client_company_id} onValueChange={v => {
                  const cc = clientCompanies.find(c => c.id === v);
                  setForm(f => ({ ...f, client_company_id: v, client_id: cc?.user_id ?? '' }));
                }}>
                  <SelectTrigger className="bg-background border-border"><SelectValue placeholder="Select company" /></SelectTrigger>
                  <SelectContent>
                    {clientCompanies.map(cc => (
                      <SelectItem key={cc.id} value={cc.id}>
                        {cc.company_name} — {cc.display_name ?? cc.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="font-mono text-xs">Due Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal bg-background border-border", !form.due_date && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.due_date ? format(new Date(form.due_date + 'T00:00:00'), 'MMM d, yyyy') : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={form.due_date ? new Date(form.due_date + 'T00:00:00') : undefined} onSelect={(date) => setForm(f => ({ ...f, due_date: date ? format(date, 'yyyy-MM-dd') : '' }))} initialFocus className={cn("p-3 pointer-events-auto")} />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div>
              <Label className="font-mono text-xs">Email Send Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal bg-background border-border", !sendDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {sendDate ? format(sendDate, 'PPP') : <span>Pick a send date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={sendDate} onSelect={setSendDate} initialFocus className={cn("p-3 pointer-events-auto")} />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label className="font-mono text-xs mb-2 block">Line Items</Label>
              <div className="space-y-2">
                {lineItems.map((li, idx) => (
                  <div key={idx} className="space-y-2 sm:space-y-0 sm:grid sm:grid-cols-12 sm:gap-2 sm:items-end border-b border-border/30 pb-2 sm:border-0 sm:pb-0">
                    <div className="sm:col-span-4">
                      {idx === 0 && <span className="text-[10px] font-mono text-muted-foreground">Product</span>}
                      <ProductCombobox products={products} value={li.product_id} onSelect={(p) => pickProduct(idx, p.id)} placeholder="Search products..." />
                    </div>
                    <div className="sm:col-span-3">
                      {idx === 0 && <span className="text-[10px] font-mono text-muted-foreground hidden sm:block">Description</span>}
                      <Input value={li.description} onChange={e => updateLineItem(idx, 'description', e.target.value)} className="h-9 text-xs bg-background border-border" placeholder="Description" />
                    </div>
                    <div className="grid grid-cols-3 gap-2 sm:contents">
                      <div className="sm:col-span-1">
                        <span className="text-[10px] font-mono text-muted-foreground sm:hidden">Qty</span>
                        {idx === 0 && <span className="text-[10px] font-mono text-muted-foreground hidden sm:block">Qty</span>}
                        <Input type="number" min={1} value={li.quantity} onChange={e => updateLineItem(idx, 'quantity', +e.target.value)} className="h-9 text-xs bg-background border-border" />
                      </div>
                      <div className="sm:col-span-2">
                        <span className="text-[10px] font-mono text-muted-foreground sm:hidden">Price</span>
                        {idx === 0 && <span className="text-[10px] font-mono text-muted-foreground hidden sm:block">Price</span>}
                        <Input type="number" min={0} step={0.01} value={li.unit_price} onChange={e => updateLineItem(idx, 'unit_price', +e.target.value)} className="h-9 text-xs bg-background border-border" />
                      </div>
                      <div className="flex items-end justify-between sm:col-span-1">
                        <span className="font-mono text-xs text-muted-foreground pb-2 sm:hidden">{fmtCurrency(li.total, profiles.find(p => p.user_id === form.client_id)?.currency)}</span>
                        <span className="hidden sm:block sm:text-right font-mono text-xs text-muted-foreground pt-1 w-full">{fmtCurrency(li.total, profiles.find(p => p.user_id === form.client_id)?.currency)}</span>
                        {lineItems.length > 1 && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0" onClick={() => setLineItems(prev => prev.filter((_, i) => i !== idx))}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
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
                {(() => { const c = profiles.find(p => p.user_id === form.client_id)?.currency; return (<>
                  <p className="font-mono text-xs text-muted-foreground">Subtotal: {fmtCurrency(subtotal, c)}</p>
                  <p className="font-mono text-xs text-muted-foreground">Tax: {fmtCurrency(taxAmount, c)}</p>
                  <p className="font-mono text-sm font-bold text-foreground">Total: {fmtCurrency(grandTotal, c)}</p>
                </>); })()}
              </div>
            </div>
            <div>
              <Label className="font-mono text-xs">Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="bg-background border-border" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowEdit(false); resetForm(); }}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                        <TableCell className="text-right font-mono text-sm">{fmtCurrency(it.unit_price, showDetail?.currency)}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{fmtCurrency(it.total, showDetail?.currency)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              <div className="text-right space-y-1 border-t border-border/50 pt-3">
                <p className="font-mono text-xs text-muted-foreground">Subtotal: {fmtCurrency(showDetail.subtotal, showDetail.currency)}</p>
                <p className="font-mono text-xs text-muted-foreground">Tax ({showDetail.tax_rate}%): {fmtCurrency(showDetail.subtotal * showDetail.tax_rate / 100, showDetail.currency)}</p>
                <p className="font-mono text-sm font-bold text-foreground">Total: {fmtCurrency(showDetail.total, showDetail.currency)}</p>
              </div>

              {/* Email Actions */}
              {isAdmin && showDetail.status !== 'cancelled' && (
                <div className="flex gap-2">
                  {detailEmails.some(e => e.status === 'sent') ? (
                    <Button
                      className="flex-1 gap-2 font-mono border-orange-500/50 text-orange-400 hover:bg-orange-500/10"
                      variant="outline"
                      onClick={() => setResendConfirmId(showDetail.id)}
                      disabled={sendingId === showDetail.id}
                    >
                      {sendingId === showDetail.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      Resend Email
                    </Button>
                  ) : (
                    <Button
                      className="flex-1 gap-2 font-mono"
                      onClick={() => handleSendEmail(showDetail.id)}
                      disabled={sendingId === showDetail.id}
                    >
                      {sendingId === showDetail.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      Send Email Now
                    </Button>
                  )}
                </div>
              )}

              {isPayableStatus(showDetail.status) && (
                <Button
                  className={`w-full gap-2 font-mono ${
                    showDetail.status === 'overdue'
                      ? 'bg-orange-500 hover:bg-orange-600 text-white'
                      : ''
                  }`}
                  onClick={() => handlePayClick(showDetail)}
                >
                  <CreditCard className="h-4 w-4" />
                  Pay Now — {fmtCurrency(showDetail.total, showDetail.currency)}
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

      {/* Payment Options Dialog */}
      <Dialog open={!!payDialog} onOpenChange={() => setPayDialog(null)}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-mono flex items-center gap-2">
              <CircleDollarSign className="h-5 w-5 text-primary" />
              Pay {payDialog?.invoice_number}
            </DialogTitle>
          </DialogHeader>
          {payDialog && (
            <div className="space-y-4">
              <div className="rounded-lg border border-border/50 bg-background/50 p-3 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Client</span>
                  <span>{payDialog.client_name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-mono font-bold">{fmtCurrency(payDialog.total, payDialog.currency)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Currency</span>
                  <span className="font-mono">{payDialog.currency ?? 'USD'}</span>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">Choose a payment method:</p>

              <div className="space-y-2">
                {/* Stripe */}
                {paymentSettings?.stripe_enabled && (
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-3 h-12 font-mono text-sm border-border hover:border-primary/50 hover:bg-primary/5"
                    onClick={handleStripeCheckout}
                    disabled={!!payingMethod}
                  >
                    {payingMethod === 'stripe' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4 text-primary" />}
                    <div className="text-left">
                      <span className="block">Pay with Stripe</span>
                      <span className="text-[10px] text-muted-foreground">Credit / Debit Card</span>
                    </div>
                    <ExternalLink className="h-3 w-3 ml-auto text-muted-foreground" />
                  </Button>
                )}

                {/* Yoco - only for ZAR */}
                {paymentSettings?.yoco_enabled && (payDialog.currency === 'ZAR') && (
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-3 h-12 font-mono text-sm border-border hover:border-primary/50 hover:bg-primary/5"
                    onClick={handleYocoCheckout}
                    disabled={!!payingMethod}
                  >
                    {payingMethod === 'yoco' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4 text-primary" />}
                    <div className="text-left">
                      <span className="block">Pay with Yoco</span>
                      <span className="text-[10px] text-muted-foreground">South Africa (ZAR)</span>
                    </div>
                    <ExternalLink className="h-3 w-3 ml-auto text-muted-foreground" />
                  </Button>
                )}

                {/* Wise */}
                {paymentSettings?.wise_payment_link && (
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-3 h-12 font-mono text-sm border-border hover:border-primary/50 hover:bg-primary/5"
                    onClick={handleWisePayment}
                    disabled={!!payingMethod}
                  >
                    <ExternalLink className="h-4 w-4 text-primary" />
                    <div className="text-left">
                      <span className="block">Pay via Wise</span>
                      <span className="text-[10px] text-muted-foreground">Bank Transfer</span>
                    </div>
                    <ExternalLink className="h-3 w-3 ml-auto text-muted-foreground" />
                  </Button>
                )}

                {/* Manual */}
                {isAdmin && (
                  <div className="pt-2 border-t border-border/50">
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-3 h-10 font-mono text-xs text-muted-foreground hover:text-foreground"
                      onClick={handleManualPay}
                      disabled={!!payingMethod}
                    >
                      {payingMethod === 'manual' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                      Mark as Paid (Manual Override)
                    </Button>
                    <p className="text-[10px] text-muted-foreground px-3 mt-1">
                      ⚠ This marks the invoice as paid without processing an actual payment.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Delete Invoice?"
        description="This will permanently delete this invoice and all its line items."
        confirmLabel="Delete"
        onConfirm={handleDelete}
      />

      <ConfirmDialog
        open={!!resendConfirmId}
        onOpenChange={() => setResendConfirmId(null)}
        title="Email Already Sent"
        description="This invoice has already been emailed to the client. Are you sure you want to resend it?"
        confirmLabel="Resend"
        variant="default"
        onConfirm={() => { handleSendEmail(resendConfirmId!, true); setResendConfirmId(null); }}
      />

      <ConfirmDialog
        open={!!editSentInvoice}
        onOpenChange={() => setEditSentInvoice(null)}
        title="Editing Sent Invoice"
        description="This invoice has already been sent to the client. Changes won't be reflected in emails already delivered. Continue?"
        confirmLabel="Edit Anyway"
        variant="default"
        onConfirm={() => { openEdit(editSentInvoice!); setEditSentInvoice(null); }}
      />

      <ConfirmDialog
        open={!!resendAfterEditId}
        onOpenChange={() => setResendAfterEditId(null)}
        title="Invoice Updated"
        description="This invoice has been sent before. Would you like to resend the updated version to the client?"
        confirmLabel="Resend Now"
        cancelLabel="Not Now"
        variant="default"
        onConfirm={() => { handleSendEmail(resendAfterEditId!, true); setResendAfterEditId(null); }}
      />
    </div>
  );
}
