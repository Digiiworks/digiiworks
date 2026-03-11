import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, startOfMonth, addMonths } from 'date-fns';
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
  User, Mail, Phone, Building2, MapPin, FileText, Check,
} from 'lucide-react';
import StatCard from '@/components/admin/StatCard';
import AdminToolbar from '@/components/admin/AdminToolbar';
import AdminPagination from '@/components/admin/AdminPagination';
import EmptyState from '@/components/admin/EmptyState';
import PageLoader from '@/components/admin/PageLoader';
import ConfirmDialog from '@/components/ConfirmDialog';
import RecurringServicesSelector, { type RecurringService } from '@/components/admin/RecurringServicesSelector';

type ClientCompany = {
  id: string;
  user_id: string;
  company_name: string;
  address: string | null;
  currency: string;
  phone: string | null;
  notes: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
  // enriched from profile
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  // enriched stats
  invoice_count?: number;
  outstanding?: number;
  recurring_count?: number;
};

type ProfileMatch = {
  user_id: string;
  email: string | null;
  display_name: string | null;
  company: string | null;
  companies: string[];
};

const PAGE_SIZE = 10;

export default function Clients() {
  const { toast } = useToast();

  const [clients, setClients] = useState<ClientCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Dialog state
  const [editClient, setEditClient] = useState<ClientCompany | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form
  const [form, setForm] = useState({
    email: '', display_name: '', phone: '', company: '', address: '', notes: '', country: 'global' as 'global' | 'south_africa' | 'thailand',
  });
  const [recurringServices, setRecurringServices] = useState<RecurringService[]>([]);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [startDate, setStartDate] = useState<string | null>(null);

  // Fuzzy search state
  const [emailQuery, setEmailQuery] = useState('');
  const [emailMatches, setEmailMatches] = useState<ProfileMatch[]>([]);
  const [emailSearching, setEmailSearching] = useState(false);
  const [selectedExistingUser, setSelectedExistingUser] = useState<ProfileMatch | null>(null);
  const [showEmailDropdown, setShowEmailDropdown] = useState(false);

  const fetchClients = async () => {
    setLoading(true);

    // Get all client companies joined with profiles
    const { data: companies } = await supabase
      .from('client_companies')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: false });

    if (!companies || companies.length === 0) {
      setClients([]);
      setLoading(false);
      return;
    }

    const userIds = [...new Set(companies.map(c => c.user_id))];

    const [profileRes, invoiceRes, recurringRes] = await Promise.all([
      supabase.from('profiles').select('user_id, email, display_name, avatar_url').in('user_id', userIds),
      supabase.from('invoices').select('client_id, client_company_id, status, total'),
      supabase.from('client_recurring_services').select('client_company_id').eq('active', true),
    ]);

    const profileMap = new Map((profileRes.data ?? []).map(p => [p.user_id, p]));

    // Invoice stats per company
    const invoiceMap = new Map<string, { count: number; outstanding: number }>();
    (invoiceRes.data ?? []).forEach(inv => {
      const key = inv.client_company_id || inv.client_id;
      const existing = invoiceMap.get(key) ?? { count: 0, outstanding: 0 };
      existing.count++;
      if (['draft', 'sent', 'overdue'].includes(inv.status)) {
        existing.outstanding += Number(inv.total);
      }
      invoiceMap.set(key, existing);
    });

    // Recurring service counts per company
    const recurringMap = new Map<string, number>();
    (recurringRes.data ?? []).forEach((r: any) => {
      if (r.client_company_id) {
        recurringMap.set(r.client_company_id, (recurringMap.get(r.client_company_id) ?? 0) + 1);
      }
    });

    const enriched: ClientCompany[] = companies.map(c => {
      const profile = profileMap.get(c.user_id);
      return {
        ...c,
        email: profile?.email ?? null,
        display_name: profile?.display_name ?? null,
        avatar_url: profile?.avatar_url ?? null,
        invoice_count: invoiceMap.get(c.id)?.count ?? invoiceMap.get(c.user_id)?.count ?? 0,
        outstanding: invoiceMap.get(c.id)?.outstanding ?? invoiceMap.get(c.user_id)?.outstanding ?? 0,
        recurring_count: recurringMap.get(c.id) ?? 0,
      };
    });

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
      c.company_name.toLowerCase().includes(q) ||
      (c.phone ?? '').toLowerCase().includes(q)
    );
  }, [clients, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [search]);

  // Fuzzy email search
  const searchEmails = useCallback(async (query: string) => {
    if (query.length < 2) {
      setEmailMatches([]);
      return;
    }
    setEmailSearching(true);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, email, display_name, company')
      .or(`email.ilike.%${query}%,display_name.ilike.%${query}%`)
      .limit(10);

    if (profiles && profiles.length > 0) {
      const uids = profiles.map(p => p.user_id);
      const { data: existingCompanies } = await supabase
        .from('client_companies')
        .select('user_id, company_name')
        .in('user_id', uids);

      const companyMap = new Map<string, string[]>();
      (existingCompanies ?? []).forEach(ec => {
        const list = companyMap.get(ec.user_id) ?? [];
        list.push(ec.company_name);
        companyMap.set(ec.user_id, list);
      });

      setEmailMatches(profiles.map(p => ({
        ...p,
        companies: companyMap.get(p.user_id) ?? [],
      })));
    } else {
      setEmailMatches([]);
    }
    setEmailSearching(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => searchEmails(emailQuery), 300);
    return () => clearTimeout(timer);
  }, [emailQuery, searchEmails]);

  const selectExistingUser = (match: ProfileMatch) => {
    setSelectedExistingUser(match);
    setForm(f => ({
      ...f,
      email: match.email ?? '',
      display_name: match.display_name ?? '',
    }));
    setShowEmailDropdown(false);
  };

  const clearExistingUser = () => {
    setSelectedExistingUser(null);
    setEmailQuery('');
    setForm(f => ({ ...f, email: '', display_name: '' }));
  };

  const openEdit = async (client: ClientCompany) => {
    setEditClient(client);
    setForm({
      email: client.email ?? '',
      display_name: client.display_name ?? '',
      phone: client.phone ?? '',
      company: client.company_name,
      address: client.address ?? '',
      notes: client.notes ?? '',
      country: client.currency === 'ZAR' ? 'south_africa' : client.currency === 'THB' ? 'thailand' : 'global',
    });
    // Load existing recurring services for this company
    const { data } = await supabase
      .from('client_recurring_services')
      .select('id, product_id, quantity, active, unit_price_override, billing_cycle, start_date')
      .eq('client_company_id', client.id);

    if (data && data.length > 0) {
      const productIds = data.map((d: any) => d.product_id);
      const { data: products } = await supabase
        .from('products')
        .select('id, name, price_usd, price_zar, price_thb')
        .in('id', productIds);

      const clientCurrency = client.currency ?? 'USD';
      const getPrice = (p: any) => {
        if (clientCurrency === 'ZAR') return p.price_zar || p.price_usd;
        if (clientCurrency === 'THB') return p.price_thb || p.price_usd;
        return p.price_usd;
      };

      const productMap = new Map((products ?? []).map((p: any) => [p.id, p]));
      setBillingCycle(data[0]?.billing_cycle ?? 'monthly');
      setStartDate(data[0]?.start_date ?? null);
      setRecurringServices(
        data.map((d: any) => ({
          id: d.id,
          product_id: d.product_id,
          product_name: productMap.get(d.product_id)?.name ?? 'Unknown',
          quantity: d.quantity,
          price: productMap.get(d.product_id) ? getPrice(productMap.get(d.product_id)) : 0,
          price_override: d.unit_price_override ?? null,
          active: d.active,
        }))
      );
    } else {
      setRecurringServices([]);
      setBillingCycle('monthly');
      setStartDate(null);
    }
  };

  const openCreate = () => {
    setShowCreate(true);
    setForm({ email: '', display_name: '', phone: '', company: '', address: '', notes: '', country: 'global' });
    setRecurringServices([]);
    setBillingCycle('monthly');
    setStartDate(null);
    setSelectedExistingUser(null);
    setEmailQuery('');
    setEmailMatches([]);
  };

  const saveRecurringServices = async (clientId: string, companyId: string) => {
    // Delete existing for this company and re-insert
    await supabase
      .from('client_recurring_services')
      .delete()
      .eq('client_company_id', companyId);

    if (recurringServices.length > 0) {
      await supabase.from('client_recurring_services').insert(
        recurringServices.map(s => ({
          client_id: clientId,
          client_company_id: companyId,
          product_id: s.product_id,
          quantity: s.quantity,
          active: s.active,
          unit_price_override: s.price_override,
          billing_cycle: billingCycle,
          start_date: startDate,
        }))
      );
    }
  };

  const countryToCurrency = (c: string) => c === 'south_africa' ? 'ZAR' : c === 'thailand' ? 'THB' : 'USD';

  const handleUpdate = async () => {
    if (!editClient) return;
    setSaving(true);
    const { error } = await supabase
      .from('client_companies')
      .update({
        company_name: form.company || 'Unnamed',
        address: form.address || null,
        currency: countryToCurrency(form.country),
        phone: form.phone || null,
        notes: form.notes || null,
      })
      .eq('id', editClient.id);

    if (error) {
      toast({ title: 'Error updating client', description: error.message, variant: 'destructive' });
    } else {
      // Also update profile display_name if changed
      await supabase
        .from('profiles')
        .update({ display_name: form.display_name || null })
        .eq('user_id', editClient.user_id);

      await saveRecurringServices(editClient.user_id, editClient.id);
      toast({ title: 'Client updated' });
      setEditClient(null);
      fetchClients();
    }
    setSaving(false);
  };

  const handleCreate = async () => {
    if (!selectedExistingUser && !form.email) {
      toast({ title: 'Email is required', variant: 'destructive' });
      return;
    }
    if (!form.company) {
      toast({ title: 'Company name is required', variant: 'destructive' });
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
        existing_user_id: selectedExistingUser?.user_id || undefined,
      },
    });

    if (error) {
      toast({ title: 'Error creating client', description: error.message, variant: 'destructive' });
    } else if (data?.error === 'user_exists') {
      // User exists — offer to link
      toast({
        title: 'User already exists',
        description: data.message + ' Select them from the dropdown to add a new company.',
        variant: 'destructive',
      });
      if (data.existing_user_id) {
        setEmailMatches([{
          user_id: data.existing_user_id,
          email: form.email,
          display_name: data.existing_display_name,
          company: null,
          companies: [],
        }]);
        setShowEmailDropdown(true);
      }
    } else if (data?.error) {
      toast({ title: 'Error creating client', description: data.error, variant: 'destructive' });
    } else {
      // Save recurring services
      if (data?.user_id && data?.client_company_id && recurringServices.length > 0) {
        await supabase.from('client_recurring_services').insert(
          recurringServices.map(s => ({
            client_id: data.user_id,
            client_company_id: data.client_company_id,
            product_id: s.product_id,
            quantity: s.quantity,
            active: s.active,
            unit_price_override: s.price_override,
            billing_cycle: billingCycle,
            start_date: startDate,
          }))
        );
      }
      const isExisting = !!selectedExistingUser;
      const resetMsg = isExisting
        ? 'New company linked to existing user.'
        : data?.reset_email_sent
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
    // Soft-delete: deactivate the company
    const { error } = await supabase
      .from('client_companies')
      .update({ active: false })
      .eq('id', deleteId);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Client company deactivated' });
      fetchClients();
    }
    setDeleteId(null);
  };

  const fmtCurrency = (n: number, currency: string = 'USD') => {
    const symbol = currency === 'ZAR' ? 'R' : currency === 'THB' ? '฿' : '$';
    return `${symbol}${n.toFixed(2)}`;
  };

  return (
    <div className="space-y-6">
      {(() => {
        const byCurrency: Record<string, number> = {};
        clients.forEach(c => {
          if ((c.outstanding ?? 0) > 0) {
            const cur = c.currency ?? 'USD';
            byCurrency[cur] = (byCurrency[cur] ?? 0) + (c.outstanding ?? 0);
          }
        });
        ['USD', 'ZAR', 'THB'].forEach(c => { if (!(c in byCurrency)) byCurrency[c] = 0; });
        return (
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
            <StatCard label="Total Companies" value={clients.length} />
            <StatCard label="With Outstanding" value={clients.filter(c => (c.outstanding ?? 0) > 0).length} />
            {Object.entries(byCurrency).map(([cur, total]) => (
              <StatCard key={cur} label={`Outstanding (${cur})`} value={fmtCurrency(total, cur)} valueColor="text-orange-400" />
            ))}
          </div>
        );
      })()}

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

      {loading ? (
        <PageLoader />
      ) : filtered.length === 0 ? (
        <EmptyState icon={User} message="No clients found." />
      ) : (
        <>
          {/* Mobile card view */}
          <div className="space-y-3 md:hidden">
            {paginated.map(client => (
              <div key={client.id} className="rounded-lg border border-border bg-card/50 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-mono text-sm font-bold shrink-0">
                      {(client.company_name ?? '?')[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{client.company_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{client.display_name} · {client.email}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(client)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(client.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground block">Invoices</span>
                    <Badge variant="outline" className="font-mono text-xs mt-0.5">{client.invoice_count}</Badge>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Recurring</span>
                    <span className="font-mono">{client.recurring_count ?? 0}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-muted-foreground block">Outstanding</span>
                    <span className={`font-mono font-medium ${(client.outstanding ?? 0) > 0 ? 'text-orange-400' : 'text-muted-foreground'}`}>
                      {fmtCurrency(client.outstanding ?? 0, client.currency)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table view */}
          <div className="rounded-lg border border-border bg-card/50 overflow-x-auto hidden md:block">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50">
                  <TableHead className="font-mono text-xs">Company</TableHead>
                  <TableHead className="font-mono text-xs">Contact</TableHead>
                  <TableHead className="font-mono text-xs text-center">Invoices</TableHead>
                  <TableHead className="font-mono text-xs text-center">Recurring</TableHead>
                  <TableHead className="font-mono text-xs text-right">Outstanding</TableHead>
                  <TableHead className="font-mono text-xs">Created</TableHead>
                  <TableHead className="font-mono text-xs text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map(client => (
                  <TableRow key={client.id} className="border-border/30">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-mono text-sm font-bold">
                          {client.company_name[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{client.company_name}</p>
                          <p className="text-xs text-muted-foreground">{client.currency}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-foreground">{client.display_name ?? '—'}</p>
                      <p className="text-xs text-muted-foreground">{client.email}</p>
                      {client.phone && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3" /> {client.phone}
                        </span>
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
                        <span className="text-orange-400 font-medium">{fmtCurrency(client.outstanding!, client.currency)}</span>
                      ) : (
                        <span className="text-muted-foreground">{fmtCurrency(0, client.currency)}</span>
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
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(client.id)}>
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
        <DialogContent className="w-[95vw] max-w-lg bg-card border-border max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-mono">Edit Client Company</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto flex-1 pr-1">
            <div>
              <Label className="font-mono text-xs flex items-center gap-1.5"><Mail className="h-3 w-3" /> Email</Label>
              <Input value={form.email} disabled className="bg-muted border-border opacity-60" />
            </div>
            <div>
              <Label className="font-mono text-xs flex items-center gap-1.5"><User className="h-3 w-3" /> Contact Name</Label>
              <Input value={form.display_name} onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))} className="bg-background border-border" />
            </div>
            <div>
              <Label className="font-mono text-xs flex items-center gap-1.5"><Building2 className="h-3 w-3" /> Company Name *</Label>
              <Input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} className="bg-background border-border" />
            </div>
            <div>
              <Label className="font-mono text-xs flex items-center gap-1.5"><Phone className="h-3 w-3" /> Phone</Label>
              <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="bg-background border-border" placeholder="+1 234 567 8900" />
            </div>
            <div>
              <Label className="font-mono text-xs flex items-center gap-1.5"><MapPin className="h-3 w-3" /> Address</Label>
              <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className="bg-background border-border" />
            </div>
            <div>
              <Label className="font-mono text-xs flex items-center gap-1.5"><FileText className="h-3 w-3" /> Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="bg-background border-border" rows={2} />
            </div>
            <div>
              <Label className="font-mono text-xs flex items-center gap-1.5">🌍 Country / Region</Label>
              <Select value={form.country} onValueChange={(v: 'global' | 'south_africa' | 'thailand') => setForm(f => ({ ...f, country: v }))}>
                <SelectTrigger className="bg-background border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">Global (USD)</SelectItem>
                  <SelectItem value="south_africa">South Africa (ZAR)</SelectItem>
                  <SelectItem value="thailand">Thailand (THB)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <RecurringServicesSelector services={recurringServices} onChange={setRecurringServices} currency={countryToCurrency(form.country)} billingCycle={billingCycle} onBillingCycleChange={setBillingCycle} startDate={startDate} onStartDateChange={setStartDate} />
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
        <DialogContent className="w-[95vw] max-w-lg bg-card border-border max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-mono">Onboard New Client</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto flex-1 pr-1">
            {/* Email with fuzzy search */}
            <div className="relative">
              <Label className="font-mono text-xs flex items-center gap-1.5 mb-1.5"><Mail className="h-3 w-3" /> Email *</Label>
              {selectedExistingUser ? (
                <div className="flex items-center gap-2 rounded-md border border-primary/50 bg-primary/5 p-2">
                  <Check className="h-4 w-4 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{selectedExistingUser.display_name ?? selectedExistingUser.email}</p>
                    <p className="text-xs text-muted-foreground truncate">{selectedExistingUser.email}</p>
                    {selectedExistingUser.companies.length > 0 && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Existing: {selectedExistingUser.companies.join(', ')}
                      </p>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={clearExistingUser}>
                    Change
                  </Button>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="email"
                      value={emailQuery || form.email}
                      onChange={e => {
                        setEmailQuery(e.target.value);
                        setForm(f => ({ ...f, email: e.target.value }));
                        setShowEmailDropdown(true);
                      }}
                      onFocus={() => emailMatches.length > 0 && setShowEmailDropdown(true)}
                      className="bg-background border-border pl-7"
                      placeholder="john@company.com — search existing users"
                    />
                    {emailSearching && <Loader2 className="absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />}
                  </div>
                  {showEmailDropdown && emailMatches.length > 0 && (
                    <div className="absolute z-[100] w-[calc(100%-2rem)] mt-1 max-h-48 overflow-y-auto rounded-md border border-border bg-popover shadow-md">
                      <div className="px-3 py-1.5 text-[10px] text-muted-foreground font-mono border-b border-border/50">
                        Existing users — click to link new company
                      </div>
                      {emailMatches.map(match => (
                        <button
                          key={match.user_id}
                          type="button"
                          className="flex w-full items-center justify-between px-3 py-2 text-left text-xs hover:bg-accent transition-colors"
                          onClick={() => selectExistingUser(match)}
                        >
                          <div className="min-w-0">
                            <p className="font-medium truncate">{match.display_name ?? match.email}</p>
                            <p className="text-muted-foreground truncate">{match.email}</p>
                            {match.companies.length > 0 && (
                              <p className="text-[10px] text-muted-foreground">
                                Companies: {match.companies.join(', ')}
                              </p>
                            )}
                          </div>
                          <Badge variant="outline" className="text-[10px] shrink-0 ml-2">Link</Badge>
                        </button>
                      ))}
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-accent transition-colors border-t border-border/50 text-primary"
                        onClick={() => setShowEmailDropdown(false)}
                      >
                        <Plus className="h-3 w-3" /> Create new user with "{form.email}"
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            {!selectedExistingUser && (
              <div>
                <Label className="font-mono text-xs flex items-center gap-1.5"><User className="h-3 w-3" /> Contact Name</Label>
                <Input value={form.display_name} onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))} className="bg-background border-border" placeholder="John Doe" />
              </div>
            )}
            <div>
              <Label className="font-mono text-xs flex items-center gap-1.5"><Building2 className="h-3 w-3" /> Company Name *</Label>
              <Input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} className="bg-background border-border" placeholder="Acme Inc." />
            </div>
            <div>
              <Label className="font-mono text-xs flex items-center gap-1.5"><Phone className="h-3 w-3" /> Phone</Label>
              <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="bg-background border-border" placeholder="+1 234 567 8900" />
            </div>
            <div>
              <Label className="font-mono text-xs flex items-center gap-1.5"><MapPin className="h-3 w-3" /> Address</Label>
              <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className="bg-background border-border" placeholder="123 Main St, City" />
            </div>
            <div>
              <Label className="font-mono text-xs flex items-center gap-1.5">🌍 Country / Region</Label>
              <Select value={form.country} onValueChange={(v: 'global' | 'south_africa' | 'thailand') => setForm(f => ({ ...f, country: v }))}>
                <SelectTrigger className="bg-background border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">Global (USD)</SelectItem>
                  <SelectItem value="south_africa">South Africa (ZAR)</SelectItem>
                  <SelectItem value="thailand">Thailand (THB)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <RecurringServicesSelector services={recurringServices} onChange={setRecurringServices} currency={countryToCurrency(form.country)} billingCycle={billingCycle} onBillingCycleChange={setBillingCycle} startDate={startDate} onStartDateChange={setStartDate} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {selectedExistingUser ? 'Add Company' : 'Create Client'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Deactivate Client Company?"
        description="This deactivates the company. The user account and data will remain intact."
        confirmLabel="Deactivate"
        onConfirm={handleDelete}
      />
    </div>
  );
}
