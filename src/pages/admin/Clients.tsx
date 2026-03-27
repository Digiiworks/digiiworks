import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, startOfMonth, addMonths } from 'date-fns';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
  User, Mail, Phone, Building2, MapPin, FileText, Check, ArrowUpDown, Upload, X, CreditCard,
} from 'lucide-react';
import StatCard from '@/components/admin/StatCard';
import AdminToolbar from '@/components/admin/AdminToolbar';
import AdminPagination from '@/components/admin/AdminPagination';
import EmptyState, { ErrorState } from '@/components/admin/EmptyState';
import PageLoader from '@/components/admin/PageLoader';
import ConfirmDialog from '@/components/ConfirmDialog';
import RecurringServicesSelector, { type RecurringService } from '@/components/admin/RecurringServicesSelector';
import ImageCropper from '@/components/admin/ImageCropper';
import ClientDetailSheet from '@/components/admin/ClientDetailSheet';

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
  logo_url: string | null;
  // enriched from profile
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  // enriched stats
  invoice_count?: number;
  outstanding?: number;
  recurring_count?: number;
  credit_balance?: number;
};

type ProfileMatch = {
  user_id: string;
  email: string | null;
  display_name: string | null;
  company: string | null;
  companies: string[];
};

type SortField = 'company' | 'contact' | 'invoices' | 'recurring' | 'outstanding' | 'created';
type SortDir = 'asc' | 'desc';

const PAGE_SIZE = 10;

export default function Clients() {
  const { toast } = useToast();

  const [clients, setClients] = useState<ClientCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>('company');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // Dialog state
  const [editClient, setEditClient] = useState<ClientCompany | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [detailCompanyId, setDetailCompanyId] = useState<string | null>(null);
  const [creditClient, setCreditClient] = useState<ClientCompany | null>(null);
  const [creditAmount, setCreditAmount] = useState('');
  const [creditNote, setCreditNote] = useState('');
  const [creditSaving, setCreditSaving] = useState(false);

  // Form
  const [form, setForm] = useState({
    email: '', display_name: '', phone: '', company: '', address: '', notes: '', country: 'global' as 'global' | 'south_africa' | 'thailand',
  });
  const [ccEmails, setCcEmails] = useState<string[]>([]);
  const [newCcEmail, setNewCcEmail] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [existingLogoUrl, setExistingLogoUrl] = useState<string | null>(null);
  const [sendPasswordSetup, setSendPasswordSetup] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [cropperSrc, setCropperSrc] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [recurringServices, setRecurringServices] = useState<RecurringService[]>([]);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [startDate, setStartDate] = useState<string | null>(null);

  // Invoice prompt state
  const [showInvoicePrompt, setShowInvoicePrompt] = useState(false);
  const [pendingInvoiceData, setPendingInvoiceData] = useState<{
    user_id: string; client_company_id: string; currency: string; company_name: string;
    services: RecurringService[];
  } | null>(null);
  const [generatingInvoice, setGeneratingInvoice] = useState(false);

  // Fuzzy search state
  const [emailQuery, setEmailQuery] = useState('');
  const [emailMatches, setEmailMatches] = useState<ProfileMatch[]>([]);
  const [emailSearching, setEmailSearching] = useState(false);
  const [selectedExistingUser, setSelectedExistingUser] = useState<ProfileMatch | null>(null);
  const [showEmailDropdown, setShowEmailDropdown] = useState(false);

  const fetchClients = async () => {
    setLoading(true);
    setFetchError(false);

    try {
      // Get all client companies joined with profiles
      const { data: companies } = await supabase
        .from('client_companies')
        .select('*, credit_balance')
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
    } catch {
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchClients(); }, []);

  const filtered = useMemo(() => {
    let list = [...clients];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        (c.display_name ?? '').toLowerCase().includes(q) ||
        (c.email ?? '').toLowerCase().includes(q) ||
        c.company_name.toLowerCase().includes(q) ||
        (c.phone ?? '').toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'company':
          cmp = a.company_name.localeCompare(b.company_name);
          break;
        case 'contact':
          cmp = (a.display_name ?? '').localeCompare(b.display_name ?? '');
          break;
        case 'invoices':
          cmp = (a.invoice_count ?? 0) - (b.invoice_count ?? 0);
          break;
        case 'recurring':
          cmp = (a.recurring_count ?? 0) - (b.recurring_count ?? 0);
          break;
        case 'outstanding':
          cmp = (a.outstanding ?? 0) - (b.outstanding ?? 0);
          break;
        case 'created':
          cmp = a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0;
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [clients, search, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [search, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

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

  const [originalRecurringIds, setOriginalRecurringIds] = useState<Set<string>>(new Set());

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const src = URL.createObjectURL(file);
    setCropperSrc(src);
    setShowCropper(true);
    // Reset file input so the same file can be re-selected
    if (logoInputRef.current) logoInputRef.current.value = '';
  };

  const handleCropComplete = (croppedBlob: Blob) => {
    const file = new File([croppedBlob], 'logo.png', { type: 'image/png' });
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(croppedBlob));
    setShowCropper(false);
    if (cropperSrc) URL.revokeObjectURL(cropperSrc);
    setCropperSrc(null);
  };

  const handleCropCancel = () => {
    setShowCropper(false);
    if (cropperSrc) URL.revokeObjectURL(cropperSrc);
    setCropperSrc(null);
  };

  const clearLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    setExistingLogoUrl(null);
    if (logoInputRef.current) logoInputRef.current.value = '';
  };

  const uploadLogo = async (companyId: string): Promise<string | null> => {
    if (!logoFile) return existingLogoUrl;
    const ext = logoFile.name.split('.').pop() ?? 'png';
    const path = `${companyId}.${ext}`;
    const { error } = await supabase.storage.from('client-logos').upload(path, logoFile, { upsert: true });
    if (error) { console.error('Logo upload error:', error); return existingLogoUrl; }
    const { data: urlData } = supabase.storage.from('client-logos').getPublicUrl(path);
    return urlData.publicUrl + '?v=' + Date.now();
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
    setCcEmails((client as any).cc_emails ?? []);
    setNewCcEmail('');
    setLogoFile(null);
    setLogoPreview(null);
    setExistingLogoUrl(client.logo_url ?? null);
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
      const mapped = data.map((d: any) => ({
        id: d.id,
        product_id: d.product_id,
        product_name: productMap.get(d.product_id)?.name ?? 'Unknown',
        quantity: d.quantity,
        price: productMap.get(d.product_id) ? getPrice(productMap.get(d.product_id)) : 0,
        price_override: d.unit_price_override ?? null,
        active: d.active,
      }));
      setRecurringServices(mapped);
      setOriginalRecurringIds(new Set(data.filter((d: any) => d.active).map((d: any) => d.product_id)));
    } else {
      setRecurringServices([]);
      setBillingCycle('monthly');
      setStartDate(null);
      setOriginalRecurringIds(new Set());
    }
  };

  const openCreate = () => {
    setShowCreate(true);
    setForm({ email: '', display_name: '', phone: '', company: '', address: '', notes: '', country: 'global' });
    setRecurringServices([]);
    setBillingCycle('monthly');
    setStartDate(null);
    setSendPasswordSetup(false);
    setSelectedExistingUser(null);
    setEmailQuery('');
    setEmailMatches([]);
    setLogoFile(null);
    setLogoPreview(null);
    setExistingLogoUrl(null);
    setCcEmails([]);
    setNewCcEmail('');
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

  const handleAddCredit = async () => {
    if (!creditClient) return;
    const amount = parseFloat(creditAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: 'Enter a valid credit amount', variant: 'destructive' }); return;
    }
    setCreditSaving(true);
    const newBalance = (creditClient.credit_balance ?? 0) + amount;
    const { error } = await supabase
      .from('client_companies')
      .update({ credit_balance: newBalance })
      .eq('id', creditClient.id);
    if (error) {
      toast({ title: 'Error adding credit', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Credit added', description: `${fmtCurrency(amount, creditClient.currency)} credit added to ${creditClient.company_name}` });
      setCreditClient(null);
      setCreditAmount('');
      setCreditNote('');
      fetchClients();
    }
    setCreditSaving(false);
  };

  // Basic RFC 5322-compatible email validation
  const isValidEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const handleUpdate = async () => {
    if (!editClient) return;

    // Validate CC emails before saving
    const invalidCcEmails = ccEmails.filter(e => e.trim() && !isValidEmail(e));
    if (invalidCcEmails.length > 0) {
      toast({ title: 'Invalid CC email address', description: `Fix these before saving: ${invalidCcEmails.join(', ')}`, variant: 'destructive' });
      return;
    }

    setSaving(true);
    const logoUrl = await uploadLogo(editClient.id);
    const { error } = await supabase
      .from('client_companies')
      .update({
        company_name: form.company || 'Unnamed',
        address: form.address || null,
        currency: countryToCurrency(form.country),
        phone: form.phone || null,
        notes: form.notes || null,
        logo_url: logoUrl,
        cc_emails: ccEmails.filter(e => e.trim() && isValidEmail(e)),
      } as any)
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

      // Check if new active services were added that weren't there before
      const currentActiveProductIds = new Set(
        recurringServices.filter(s => s.active).map(s => s.product_id)
      );
      const hasNewServices = [...currentActiveProductIds].some(id => !originalRecurringIds.has(id));

      if (hasNewServices && currentActiveProductIds.size > 0) {
        const today = new Date();
        const monthStart = format(startOfMonth(today), 'yyyy-MM-dd');
        const nextMonthStart = format(startOfMonth(addMonths(today, 1)), 'yyyy-MM-dd');
        const { data: existingInvoices } = await supabase
          .from('invoices')
          .select('id')
          .eq('client_company_id', editClient.id)
          .gte('created_at', monthStart)
          .lt('created_at', nextMonthStart)
          .limit(1);

        if (!existingInvoices || existingInvoices.length === 0) {
          setPendingInvoiceData({
            user_id: editClient.user_id,
            client_company_id: editClient.id,
            currency: countryToCurrency(form.country),
            company_name: form.company || editClient.company_name,
            services: recurringServices.filter(s => s.active),
          });
          setShowInvoicePrompt(true);
        }
      }

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

    try {
      let userId: string;
      let resetEmailSent = false;

      if (selectedExistingUser) {
        userId = selectedExistingUser.user_id;
      } else {
        // Create the auth user via public signUp (does NOT sign out the admin
        // when email confirmation is required, which is the default).
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: form.email,
          password: crypto.randomUUID() + 'Aa1!',
          options: { data: { display_name: form.display_name || '' } },
        });

        if (signUpError) {
          toast({ title: 'Error creating user', description: signUpError.message, variant: 'destructive' });
          setSaving(false); return;
        }

        // Safety: if signUp auto-signed-in (email confirmation disabled), bail out
        if (signUpData.session) {
          toast({ title: 'Configuration error', description: 'Email confirmation must be enabled in Supabase Auth settings.', variant: 'destructive' });
          setSaving(false); return;
        }

        // identities: [] means user already exists with this email
        if (!signUpData.user || (signUpData.user.identities && signUpData.user.identities.length === 0)) {
          toast({
            title: 'User already exists',
            description: `A user with ${form.email} already exists. Search for them using the email field to link a new company.`,
            variant: 'destructive',
          });
          setSaving(false); return;
        }

        userId = signUpData.user.id;

        // Assign client role
        await supabase.from('user_roles').insert({ user_id: userId, role: 'client' });

        // Update profile with extra details (requires admin UPDATE policy on profiles)
        await supabase.from('profiles').update({
          phone: form.phone || null,
          company: form.company || null,
          address: form.address || null,
          display_name: form.display_name || null,
          currency,
        }).eq('user_id', userId);

        // Send password setup email only if the admin checked the box
        if (sendPasswordSetup) {
          const { error: resetErr } = await supabase.auth.resetPasswordForEmail(form.email, {
            redirectTo: `${window.location.origin}/reset-password`,
          });
          resetEmailSent = !resetErr;
        }
      }

      // Create the company record
      const { data: companyRow, error: companyError } = await supabase
        .from('client_companies')
        .insert({
          user_id: userId,
          company_name: form.company,
          address: form.address || null,
          currency,
          phone: form.phone || null,
          cc_emails: ccEmails.filter(e => e.trim()),
        })
        .select('id')
        .single();

      if (companyError) {
        toast({ title: 'Error creating company', description: companyError.message, variant: 'destructive' });
        setSaving(false); return;
      }

      const clientCompanyId = companyRow.id;

      // Upload logo if provided
      if (logoFile) {
        const logoUrl = await uploadLogo(clientCompanyId);
        if (logoUrl) {
          await supabase.from('client_companies').update({ logo_url: logoUrl }).eq('id', clientCompanyId);
        }
      }

      // Save recurring services
      const activeServices = recurringServices.filter(s => s.active);
      if (activeServices.length > 0) {
        await supabase.from('client_recurring_services').insert(
          activeServices.map(s => ({
            client_id: userId,
            client_company_id: clientCompanyId,
            product_id: s.product_id,
            quantity: s.quantity,
            active: s.active,
            unit_price_override: s.price_override,
            billing_cycle: billingCycle,
            start_date: startDate,
          }))
        );
      }

      const resetMsg = selectedExistingUser
        ? 'New company linked to existing user.'
        : !sendPasswordSetup
          ? 'Client created. No setup email sent.'
          : resetEmailSent
            ? 'A password setup email has been sent to the client.'
            : 'Client created, but the setup email failed to send.';
      toast({ title: 'Client created successfully', description: resetMsg });
      setShowCreate(false);

      // Check if we should prompt for invoice generation
      const today = new Date();
      if (activeServices.length > 0 && today.getDate() >= 3) {
        const monthStart = format(startOfMonth(today), 'yyyy-MM-dd');
        const nextMonthStart = format(startOfMonth(addMonths(today, 1)), 'yyyy-MM-dd');
        const { data: existingInvoices } = await supabase
          .from('invoices')
          .select('id')
          .eq('client_company_id', clientCompanyId)
          .gte('created_at', monthStart)
          .lt('created_at', nextMonthStart)
          .limit(1);

        if (!existingInvoices || existingInvoices.length === 0) {
          setPendingInvoiceData({
            user_id: userId,
            client_company_id: clientCompanyId,
            currency: countryToCurrency(form.country),
            company_name: form.company,
            services: activeServices,
          });
          setShowInvoicePrompt(true);
        }
      }

      fetchClients();
    } catch (err: any) {
      toast({ title: 'Error creating client', description: err.message ?? 'Unexpected error', variant: 'destructive' });
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
    <div className="space-y-6 overflow-x-hidden">
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
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <StatCard label="Total Companies" value={clients.length} />
            <StatCard label="With Outstanding" value={clients.filter(c => (c.outstanding ?? 0) > 0).length} />
            {Object.entries(byCurrency).map(([cur, total]) => (
              <StatCard key={cur} label={`Outstanding (${cur})`} value={fmtCurrency(total, cur)} valueColor="text-orange-400" />
            ))}
          </div>
        );
      })()}

      <AdminToolbar title="Clients">
        <div className="relative w-full sm:w-52">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 bg-card border-border h-9 text-sm"
          />
        </div>
        <Button onClick={openCreate} className="w-full sm:w-auto gap-1.5 h-9">
          <Plus className="h-4 w-4" /> Add Client
        </Button>
      </AdminToolbar>

      {loading ? (
        <PageLoader />
      ) : fetchError ? (
        <ErrorState message="Failed to load clients." onRetry={fetchClients} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={User} message="No clients found." />
      ) : (
        <>
          {/* Mobile card view */}
          <div className="space-y-3 md:hidden">
            {paginated.map(client => (
              <div key={client.id} className="rounded-lg border border-border bg-card/50 p-3 space-y-2 cursor-pointer" onClick={() => setDetailCompanyId(client.id)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {client.logo_url ? (
                      <img src={client.logo_url} alt="" className="h-8 w-8 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-mono text-sm font-bold shrink-0">
                        {(client.company_name ?? '?')[0].toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{client.company_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{client.display_name ?? '—'}</p>
                      <p className="text-xs text-muted-foreground truncate">{client.email ?? '—'}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-neon-mint" title="Add credit" onClick={() => { setCreditClient(client); setCreditAmount(''); setCreditNote(''); }}>
                      <CreditCard className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(client)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(client.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground block">Invoices</span>
                    <Badge className="font-mono text-xs mt-0.5 border-0 bg-primary/20 text-primary">{client.invoice_count}</Badge>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Recurring</span>
                    <span className="font-mono">{client.recurring_count ?? 0}</span>
                  </div>
                  <div className="col-span-2 mt-1 flex items-center justify-between border-t border-border/40 pt-2">
                    <span className="text-muted-foreground">Outstanding</span>
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
                  <TableHead className="font-mono text-xs cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('company')}>
                    <span className="inline-flex items-center gap-1">Company <ArrowUpDown className={`h-3 w-3 ${sortField === 'company' ? 'text-primary' : 'text-muted-foreground/40'}`} /></span>
                  </TableHead>
                  <TableHead className="font-mono text-xs cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('contact')}>
                    <span className="inline-flex items-center gap-1">Contact <ArrowUpDown className={`h-3 w-3 ${sortField === 'contact' ? 'text-primary' : 'text-muted-foreground/40'}`} /></span>
                  </TableHead>
                  <TableHead className="font-mono text-xs text-center cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('invoices')}>
                    <span className="inline-flex items-center gap-1">Invoices <ArrowUpDown className={`h-3 w-3 ${sortField === 'invoices' ? 'text-primary' : 'text-muted-foreground/40'}`} /></span>
                  </TableHead>
                  <TableHead className="font-mono text-xs text-center cursor-pointer select-none hover:text-foreground transition-colors hidden lg:table-cell" onClick={() => toggleSort('recurring')}>
                    <span className="inline-flex items-center gap-1">Recurring <ArrowUpDown className={`h-3 w-3 ${sortField === 'recurring' ? 'text-primary' : 'text-muted-foreground/40'}`} /></span>
                  </TableHead>
                  <TableHead className="font-mono text-xs text-right cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('outstanding')}>
                    <span className="inline-flex items-center gap-1 justify-end">Outstanding <ArrowUpDown className={`h-3 w-3 ${sortField === 'outstanding' ? 'text-primary' : 'text-muted-foreground/40'}`} /></span>
                  </TableHead>
                  <TableHead className="font-mono text-xs cursor-pointer select-none hover:text-foreground transition-colors hidden lg:table-cell" onClick={() => toggleSort('created')}>
                    <span className="inline-flex items-center gap-1">Created <ArrowUpDown className={`h-3 w-3 ${sortField === 'created' ? 'text-primary' : 'text-muted-foreground/40'}`} /></span>
                  </TableHead>
                  <TableHead className="font-mono text-xs text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map(client => (
                  <TableRow key={client.id} className="border-border/30 cursor-pointer hover:bg-muted/30" onClick={() => setDetailCompanyId(client.id)}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {client.logo_url ? (
                          <img src={client.logo_url} alt="" className="h-9 w-9 rounded-full object-cover" />
                        ) : (
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-mono text-sm font-bold">
                            {client.company_name[0].toUpperCase()}
                          </div>
                        )}
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
                      <Badge className="font-mono text-xs border-0 bg-primary/20 text-primary">
                        {client.invoice_count}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center hidden lg:table-cell">
                      {(client.recurring_count ?? 0) > 0 ? (
                        <Badge className="font-mono text-xs border-0 bg-primary/20 text-primary">
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
                    <TableCell className="text-sm text-muted-foreground hidden lg:table-cell">
                      {format(new Date(client.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex justify-end gap-1 items-center">
                        {(client.credit_balance ?? 0) > 0 && (
                          <span className="font-mono text-xs text-neon-mint mr-1" title="Available credit">
                            +{fmtCurrency(client.credit_balance!, client.currency)}
                          </span>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-neon-mint" title="Add credit" onClick={() => { setCreditClient(client); setCreditAmount(''); setCreditNote(''); }}>
                          <CreditCard className="h-4 w-4" />
                        </Button>
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
              <div className="flex items-center gap-2">
                <Input value={form.email} disabled className="bg-muted border-border opacity-60 flex-1" />
                <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => {
                  if (newCcEmail.trim()) return;
                  setNewCcEmail('');
                  const input = document.getElementById('cc-email-input-edit');
                  if (input) (input as HTMLInputElement).focus();
                }} title="Add CC email">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {/* CC Emails */}
              {ccEmails.map((cc, idx) => (
                <div key={idx} className="flex items-center gap-2 mt-2">
                  <Input value={cc} disabled className="bg-muted border-border opacity-60 flex-1 text-xs" />
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-destructive hover:text-destructive" onClick={() => setCcEmails(prev => prev.filter((_, i) => i !== idx))}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              <div className="flex items-center gap-2 mt-2">
                <Input
                  id="cc-email-input-edit"
                  type="email"
                  value={newCcEmail}
                  onChange={e => setNewCcEmail(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (newCcEmail.trim() && newCcEmail.includes('@')) {
                        setCcEmails(prev => [...prev, newCcEmail.trim()]);
                        setNewCcEmail('');
                      }
                    }
                  }}
                  className="bg-background border-border flex-1 text-xs"
                  placeholder="Add CC email and press Enter"
                />
                <Button type="button" variant="outline" size="sm" className="text-xs shrink-0" disabled={!newCcEmail.trim() || !newCcEmail.includes('@')} onClick={() => {
                  setCcEmails(prev => [...prev, newCcEmail.trim()]);
                  setNewCcEmail('');
                }}>
                  Add
                </Button>
              </div>
            </div>
            <div>
              <Label className="font-mono text-xs flex items-center gap-1.5"><User className="h-3 w-3" /> Contact Name</Label>
              <Input value={form.display_name} onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))} className="bg-background border-border" />
            </div>
            <div>
              <Label className="font-mono text-xs flex items-center gap-1.5"><Upload className="h-3 w-3" /> Company Logo</Label>
              <div className="flex items-center gap-3 mt-1.5">
                {(logoPreview || existingLogoUrl) ? (
                  <div className="relative">
                    <img src={logoPreview || existingLogoUrl!} alt="" className="h-12 w-12 rounded-lg object-cover border border-border" />
                    <button type="button" onClick={clearLogo} className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div className="h-12 w-12 rounded-lg border border-dashed border-border flex items-center justify-center text-muted-foreground">
                    <Building2 className="h-5 w-5" />
                  </div>
                )}
                <Button type="button" variant="outline" size="sm" className="text-xs" onClick={() => logoInputRef.current?.click()}>
                  {(logoPreview || existingLogoUrl) ? 'Change' : 'Upload'}
                </Button>
                <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoSelect} />
              </div>
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

            {/* CC Emails for create */}
            <div>
              <Label className="font-mono text-xs flex items-center gap-1.5"><Mail className="h-3 w-3" /> CC Emails</Label>
              {ccEmails.map((cc, idx) => (
                <div key={idx} className="flex items-center gap-2 mt-2">
                  <Input value={cc} disabled className="bg-muted border-border opacity-60 flex-1 text-xs" />
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-destructive hover:text-destructive" onClick={() => setCcEmails(prev => prev.filter((_, i) => i !== idx))}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              <div className="flex items-center gap-2 mt-2">
                <Input
                  type="email"
                  value={newCcEmail}
                  onChange={e => setNewCcEmail(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (newCcEmail.trim() && newCcEmail.includes('@')) {
                        setCcEmails(prev => [...prev, newCcEmail.trim()]);
                        setNewCcEmail('');
                      }
                    }
                  }}
                  className="bg-background border-border flex-1 text-xs"
                  placeholder="Add extra email and press Enter"
                />
                <Button type="button" variant="outline" size="sm" className="text-xs shrink-0" disabled={!newCcEmail.trim() || !newCcEmail.includes('@')} onClick={() => {
                  setCcEmails(prev => [...prev, newCcEmail.trim()]);
                  setNewCcEmail('');
                }}>
                  Add
                </Button>
              </div>
            </div>
            {!selectedExistingUser && (
              <div>
                <Label className="font-mono text-xs flex items-center gap-1.5"><User className="h-3 w-3" /> Contact Name</Label>
                <Input value={form.display_name} onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))} className="bg-background border-border" placeholder="John Doe" />
              </div>
            )}
            <div>
              <Label className="font-mono text-xs flex items-center gap-1.5"><Upload className="h-3 w-3" /> Company Logo</Label>
              <div className="flex items-center gap-3 mt-1.5">
                {logoPreview ? (
                  <div className="relative">
                    <img src={logoPreview} alt="" className="h-12 w-12 rounded-lg object-cover border border-border" />
                    <button type="button" onClick={clearLogo} className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div className="h-12 w-12 rounded-lg border border-dashed border-border flex items-center justify-center text-muted-foreground">
                    <Building2 className="h-5 w-5" />
                  </div>
                )}
                <Button type="button" variant="outline" size="sm" className="text-xs" onClick={() => logoInputRef.current?.click()}>
                  {logoPreview ? 'Change' : 'Upload'}
                </Button>
                <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoSelect} />
              </div>
            </div>
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
            {!selectedExistingUser && (
              <div className="flex items-center gap-2 pt-1">
                <Checkbox
                  id="send-password-setup"
                  checked={sendPasswordSetup}
                  onCheckedChange={(v) => setSendPasswordSetup(!!v)}
                />
                <Label htmlFor="send-password-setup" className="font-mono text-xs cursor-pointer">
                  Send password setup email to client
                </Label>
              </div>
            )}
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

      <ConfirmDialog
        open={showInvoicePrompt}
        onOpenChange={(open) => {
          if (!open) {
            setShowInvoicePrompt(false);
            setPendingInvoiceData(null);
          }
        }}
        title="Generate Invoice for This Month?"
        description={`No invoice exists for ${pendingInvoiceData?.company_name ?? 'this company'} this month. Would you like to generate a draft invoice now from the recurring services?`}
        confirmLabel={generatingInvoice ? 'Generating...' : 'Generate Invoice'}
        cancelLabel="Skip"
        variant="default"
        onConfirm={async () => {
          if (!pendingInvoiceData || generatingInvoice) return;
          setGeneratingInvoice(true);
          try {
            // Get next invoice number
            const { data: lastInvoice } = await supabase
              .from('invoices')
              .select('invoice_number')
              .order('created_at', { ascending: false })
              .limit(1);

            const lastNum = lastInvoice?.[0]?.invoice_number;
            const nextNum = lastNum
              ? `INV-${String(parseInt(lastNum.replace('INV-', '')) + 1).padStart(4, '0')}`
              : 'INV-0001';

            const today = new Date();
            const dueDate = format(startOfMonth(addMonths(today, 1)), 'yyyy-MM-dd');
            const sendDate = format(new Date(today.getFullYear(), today.getMonth(), 25), 'yyyy-MM-dd');

            // Calculate totals
            const items = pendingInvoiceData.services.map(s => ({
              description: s.product_name,
              product_id: s.product_id,
              quantity: s.quantity,
              unit_price: s.price_override ?? s.price,
              total: (s.price_override ?? s.price) * s.quantity,
            }));
            const subtotal = items.reduce((sum, i) => sum + i.total, 0);

            // Insert invoice
            const { data: inv, error: invError } = await supabase
              .from('invoices')
              .insert({
                client_id: pendingInvoiceData.user_id,
                client_company_id: pendingInvoiceData.client_company_id,
                invoice_number: nextNum,
                status: 'draft',
                subtotal,
                total: subtotal,
                tax_rate: 0,
                due_date: dueDate,
                send_date: sendDate,
              })
              .select('id')
              .single();

            if (invError) throw invError;

            // Insert line items
            await supabase.from('invoice_items').insert(
              items.map(i => ({ ...i, invoice_id: inv.id }))
            );

            toast({ title: 'Draft invoice generated', description: `${nextNum} created for ${pendingInvoiceData.company_name}` });
            fetchClients();
          } catch (err: any) {
            toast({ title: 'Error generating invoice', description: err.message, variant: 'destructive' });
          } finally {
            setGeneratingInvoice(false);
            setShowInvoicePrompt(false);
            setPendingInvoiceData(null);
          }
        }}
      />

      {/* Image Cropper Modal */}
      {cropperSrc && (
        <ImageCropper
          open={showCropper}
          imageSrc={cropperSrc}
          onClose={handleCropCancel}
          onCropComplete={handleCropComplete}
          title="Crop Company Logo"
        />
      )}

      {/* Add Credit Dialog */}
      <Dialog open={!!creditClient} onOpenChange={(open) => { if (!open) setCreditClient(null); }}>
        <DialogContent className="w-[95vw] max-w-sm bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-mono">Add Credit — {creditClient?.company_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {(creditClient?.credit_balance ?? 0) > 0 && (
              <p className="font-mono text-xs text-neon-mint">
                Current balance: {fmtCurrency(creditClient!.credit_balance!, creditClient!.currency)}
              </p>
            )}
            <div>
              <Label className="font-mono text-xs mb-1.5 block">Credit Amount ({creditClient?.currency})</Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                value={creditAmount}
                onChange={e => setCreditAmount(e.target.value)}
                className="bg-background border-border font-mono"
              />
            </div>
            <div>
              <Label className="font-mono text-xs mb-1.5 block">Note (optional)</Label>
              <Input
                placeholder="e.g. Overpayment on INV-0012"
                value={creditNote}
                onChange={e => setCreditNote(e.target.value)}
                className="bg-background border-border text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreditClient(null)}>Cancel</Button>
            <Button onClick={handleAddCredit} disabled={creditSaving || !creditAmount}>
              {creditSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Credit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ClientDetailSheet
        companyId={detailCompanyId}
        onClose={() => setDetailCompanyId(null)}
        onEdit={(id) => {
          setDetailCompanyId(null);
          const co = clients.find(c => c.id === id);
          if (co) setEditClient(co);
        }}
        onNewInvoice={(id) => {
          setDetailCompanyId(null);
          // navigate to invoices filtered by company — for now just navigate
          window.location.href = '/admin/invoices';
        }}
      />
    </div>
  );
}
