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
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Plus, Trash2, Pencil, Search,
  User, Mail, Phone, Building2, MapPin, FileText,
} from 'lucide-react';
import StatCard from '@/components/admin/StatCard';
import AdminToolbar from '@/components/admin/AdminToolbar';
import AdminPagination from '@/components/admin/AdminPagination';
import EmptyState from '@/components/admin/EmptyState';
import PageLoader from '@/components/admin/PageLoader';
import ConfirmDialog from '@/components/ConfirmDialog';

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
    email: '', display_name: '', phone: '', company: '', address: '', notes: '',
  });

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

    const enriched: Client[] = (profileData ?? []).map(p => ({
      ...p,
      invoice_count: invoiceMap.get(p.user_id)?.count ?? 0,
      outstanding: invoiceMap.get(p.user_id)?.outstanding ?? 0,
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

  const openEdit = (client: Client) => {
    setEditClient(client);
    setForm({
      email: client.email ?? '',
      display_name: client.display_name ?? '',
      phone: client.phone ?? '',
      company: client.company ?? '',
      address: client.address ?? '',
      notes: client.notes ?? '',
    });
  };

  const openCreate = () => {
    setShowCreate(true);
    setForm({ email: '', display_name: '', phone: '', company: '', address: '', notes: '' });
  };

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
      })
      .eq('user_id', editClient.user_id);

    if (error) {
      toast({ title: 'Error updating client', description: error.message, variant: 'destructive' });
    } else {
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
    setSaving(true);

    // Create auth user via edge function or just create a profile entry
    // Since we can't create auth users from client-side, we'll create a placeholder profile
    // and inform admin to send invite
    const { data: existing } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('email', form.email)
      .maybeSingle();

    if (existing) {
      toast({ title: 'A user with this email already exists', variant: 'destructive' });
      setSaving(false);
      return;
    }

    toast({
      title: 'Note',
      description: 'To add a new client, they need to sign up through the auth page. You can then manage their profile here.',
    });
    setSaving(false);
    setShowCreate(false);
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

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-mono text-2xl font-bold text-foreground">Clients</h1>
        <div className="flex gap-2">
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
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center">
          <User className="mx-auto h-10 w-10 text-muted-foreground/30" />
          <p className="mt-3 font-mono text-sm text-muted-foreground">No clients found.</p>
        </div>
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="font-mono text-xs text-muted-foreground">
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
              </p>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <Button key={p} variant={p === page ? 'default' : 'outline'} size="icon" className="h-8 w-8 font-mono text-xs" onClick={() => setPage(p)}>
                    {p}
                  </Button>
                ))}
                <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editClient} onOpenChange={() => setEditClient(null)}>
        <DialogContent className="max-w-md bg-card border-border">
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
            <DialogTitle className="font-mono">Add Client</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              New clients sign up via the auth page and automatically receive the client role. You can then edit their details here.
            </p>
            <p className="text-sm text-muted-foreground">
              To promote an existing user to client, go to <span className="text-primary font-mono">Users</span> and assign the role.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Client Role?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the client role from this user. Their profile and data will remain intact, but they'll lose client access.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remove Role
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
