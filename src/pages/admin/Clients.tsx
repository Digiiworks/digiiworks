import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Plus, Trash2, Pencil, Loader2, Search,
  User, Mail, Phone, Building2, MapPin, FileText,
} from 'lucide-react';
import StatCard from '@/components/admin/StatCard';
import AdminToolbar from '@/components/admin/AdminToolbar';
import AdminPagination from '@/components/admin/AdminPagination';
import EmptyState from '@/components/admin/EmptyState';
import PageLoader from '@/components/admin/PageLoader';
import ConfirmDialog from '@/components/ConfirmDialog';
import RecurringServicesSelector, { type RecurringService } from '@/components/admin/RecurringServicesSelector';

type Client = {
  id: string;
  user_id: string;
  email: string | null;
  display_name: string | null;
  phone: string | null;
  company: string | null;
  address: string | null;
  notes: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  // enriched
  invoice_count?: number;
  outstanding?: number;
  role?: string;
  recurring_count?: number;
};

const PAGE_SIZE = 10;

export default function Clients() {
  const { toast } = useToast();

  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Dialog state
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form
  const [form, setForm] = useState({
    email: '', display_name: '', phone: '', company: '', address: '', notes: '', country: 'global' as 'global' | 'south_africa' | 'thailand',
  });
  const [recurringServices, setRecurringServices] = useState<RecurringService[]>([]);

  const fetchClients = async () => {
    setLoading(true);

    // Get all profiles that have 'client' role
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'client');

    const clientUserIds = (roleData ?? []).map(r => r.user_id);

    if (clientUserIds.length === 0) {
      setClients([]);
      setLoading(false);
      return;
    }

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .in('user_id', clientUserIds)
      .order('created_at', { ascending: false });

    // Get invoice stats per client
    const { data: invoiceData } = await supabase
      .from('invoices')
      .select('client_id, status, total');

    const invoiceMap = new Map<string, { count: number; outstanding: number }>();
    (invoiceData ?? []).forEach(inv => {
      const existing = invoiceMap.get(inv.client_id) ?? { count: 0, outstanding: 0 };
      existing.count++;
      if (['draft', 'sent', 'overdue'].includes(inv.status)) {
        existing.outstanding += Number(inv.total);
      }
      invoiceMap.set(inv.client_id, existing);
    });

    // Get recurring service counts per client
    const { data: recurringData } = await supabase
      .from('client_recurring_services')
      .select('client_id')
      .eq('active', true);

    const recurringMap = new Map<string, number>();
    (recurringData ?? []).forEach((r: any) => {
      recurringMap.set(r.client_id, (recurringMap.get(r.client_id) ?? 0) + 1);
    });

    const enriched: Client[] = (profileData ?? []).map(p => ({
      ...p,
      invoice_count: invoiceMap.get(p.user_id)?.count ?? 0,
      outstanding: invoiceMap.get(p.user_id)?.outstanding ?? 0,
      recurring_count: recurringMap.get(p.user_id) ?? 0,
      role: 'client',
    }));

    setClients(enriched);
    setLoading(false);
  };

  useEffect(() => { fetchClients(); }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return clients;
    const q = search.toLowerCase();
    return clients.filter(c =>
      (c.display_name ?? '').toLowerCase().includes(q) ||
      (c.email ?? '').toLowerCase().includes(q) ||
      (c.company ?? '').toLowerCase().includes(q) ||
      (c.phone ?? '').toLowerCase().includes(q)
    );
  }, [clients, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [search]);

  const openEdit = async (client: Client) => {
    setEditClient(client);
    setForm({
      email: client.email ?? '',
      display_name: client.display_name ?? '',
      phone: client.phone ?? '',
      company: client.company ?? '',
      address: client.address ?? '',
      notes: client.notes ?? '',
      country: (client as any).currency === 'ZAR' ? 'south_africa' : (client as any).currency === 'THB' ? 'thailand' : 'global',
    });
    // Load existing recurring services
    const { data } = await supabase
      .from('client_recurring_services')
      .select('id, product_id, quantity, active')
      .eq('client_id', client.user_id);

    if (data && data.length > 0) {
      const productIds = data.map((d: any) => d.product_id);
      const { data: products } = await supabase
        .from('products')
        .select('id, name, price_usd')
        .in('id', productIds);

      const productMap = new Map((products ?? []).map((p: any) => [p.id, p]));
      setRecurringServices(
        data.map((d: any) => ({
          id: d.id,
          product_id: d.product_id,
          product_name: productMap.get(d.product_id)?.name ?? 'Unknown',
          quantity: d.quantity,
          price: productMap.get(d.product_id)?.price_usd ?? 0,
          active: d.active,
        }))
      );
    } else {
      setRecurringServices([]);
    }
  };

  const openCreate = () => {
    setShowCreate(true);
    setForm({ email: '', display_name: '', phone: '', company: '', address: '', notes: '', country: 'global' });
    setRecurringServices([]);
  };

  const saveRecurringServices = async (clientId: string) => {
    // Delete existing and re-insert
    await supabase
      .from('client_recurring_services')
      .delete()
      .eq('client_id', clientId);

    if (recurringServices.length > 0) {
      await supabase.from('client_recurring_services').insert(
        recurringServices.map(s => ({
          client_id: clientId,
          product_id: s.product_id,
          quantity: s.quantity,
          active: s.active,
        }))
      );
    }
  };

  const countryToCurrency = (c: string) => c === 'south_africa' ? 'ZAR' : c === 'thailand' ? 'THB' : 'USD';

  const handleUpdate = async () => {
    if (!editClient) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: form.display_name || null,
        phone: form.phone || null,
        company: form.company || null,
        address: form.address || null,
        notes: form.notes || null,
        currency: countryToCurrency(form.country),
      })
      .eq('user_id', editClient.user_id);

    if (error) {
      toast({ title: 'Error updating client', description: error.message, variant: 'destructive' });
    } else {
      await saveRecurringServices(editClient.user_id);
      toast({ title: 'Client updated' });
      setEditClient(null);
      fetchClients();
    }
    setSaving(false);
  };

  const handleCreate = async () => {
    if (!form.email) {
      toast({ title: 'Email is required', variant: 'destructive' });
      return;
    }
    if (!form.display_name) {
      toast({ title: 'Contact name is required', variant: 'destructive' });
      return;
    }
    setSaving(true);

    const currency = countryToCurrency(form.country);
    const { data, error } = await supabase.functions.invoke('create-client', {
      body: {
        email: form.email,
        display_name: form.display_name,
        phone: form.phone,
        company: form.company,
        address: form.address,
        currency,
      },
    });

    if (error || data?.error) {
      toast({ title: 'Error creating client', description: data?.error || error?.message, variant: 'destructive' });
    } else {
      // Save recurring services for the new client
      if (data?.user_id && recurringServices.length > 0) {
        await supabase.from('client_recurring_services').insert(
          recurringServices.map(s => ({
            client_id: data.user_id,
            product_id: s.product_id,
            quantity: s.quantity,
            active: s.active,
          }))
        );
      }
      const resetMsg = data?.reset_email_sent 
        ? 'A password reset email has been sent so they can set their password.' 
        : 'Client created, but the reset email could not be sent.';
      toast({ title: 'Client created successfully', description: resetMsg });
      setShowCreate(false);
      fetchClients();
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    // We only remove the client role, not the profile/user
    const { error } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', deleteId)
      .eq('role', 'client');

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Client role removed' });
      fetchClients();
    }
    setDeleteId(null);
  };

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total Clients" value={clients.length} />
        <StatCard label="With Outstanding" value={clients.filter(c => (c.outstanding ?? 0) > 0).length} />
        <StatCard label="Total Outstanding" value={fmt(clients.reduce((s, c) => s + (c.outstanding ?? 0), 0))} valueColor="text-orange-400" />
      </div>

      <AdminToolbar title="Clients">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-52 pl-9 bg-card border-border h-9 text-sm"
          />
        </div>
        <Button onClick={openCreate} className="gap-1.5 h-9">
          <Plus className="h-4 w-4" /> Add Client
        </Button>
      </AdminToolbar>

      {/* Table */}
      {loading ? (
        <PageLoader />
      ) : filtered.length === 0 ? (
        <EmptyState icon={User} message="No clients found." />
      ) : (
        <>
          <div className="rounded-lg border border-border bg-card/50 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50">
                  <TableHead className="font-mono text-xs">Client</TableHead>
                  <TableHead className="font-mono text-xs">Contact</TableHead>
                  <TableHead className="font-mono text-xs">Company</TableHead>
                  <TableHead className="font-mono text-xs text-center">Invoices</TableHead>
                  <TableHead className="font-mono text-xs text-center">Recurring</TableHead>
                  <TableHead className="font-mono text-xs text-right">Outstanding</TableHead>
                  <TableHead className="font-mono text-xs">Joined</TableHead>
                  <TableHead className="font-mono text-xs text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map(client => (
                  <TableRow key={client.id} className="border-border/30">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-mono text-sm font-bold">
                          {(client.display_name ?? client.email ?? '?')[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{client.display_name ?? '—'}</p>
                          <p className="text-xs text-muted-foreground">{client.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {client.phone ? (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3" /> {client.phone}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground/50">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {client.company ? (
                        <span className="flex items-center gap-1 text-sm">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground" /> {client.company}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground/50">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="font-mono text-xs">
                        {client.invoice_count}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {(client.recurring_count ?? 0) > 0 ? (
                        <Badge variant="secondary" className="font-mono text-xs">
                          {client.recurring_count}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground/50">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {(client.outstanding ?? 0) > 0 ? (
                        <span className="text-orange-400 font-medium">{fmt(client.outstanding!)}</span>
                      ) : (
                        <span className="text-muted-foreground">{fmt(0)}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(client.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(client)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(client.user_id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <AdminPagination page={page} totalPages={totalPages} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
        </>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editClient} onOpenChange={() => setEditClient(null)}>
        <DialogContent className="max-w-md bg-card border-border max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-mono">Edit Client</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="font-mono text-xs flex items-center gap-1.5"><Mail className="h-3 w-3" /> Email</Label>
              <Input value={form.email} disabled className="bg-muted border-border opacity-60" />
            </div>
            <div>
              <Label className="font-mono text-xs flex items-center gap-1.5"><User className="h-3 w-3" /> Display Name</Label>
              <Input value={form.display_name} onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))} className="bg-background border-border" />
            </div>
            <div>
              <Label className="font-mono text-xs flex items-center gap-1.5"><Phone className="h-3 w-3" /> Phone</Label>
              <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="bg-background border-border" placeholder="+1 234 567 8900" />
            </div>
            <div>
              <Label className="font-mono text-xs flex items-center gap-1.5"><Building2 className="h-3 w-3" /> Company</Label>
              <Input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} className="bg-background border-border" />
            </div>
            <div>
              <Label className="font-mono text-xs flex items-center gap-1.5"><MapPin className="h-3 w-3" /> Address</Label>
              <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className="bg-background border-border" />
            </div>
            <div>
              <Label className="font-mono text-xs flex items-center gap-1.5"><FileText className="h-3 w-3" /> Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="bg-background border-border" rows={3} />
            </div>
            <RecurringServicesSelector services={recurringServices} onChange={setRecurringServices} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditClient(null)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-mono">Onboard New Client</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="font-mono text-xs flex items-center gap-1.5"><User className="h-3 w-3" /> Contact Name *</Label>
              <Input value={form.display_name} onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))} className="bg-background border-border" placeholder="John Doe" />
            </div>
            <div>
              <Label className="font-mono text-xs flex items-center gap-1.5"><Mail className="h-3 w-3" /> Email *</Label>
              <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="bg-background border-border" placeholder="john@company.com" />
            </div>
            <div>
              <Label className="font-mono text-xs flex items-center gap-1.5"><Phone className="h-3 w-3" /> Phone</Label>
              <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="bg-background border-border" placeholder="+1 234 567 8900" />
            </div>
            <div>
              <Label className="font-mono text-xs flex items-center gap-1.5"><Building2 className="h-3 w-3" /> Company Name</Label>
              <Input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} className="bg-background border-border" placeholder="Acme Inc." />
            </div>
            <div>
              <Label className="font-mono text-xs flex items-center gap-1.5"><MapPin className="h-3 w-3" /> Address</Label>
              <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className="bg-background border-border" placeholder="123 Main St, City" />
            </div>
            <div>
              <Label className="font-mono text-xs flex items-center gap-1.5">🌍 Country / Region</Label>
              <Select value={form.country} onValueChange={(v: 'global' | 'south_africa') => setForm(f => ({ ...f, country: v }))}>
                <SelectTrigger className="bg-background border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">Global (USD)</SelectItem>
                  <SelectItem value="south_africa">South Africa (ZAR)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <RecurringServicesSelector services={recurringServices} onChange={setRecurringServices} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create Client
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Remove Client Role?"
        description="This removes the client role from this user. Their profile and data will remain intact, but they'll lose client access."
        confirmLabel="Remove Role"
        onConfirm={handleDelete}
      />
    </div>
  );
}
