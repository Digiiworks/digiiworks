import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Trash2, Pencil, Loader2, Search, Package, ChevronLeft, ChevronRight } from 'lucide-react';

type Product = {
  id: string;
  name: string;
  description: string | null;
  price_usd: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

const PAGE_SIZE = 10;

export default function Products() {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showActive, setShowActive] = useState<'all' | 'active' | 'inactive'>('all');

  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({ name: '', description: '', price_usd: 0, active: true });

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('name', { ascending: true });
    if (error) toast({ title: 'Error loading products', description: error.message, variant: 'destructive' });
    setProducts(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchProducts(); }, []);

  const filtered = useMemo(() => {
    let list = [...products];
    if (showActive === 'active') list = list.filter(p => p.active);
    if (showActive === 'inactive') list = list.filter(p => !p.active);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.description ?? '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [products, search, showActive]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [search, showActive]);

  const openCreate = () => {
    setForm({ name: '', description: '', price_usd: 0, active: true });
    setShowCreate(true);
  };

  const openEdit = (p: Product) => {
    setEditProduct(p);
    setForm({ name: p.name, description: p.description ?? '', price_usd: p.price_usd, active: p.active });
  };

  const handleCreate = async () => {
    if (!form.name.trim()) { toast({ title: 'Name is required', variant: 'destructive' }); return; }
    setSaving(true);
    const { error } = await supabase.from('products').insert({
      name: form.name.trim(),
      description: form.description.trim() || null,
      price_usd: form.price_usd,
      active: form.active,
    });
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Product created' }); setShowCreate(false); fetchProducts(); }
    setSaving(false);
  };

  const handleUpdate = async () => {
    if (!editProduct || !form.name.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('products').update({
      name: form.name.trim(),
      description: form.description.trim() || null,
      price_usd: form.price_usd,
      active: form.active,
    }).eq('id', editProduct.id);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Product updated' }); setEditProduct(null); fetchProducts(); }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('products').delete().eq('id', deleteId);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Product deleted' }); fetchProducts(); }
    setDeleteId(null);
  };

  const toggleActive = async (p: Product) => {
    const { error } = await supabase.from('products').update({ active: !p.active }).eq('id', p.id);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else fetchProducts();
  };

  const fmt = (n: number) => `$${n.toFixed(2)}`;

  const ProductForm = ({ onSubmit, submitLabel }: { onSubmit: () => void; submitLabel: string }) => (
    <div className="space-y-4">
      <div>
        <Label className="font-mono text-xs">Name *</Label>
        <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="bg-background border-border" placeholder="e.g. Custom Web Development" />
      </div>
      <div>
        <Label className="font-mono text-xs">Description</Label>
        <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="bg-background border-border" rows={3} placeholder="Brief description of the product/service" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="font-mono text-xs">Price (USD)</Label>
          <Input type="number" min={0} step={0.01} value={form.price_usd} onChange={e => setForm(f => ({ ...f, price_usd: +e.target.value }))} className="bg-background border-border" />
        </div>
        <div className="flex items-center gap-3 pt-5">
          <Switch checked={form.active} onCheckedChange={v => setForm(f => ({ ...f, active: v }))} />
          <Label className="font-mono text-xs">{form.active ? 'Active' : 'Inactive'}</Label>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => { setShowCreate(false); setEditProduct(null); }}>Cancel</Button>
        <Button onClick={onSubmit} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {submitLabel}
        </Button>
      </DialogFooter>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-card/50 p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Total Products</p>
          <p className="font-mono text-2xl font-bold text-foreground">{products.length}</p>
        </div>
        <div className="rounded-lg border border-border bg-card/50 p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Active</p>
          <p className="font-mono text-2xl font-bold text-green-400">{products.filter(p => p.active).length}</p>
        </div>
        <div className="rounded-lg border border-border bg-card/50 p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Inactive</p>
          <p className="font-mono text-2xl font-bold text-muted-foreground">{products.filter(p => !p.active).length}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-mono text-2xl font-bold text-foreground">Products & Services</h1>
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="w-48 pl-9 bg-card border-border h-9 text-sm" />
          </div>
          <div className="flex rounded-md border border-border overflow-hidden">
            {(['all', 'active', 'inactive'] as const).map(s => (
              <button
                key={s}
                onClick={() => setShowActive(s)}
                className={`px-3 py-1.5 font-mono text-xs capitalize transition-colors ${showActive === s ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-muted'}`}
              >
                {s}
              </button>
            ))}
          </div>
          <Button onClick={openCreate} className="gap-1.5 h-9">
            <Plus className="h-4 w-4" /> Add Product
          </Button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center">
          <Package className="mx-auto h-10 w-10 text-muted-foreground/30" />
          <p className="mt-3 font-mono text-sm text-muted-foreground">No products found.</p>
        </div>
      ) : (
        <>
          <div className="rounded-lg border border-border bg-card/50 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50">
                  <TableHead className="font-mono text-xs">Name</TableHead>
                  <TableHead className="font-mono text-xs">Description</TableHead>
                  <TableHead className="font-mono text-xs text-right">Price</TableHead>
                  <TableHead className="font-mono text-xs text-center">Status</TableHead>
                  <TableHead className="font-mono text-xs text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map(p => (
                  <TableRow key={p.id} className="border-border/30">
                    <TableCell className="font-medium text-sm">{p.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{p.description ?? '—'}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{fmt(p.price_usd)}</TableCell>
                    <TableCell className="text-center">
                      <button onClick={() => toggleActive(p)}>
                        <Badge className={`border-0 cursor-pointer ${p.active ? 'bg-green-500/20 text-green-400' : 'bg-muted text-muted-foreground'}`}>
                          {p.active ? 'Active' : 'Inactive'}
                        </Badge>
                      </button>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(p.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

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

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader><DialogTitle className="font-mono">New Product / Service</DialogTitle></DialogHeader>
          <ProductForm onSubmit={handleCreate} submitLabel="Create" />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editProduct} onOpenChange={() => setEditProduct(null)}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader><DialogTitle className="font-mono">Edit Product</DialogTitle></DialogHeader>
          <ProductForm onSubmit={handleUpdate} submitLabel="Save Changes" />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove this product. Existing invoice items referencing it will keep their description.</AlertDialogDescription>
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
