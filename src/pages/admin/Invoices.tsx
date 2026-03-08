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
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Trash2, Eye, Loader2 } from 'lucide-react';

type Invoice = {
  id: string;
  invoice_number: string;
  client_id: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  subtotal: number;
  tax_rate: number;
  total: number;
  due_date: string | null;
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

type Profile = { user_id: string; display_name: string | null; email: string | null };
type Product = { id: string; name: string; price_usd: number };

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  sent: 'bg-blue-500/20 text-blue-400',
  paid: 'bg-green-500/20 text-green-400',
  overdue: 'bg-destructive/20 text-destructive',
  cancelled: 'bg-muted text-muted-foreground line-through',
};

const STATUSES = ['draft', 'sent', 'paid', 'overdue', 'cancelled'] as const;

export default function Invoices() {
  const { toast } = useToast();
  const { isAdmin } = useAuth();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Dialog state
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState<Invoice | null>(null);
  const [detailItems, setDetailItems] = useState<InvoiceItem[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Create form
  const [form, setForm] = useState({
    client_id: '',
    due_date: '',
    notes: '',
    tax_rate: 0,
  });
  const [lineItems, setLineItems] = useState<InvoiceItem[]>([
    { description: '', quantity: 1, unit_price: 0, total: 0, product_id: null },
  ]);

  const fetchAll = async () => {
    setLoading(true);
    const [invRes, profRes, prodRes] = await Promise.all([
      supabase.from('invoices').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('user_id, display_name, email'),
      supabase.from('products').select('id, name, price_usd').eq('active', true),
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

  const filtered = useMemo(
    () => filterStatus === 'all' ? invoices : invoices.filter(i => i.status === filterStatus),
    [invoices, filterStatus],
  );

  // Line item helpers
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

  // Generate invoice number
  const nextNumber = `INV-${String((invoices.length || 0) + 1).padStart(4, '0')}`;

  const handleCreate = async () => {
    if (!form.client_id || lineItems.every(li => !li.description)) {
      toast({ title: 'Fill in client and at least one line item', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { data: inv, error } = await supabase.from('invoices').insert({
      invoice_number: nextNumber,
      client_id: form.client_id,
      due_date: form.due_date || null,
      notes: form.notes || null,
      tax_rate: form.tax_rate,
      subtotal,
      total: grandTotal,
      status: 'draft',
    }).select().single();

    if (error || !inv) {
      toast({ title: 'Error creating invoice', description: error?.message, variant: 'destructive' });
      setSaving(false);
      return;
    }

    const items = lineItems.filter(li => li.description).map(li => ({
      invoice_id: inv.id,
      description: li.description,
      quantity: li.quantity,
      unit_price: li.unit_price,
      total: li.total,
      product_id: li.product_id,
    }));

    if (items.length) {
      const { error: itemErr } = await supabase.from('invoice_items').insert(items);
      if (itemErr) toast({ title: 'Error adding line items', description: itemErr.message, variant: 'destructive' });
    }

    toast({ title: `Invoice ${nextNumber} created` });
    setSaving(false);
    setShowCreate(false);
    resetForm();
    fetchAll();
  };

  const resetForm = () => {
    setForm({ client_id: '', due_date: '', notes: '', tax_rate: 0 });
    setLineItems([{ description: '', quantity: 1, unit_price: 0, total: 0, product_id: null }]);
  };

  const updateStatus = async (id: string, status: string) => {
    const extra: any = { status };
    if (status === 'paid') extra.paid_at = new Date().toISOString();
    const { error } = await supabase.from('invoices').update(extra).eq('id', id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: `Status updated to ${status}` });
    fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await supabase.from('invoice_items').delete().eq('invoice_id', deleteId);
    const { error } = await supabase.from('invoices').delete().eq('id', deleteId);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Invoice deleted' });
    setDeleteId(null);
    fetchAll();
  };

  const viewDetail = async (inv: Invoice) => {
    setShowDetail(inv);
    const { data } = await supabase.from('invoice_items').select('*').eq('invoice_id', inv.id);
    setDetailItems((data ?? []) as InvoiceItem[]);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-mono text-2xl font-bold text-foreground">Invoices</h1>
        <div className="flex gap-2">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-36 bg-card border-border">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
            </SelectContent>
          </Select>
          {isAdmin && (
            <Button onClick={() => { resetForm(); setShowCreate(true); }} className="gap-1.5">
              <Plus className="h-4 w-4" /> New Invoice
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground font-mono text-sm">No invoices found.</p>
      ) : (
        <div className="rounded-lg border border-border bg-card/50 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50">
                <TableHead className="font-mono text-xs">Invoice #</TableHead>
                <TableHead className="font-mono text-xs">Client</TableHead>
                <TableHead className="font-mono text-xs">Status</TableHead>
                <TableHead className="font-mono text-xs text-right">Total</TableHead>
                <TableHead className="font-mono text-xs">Due Date</TableHead>
                <TableHead className="font-mono text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(inv => (
                <TableRow key={inv.id} className="border-border/30">
                  <TableCell className="font-mono text-sm">{inv.invoice_number}</TableCell>
                  <TableCell>
                    <span className="text-sm">{inv.client_name}</span>
                    <span className="block text-xs text-muted-foreground">{inv.client_email}</span>
                  </TableCell>
                  <TableCell>
                    <Select value={inv.status} onValueChange={(v) => updateStatus(inv.id, v)}>
                      <SelectTrigger className="h-7 w-28 border-0 bg-transparent p-0">
                        <Badge className={`${STATUS_COLORS[inv.status]} border-0 capitalize`}>{inv.status}</Badge>
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">${inv.total.toFixed(2)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {inv.due_date ? format(new Date(inv.due_date), 'MMM d, yyyy') : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => viewDetail(inv)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(inv.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
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
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
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

            <div>
              <Label className="font-mono text-xs mb-2 block">Line Items</Label>
              <div className="space-y-2">
                {lineItems.map((li, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-4">
                      {idx === 0 && <span className="text-[10px] font-mono text-muted-foreground">Product / Description</span>}
                      <Select value={li.product_id ?? ''} onValueChange={v => pickProduct(idx, v)}>
                        <SelectTrigger className="bg-background border-border h-9 text-xs">
                          <SelectValue placeholder="Product..." />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name} — ${p.price_usd}</SelectItem>)}
                        </SelectContent>
                      </Select>
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
        <DialogContent className="max-w-lg bg-card border-border">
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
              {showDetail.notes && <p className="text-sm text-muted-foreground italic">{showDetail.notes}</p>}
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
