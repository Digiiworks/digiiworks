import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { CheckCircle2, Loader2, Globe, Landmark, Link as LinkIcon, BarChart3, Mail, CreditCard, Share2, Image, Upload, ShieldCheck, Bell, TrendingUp, Save, Hash } from 'lucide-react';
import { toast } from 'sonner';

const PAGE_KEY = 'payment_settings';

interface BankingInfo {
  global: {
    bank_name: string;
    account_name: string;
    account_number: string;
    swift_code: string;
    routing_number: string;
    currency: string;
    reference_note: string;
  };
  thai: {
    bank_name: string;
    account_name: string;
    account_number: string;
    branch: string;
    currency: string;
    reference_note: string;
  };
  south_africa: {
    bank_name: string;
    account_name: string;
    account_number: string;
    branch_code: string;
    account_type: string;
    currency: string;
    reference_note: string;
  };
  payment_links: {
    yoco_payment_link: string;
    wise_payment_link: string;
  };
  tracking: {
    google_pixel_id: string;
    meta_pixel_id: string;
  };
  payment_methods: {
    stripe_enabled: boolean;
    yoco_enabled: boolean;
  };
  socials: {
    instagram: string;
    facebook: string;
    linkedin: string;
    github: string;
  };
  branding: {
    apple_touch_icon_url: string;
    favicon_url: string;
  };
}

const defaultData: BankingInfo = {
  global: { bank_name: '', account_name: '', account_number: '', swift_code: '', routing_number: '', currency: 'USD', reference_note: '' },
  thai: { bank_name: '', account_name: '', account_number: '', branch: '', currency: 'THB', reference_note: '' },
  south_africa: { bank_name: '', account_name: '', account_number: '', branch_code: '', account_type: 'Cheque', currency: 'ZAR', reference_note: '' },
  payment_links: { yoco_payment_link: '', wise_payment_link: '' },
  tracking: { google_pixel_id: '', meta_pixel_id: '' },
  payment_methods: { stripe_enabled: false, yoco_enabled: true },
  socials: { instagram: '', facebook: '', linkedin: '', github: '' },
  branding: { apple_touch_icon_url: '/apple-touch-icon.png', favicon_url: '/favicon.svg' },
};
const SettingsPage = () => {
  const [data, setData] = useState<BankingInfo>(defaultData);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [recordId, setRecordId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [testOpen, setTestOpen] = useState(false);
  const [testCurrency, setTestCurrency] = useState<string>('USD');
  const [testEmail, setTestEmail] = useState('');
  const [testSending, setTestSending] = useState(false);

  // FX Rates state
  type FxRow = { currency_code: string; rate_vs_usd: string; margin_pct: string; updated_at?: string };
  const [fxRates, setFxRates] = useState<FxRow[]>([]);
  const [fxSaving, setFxSaving] = useState<string | null>(null);
  const [fxRefreshing, setFxRefreshing] = useState(false);

  // Dunning state
  const [dunningRunning, setDunningRunning] = useState(false);

  // Invoice numbering config state
  const [invoiceConfig, setInvoiceConfig] = useState({ prefix: 'INV-', padding: 4 });
  const [invConfigLoading, setInvConfigLoading] = useState(false);

  // MFA state
  type MfaFactor = { id: string; friendly_name: string; factor_type: string; status: string };
  const [mfaFactors, setMfaFactors] = useState<MfaFactor[]>([]);
  const [mfaEnrolling, setMfaEnrolling] = useState(false);
  const [mfaTotpUri, setMfaTotpUri] = useState('');
  const [mfaFactorId, setMfaFactorId] = useState('');
  const [mfaVerifyCode, setMfaVerifyCode] = useState('');
  const [mfaVerifying, setMfaVerifying] = useState(false);
  const [mfaUnenrolling, setMfaUnenrolling] = useState<string | null>(null);

  const loadMfaFactors = async () => {
    const { data } = await supabase.auth.mfa.listFactors();
    setMfaFactors((data?.totp ?? []) as MfaFactor[]);
  };

  useEffect(() => {
    const load = async () => {
      const { data: row } = await supabase
        .from('page_content')
        .select('*')
        .eq('page_key', PAGE_KEY)
        .single();
      if (row) {
        setRecordId(row.id);
        setData({ ...defaultData, ...(row.content as any) });
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) setTestEmail(user.email);

      // Load FX rates
      const { data: rates } = await supabase.from('exchange_rates').select('currency_code, rate_vs_usd, margin_pct, updated_at');
      if (rates) {
        setFxRates(rates.map(r => ({
          currency_code: r.currency_code,
          rate_vs_usd: String(r.rate_vs_usd),
          margin_pct: String(r.margin_pct),
          updated_at: r.updated_at,
        })));
      }

      // Load MFA factors
      await loadMfaFactors();

      setLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    supabase.from('page_content').select('content').eq('page_key', 'invoice_config').maybeSingle()
      .then(({ data }) => {
        if (data?.content) {
          const c = data.content as any;
          setInvoiceConfig({ prefix: c.prefix ?? 'INV-', padding: c.padding ?? 4 });
        }
      });
  }, []);

  const persist = useCallback(async (newData: BankingInfo) => {
    setSaving(true);
    setSaved(false);
    if (recordId) {
      await supabase
        .from('page_content')
        .update({ content: newData as any, updated_at: new Date().toISOString() })
        .eq('id', recordId);
    } else {
      const { data: row } = await supabase
        .from('page_content')
        .insert({ page_key: PAGE_KEY, title: 'Payment Settings', content: newData as any })
        .select()
        .single();
      if (row) setRecordId(row.id);
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [recordId]);

  const dataRef = useRef(data);
  dataRef.current = data;

  const update = useCallback((path: string[], value: string | boolean) => {
    setData((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      let obj = next;
      for (let i = 0; i < path.length - 1; i++) obj = obj[path[i]];
      obj[path[path.length - 1]] = value;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => persist(next), 5000);
      return next;
    });
  }, [persist]);

  const getVal = (obj: any, path: string[]) => {
    let v = obj;
    for (const k of path) v = v?.[k] ?? '';
    return v;
  };

  const fetchRates = async () => {
    const { data: rates } = await supabase.from('exchange_rates').select('currency_code, rate_vs_usd, margin_pct, updated_at');
    if (rates) {
      setFxRates(rates.map(r => ({
        currency_code: r.currency_code,
        rate_vs_usd: String(r.rate_vs_usd),
        margin_pct: String(r.margin_pct),
        updated_at: r.updated_at,
      })));
    }
  };

  const handleRefreshRates = async () => {
    setFxRefreshing(true);
    try {
      const res = await fetch('https://api.frankfurter.app/latest?from=USD&to=ZAR,THB');
      if (!res.ok) throw new Error(`Frankfurter API error: ${res.status}`);
      const { rates } = await res.json() as { rates: Record<string, number> };

      const updatedAt = new Date().toISOString();

      for (const [currency_code, rate_vs_usd] of Object.entries(rates)) {
        const existing = fxRates.find(r => r.currency_code === currency_code);
        const margin_pct = parseFloat(existing?.margin_pct ?? '0');
        const { error } = await supabase.from('exchange_rates').upsert(
          { currency_code, rate_vs_usd, margin_pct, updated_at: updatedAt },
          { onConflict: 'currency_code' }
        );
        if (error) throw new Error(`DB save failed for ${currency_code}: ${error.message}`);
      }

      // Re-fetch from DB so UI reflects exactly what was saved
      await fetchRates();
      toast.success('Exchange rates refreshed and saved');
    } catch (err: any) {
      toast.error('Refresh failed: ' + (err.message || 'Unknown error'));
    } finally {
      setFxRefreshing(false);
    }
  };

  const saveFxRate = async (code: string) => {
    const row = fxRates.find(r => r.currency_code === code);
    if (!row) return;
    const rate = parseFloat(row.rate_vs_usd);
    const margin = parseFloat(row.margin_pct);
    if (isNaN(rate) || rate <= 0) { toast.error('Rate must be a positive number'); return; }
    if (isNaN(margin) || margin < 0) { toast.error('Margin must be 0 or greater'); return; }
    setFxSaving(code);
    const { error } = await supabase.from('exchange_rates').upsert({
      currency_code: code, rate_vs_usd: rate, margin_pct: margin, updated_at: new Date().toISOString(),
    }, { onConflict: 'currency_code' });
    if (error) toast.error('Failed to save: ' + error.message);
    else { await fetchRates(); toast.success(`${code} rate saved`); }
    setFxSaving(null);
  };

  const runDunning = async () => {
    setDunningRunning(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('send-dunning-reminders');
      if (error) throw error;
      toast.success(`Dunning run complete: ${result?.sent ?? 0} reminder(s) sent`);
    } catch (err: any) {
      toast.error('Dunning run failed: ' + (err.message || 'Unknown error'));
    } finally {
      setDunningRunning(false);
    }
  };

  const handleSaveInvoiceConfig = async () => {
    setInvConfigLoading(true);
    await supabase.from('page_content').upsert(
      { page_key: 'invoice_config', content: invoiceConfig as any, title: 'Invoice Config' },
      { onConflict: 'page_key' }
    );
    toast.success('Invoice numbering config saved');
    setInvConfigLoading(false);
  };

  const startMfaEnroll = async () => {
    setMfaEnrolling(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
      if (error) throw error;
      setMfaTotpUri(data.totp.uri);
      setMfaFactorId(data.id);
    } catch (err: any) {
      toast.error('Failed to start 2FA setup: ' + err.message);
      setMfaEnrolling(false);
    }
  };

  const verifyMfaEnroll = async () => {
    if (!mfaVerifyCode || mfaVerifyCode.length !== 6) { toast.error('Enter the 6-digit code from your authenticator app'); return; }
    setMfaVerifying(true);
    try {
      const { data: challengeData, error: cErr } = await supabase.auth.mfa.challenge({ factorId: mfaFactorId });
      if (cErr) throw cErr;
      const { error: vErr } = await supabase.auth.mfa.verify({ factorId: mfaFactorId, challengeId: challengeData.id, code: mfaVerifyCode });
      if (vErr) throw vErr;
      toast.success('Two-factor authentication enabled!');
      setMfaEnrolling(false); setMfaTotpUri(''); setMfaFactorId(''); setMfaVerifyCode('');
      await loadMfaFactors();
    } catch (err: any) {
      toast.error('Verification failed: ' + err.message);
    } finally {
      setMfaVerifying(false);
    }
  };

  const unenrollMfa = async (factorId: string) => {
    setMfaUnenrolling(factorId);
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) throw error;
      toast.success('Two-factor authentication removed');
      await loadMfaFactors();
    } catch (err: any) {
      toast.error('Failed to remove 2FA: ' + err.message);
    } finally {
      setMfaUnenrolling(null);
    }
  };

  const sendTestEmail = async () => {
    if (!testEmail) { toast.error('Please enter an email address'); return; }
    setTestSending(true);
    // Force-save current data before sending so the edge function reads latest values
    if (debounceRef.current) clearTimeout(debounceRef.current);
    await persist(dataRef.current);
    try {
      const { data: result, error } = await supabase.functions.invoke('send-invoice-email', {
        body: { mode: 'test', currency: testCurrency, send_to: testEmail },
      });
      if (error) throw error;
      toast.success(`Test email sent to ${result.sent_to} (${testCurrency})`);
      setTestOpen(false);
    } catch (err: any) {
      toast.error('Failed to send test email: ' + (err.message || 'Unknown error'));
    } finally {
      setTestSending(false);
    }
  };

  const Field = useCallback(({ label, path, placeholder }: { label: string; path: string[]; placeholder?: string }) => (
    <div className="space-y-1.5">
      <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">{label}</Label>
      <Input
        defaultValue={getVal(dataRef.current, path)}
        onChange={(e) => update(path, e.target.value)}
        placeholder={placeholder}
        className="font-mono text-sm bg-background border-border"
      />
    </div>
  ), [update]);

  const iconInputRef = useRef<HTMLInputElement>(null);
  const [iconUploading, setIconUploading] = useState(false);

  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIconUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `apple-touch-icon-${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from('client-logos').upload(fileName, file, { upsert: true });
      if (uploadErr) throw uploadErr;
      const { data: urlData } = supabase.storage.from('client-logos').getPublicUrl(fileName);
      update(['branding', 'apple_touch_icon_url'], urlData.publicUrl);
      toast.success('Icon uploaded');
    } catch (err: any) {
      toast.error('Upload failed: ' + (err.message || 'Unknown error'));
    } finally {
      setIconUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl pb-20 overflow-x-hidden">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-mono text-xl font-bold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground">Manage payments, banking & tracking</p>
        </div>
        <div className="flex items-center gap-2">
          {saving && (
            <Badge variant="outline" className="gap-1 text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Saving…
            </Badge>
          )}
          {saved && (
            <Badge variant="outline" className="gap-1 text-primary border-primary/30">
              <CheckCircle2 className="h-3 w-3" /> Saved
            </Badge>
          )}
          <Button variant="outline" size="sm" className="gap-1.5 font-mono text-xs" onClick={() => setTestOpen(true)}>
            <Mail className="h-3.5 w-3.5" /> Send Test Email
          </Button>
        </div>
      </div>

      {/* Test Email Dialog */}
      <Dialog open={testOpen} onOpenChange={setTestOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-mono">Send Test Invoice Email</DialogTitle>
            <DialogDescription>
              Sends a mock invoice using real products from your catalogue, priced in the selected currency.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Currency</Label>
              <Select value={testCurrency} onValueChange={setTestCurrency}>
                <SelectTrigger className="font-mono text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">🌍 USD — Global</SelectItem>
                  <SelectItem value="ZAR">🇿🇦 ZAR — South Africa</SelectItem>
                  <SelectItem value="THB">🇹🇭 THB — Thailand</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Send To</Label>
              <Input value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="you@example.com" type="email" className="font-mono text-sm" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setTestOpen(false)}>Cancel</Button>
            <Button onClick={sendTestEmail} disabled={testSending} className="gap-1.5">
              {testSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              {testSending ? 'Sending…' : 'Send Test'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── SECTION 1: Payments & Banking ─── */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-mono text-base">
            <Landmark className="h-4 w-4 text-primary" /> Payments & Banking
          </CardTitle>
          <CardDescription>Bank accounts, payment links and gateway toggles</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Regional Bank Accounts — inner tabs */}
          <div>
            <h3 className="font-mono text-sm font-medium text-foreground mb-3">Regional Bank Accounts</h3>
            <Tabs defaultValue="global">
              <TabsList className="bg-muted/50 w-full justify-start flex-wrap h-auto gap-1 p-1">
                <TabsTrigger value="global" className="gap-1.5 font-mono text-xs"><Globe className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Global</span> USD</TabsTrigger>
                <TabsTrigger value="thai" className="gap-1.5 font-mono text-xs">🇹🇭 <span className="hidden sm:inline">Thailand</span> THB</TabsTrigger>
                <TabsTrigger value="south_africa" className="gap-1.5 font-mono text-xs">🇿🇦 <span className="hidden sm:inline">South Africa</span> ZAR</TabsTrigger>
              </TabsList>

              <TabsContent value="global" className="mt-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Bank Name" path={['global', 'bank_name']} placeholder="e.g. Wise, Mercury" />
                  <Field label="Account Name" path={['global', 'account_name']} placeholder="DigiiWorks LLC" />
                  <Field label="Account Number / IBAN" path={['global', 'account_number']} placeholder="GB12 XXXX …" />
                  <Field label="SWIFT / BIC Code" path={['global', 'swift_code']} placeholder="TRWIGB2L" />
                  <Field label="Routing Number" path={['global', 'routing_number']} placeholder="021000021" />
                  <Field label="Currency" path={['global', 'currency']} placeholder="USD" />
                  <Field label="Reference Note" path={['global', 'reference_note']} placeholder="Use invoice number as reference" />
                </div>
              </TabsContent>

              <TabsContent value="thai" className="mt-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Bank Name" path={['thai', 'bank_name']} placeholder="e.g. Bangkok Bank, Kasikorn" />
                  <Field label="Account Name" path={['thai', 'account_name']} placeholder="DigiiWorks Co., Ltd." />
                  <Field label="Account Number" path={['thai', 'account_number']} placeholder="xxx-x-xxxxx-x" />
                  <Field label="Branch" path={['thai', 'branch']} placeholder="e.g. Sukhumvit" />
                  <Field label="Currency" path={['thai', 'currency']} placeholder="THB" />
                  <Field label="Reference Note" path={['thai', 'reference_note']} placeholder="Use invoice number as reference" />
                </div>
              </TabsContent>

              <TabsContent value="south_africa" className="mt-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Bank Name" path={['south_africa', 'bank_name']} placeholder="e.g. FNB, Capitec, Standard Bank" />
                  <Field label="Account Name" path={['south_africa', 'account_name']} placeholder="DigiiWorks (Pty) Ltd" />
                  <Field label="Account Number" path={['south_africa', 'account_number']} placeholder="62xxxxxxx" />
                  <Field label="Branch Code" path={['south_africa', 'branch_code']} placeholder="250655" />
                  <Field label="Account Type" path={['south_africa', 'account_type']} placeholder="Cheque / Savings" />
                  <Field label="Currency" path={['south_africa', 'currency']} placeholder="ZAR" />
                  <Field label="Reference Note" path={['south_africa', 'reference_note']} placeholder="Use invoice number as reference" />
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <Separator />

          {/* Payment Links */}
          <div>
            <h3 className="font-mono text-sm font-medium text-foreground mb-3 flex items-center gap-2">
              <LinkIcon className="h-3.5 w-3.5 text-primary" /> Payment Links
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Yoco Payment Link" path={['payment_links', 'yoco_payment_link']} placeholder="https://pay.yoco.com/your-link" />
              <Field label="Wise Payment Link" path={['payment_links', 'wise_payment_link']} placeholder="https://wise.com/pay/your-link" />
            </div>
          </div>

          <Separator />

          {/* Payment Methods */}
          <div>
            <h3 className="font-mono text-sm font-medium text-foreground mb-3 flex items-center gap-2">
              <CreditCard className="h-3.5 w-3.5 text-primary" /> Payment Methods
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-center justify-between rounded-lg border border-border p-4">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium text-foreground">Stripe</Label>
                  <p className="text-xs text-muted-foreground">Card payments — all currencies</p>
                </div>
                <Switch
                  checked={data.payment_methods?.stripe_enabled === true || data.payment_methods?.stripe_enabled === 'true' as any}
                  onCheckedChange={(checked) => update(['payment_methods', 'stripe_enabled'], checked)}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border p-4">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium text-foreground">Yoco</Label>
                  <p className="text-xs text-muted-foreground">ZAR card payments — South Africa</p>
                </div>
                <Switch
                  checked={data.payment_methods?.yoco_enabled === true || data.payment_methods?.yoco_enabled === 'true' as any || (data.payment_methods?.yoco_enabled === undefined)}
                  onCheckedChange={(checked) => update(['payment_methods', 'yoco_enabled'], checked)}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── SECTION 2: Social Media ─── */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-mono text-base">
            <Share2 className="h-4 w-4 text-primary" /> Social Media
          </CardTitle>
          <CardDescription>Add URLs to display social links in the site footer</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Instagram" path={['socials', 'instagram']} placeholder="https://instagram.com/digiiworks" />
          <Field label="Facebook" path={['socials', 'facebook']} placeholder="https://facebook.com/digiiworks" />
          <Field label="LinkedIn" path={['socials', 'linkedin']} placeholder="https://linkedin.com/company/digiiworks" />
          <Field label="GitHub" path={['socials', 'github']} placeholder="https://github.com/digiiworks" />
        </CardContent>
      </Card>

      {/* ─── SECTION: FX Rates ─── */}
      <Card className="border-border bg-card">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 font-mono text-base">
                <TrendingUp className="h-4 w-4 text-primary" /> Exchange Rates
              </CardTitle>
              <CardDescription className="mt-1.5">
                Used to auto-price products in ZAR/THB when no direct price column is set. Products with a specific price always take priority.
              </CardDescription>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="font-mono text-xs gap-1.5 whitespace-nowrap"
              onClick={handleRefreshRates}
              disabled={fxRefreshing}
            >
              {fxRefreshing ? <Loader2 className="h-3 w-3 animate-spin" /> : <TrendingUp className="h-3 w-3" />}
              {fxRefreshing ? 'Fetching...' : 'Refresh Live Rates'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {fxRates.length === 0 && <p className="text-xs text-muted-foreground font-mono">No exchange rates found. Click "Refresh Live Rates" to fetch current rates from the market.</p>}
          {fxRates.map(r => (
            <div key={r.currency_code} className="rounded-lg border border-border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm font-semibold text-foreground">{r.currency_code}</span>
                {r.updated_at && <span className="font-mono text-[10px] text-muted-foreground">Updated {new Date(r.updated_at).toLocaleDateString()}</span>}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Rate vs USD (1 USD = X {r.currency_code})</Label>
                  <Input
                    type="number" step="0.0001" min="0.0001"
                    value={r.rate_vs_usd}
                    onChange={e => setFxRates(prev => prev.map(x => x.currency_code === r.currency_code ? { ...x, rate_vs_usd: e.target.value } : x))}
                    className="font-mono text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Margin % (markup added on top)</Label>
                  <Input
                    type="number" step="0.1" min="0"
                    value={r.margin_pct}
                    onChange={e => setFxRates(prev => prev.map(x => x.currency_code === r.currency_code ? { ...x, margin_pct: e.target.value } : x))}
                    className="font-mono text-sm"
                  />
                </div>
              </div>
              {parseFloat(r.rate_vs_usd) > 0 && (
                <p className="font-mono text-xs text-muted-foreground">
                  Preview: $10 USD → {r.currency_code} {(10 * parseFloat(r.rate_vs_usd) * (1 + parseFloat(r.margin_pct || '0') / 100)).toFixed(2)}
                  {parseFloat(r.margin_pct) > 0 && ` (incl. ${r.margin_pct}% margin)`}
                </p>
              )}
              <Button
                size="sm"
                className="font-mono text-xs gap-1.5"
                onClick={() => saveFxRate(r.currency_code)}
                disabled={fxSaving === r.currency_code}
              >
                {fxSaving === r.currency_code ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                Save {r.currency_code} Rate
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* ─── SECTION: Dunning Reminders ─── */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-mono text-base">
            <Bell className="h-4 w-4 text-primary" /> Payment Dunning
          </CardTitle>
          <CardDescription>
            Automatically sends reminder emails to clients with overdue invoices at 1, 7, and 14 days past due. Each milestone is sent only once per invoice.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-border/50 bg-muted/20 p-4 space-y-1">
            <p className="font-mono text-xs text-foreground font-medium">Reminder schedule</p>
            <ul className="font-mono text-xs text-muted-foreground space-y-1 list-disc list-inside">
              <li>Day 1 overdue — first gentle reminder</li>
              <li>Day 7 overdue — follow-up reminder</li>
              <li>Day 14 overdue — final reminder</li>
            </ul>
            <p className="font-mono text-[10px] text-muted-foreground pt-2">
              Schedule automatically via pg_cron at 8am UTC daily, or trigger manually below.
            </p>
          </div>
          <Button
            variant="outline"
            className="font-mono text-xs gap-1.5"
            onClick={runDunning}
            disabled={dunningRunning}
          >
            {dunningRunning ? <Loader2 className="h-3 w-3 animate-spin" /> : <Bell className="h-3 w-3" />}
            Run Dunning Now
          </Button>
        </CardContent>
      </Card>

      {/* ─── SECTION: Two-Factor Authentication ─── */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-mono text-base">
            <ShieldCheck className="h-4 w-4 text-primary" /> Two-Factor Authentication
          </CardTitle>
          <CardDescription>
            Protect your account with a TOTP authenticator app (Google Authenticator, Authy, etc.).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {mfaFactors.filter(f => f.status === 'verified').length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
                <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                <span className="font-mono text-sm text-primary font-medium">2FA Active — your account is protected</span>
              </div>
              {mfaFactors.filter(f => f.status === 'verified').map(f => (
                <div key={f.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <p className="font-mono text-xs text-foreground">{f.friendly_name || 'Authenticator App'}</p>
                    <p className="font-mono text-[10px] text-muted-foreground">TOTP · {f.factor_type}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="font-mono text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                    onClick={() => unenrollMfa(f.id)}
                    disabled={mfaUnenrolling === f.id}
                  >
                    {mfaUnenrolling === f.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Remove 2FA'}
                  </Button>
                </div>
              ))}
            </div>
          ) : mfaEnrolling ? (
            <div className="space-y-4">
              <p className="font-mono text-xs text-muted-foreground">Scan this QR code with your authenticator app, then enter the 6-digit code to verify.</p>
              {mfaTotpUri && (
                <div className="flex justify-center">
                  <img
                    src={`https://chart.googleapis.com/chart?chs=200x200&chld=M|0&cht=qr&chl=${encodeURIComponent(mfaTotpUri)}`}
                    alt="Scan with authenticator app"
                    className="rounded-lg border border-border"
                    width={200}
                    height={200}
                  />
                </div>
              )}
              <div className="space-y-1">
                <Label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">6-digit code</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  value={mfaVerifyCode}
                  onChange={e => setMfaVerifyCode(e.target.value.replace(/\D/g, ''))}
                  className="font-mono text-center text-lg tracking-widest"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  className="flex-1 font-mono text-xs"
                  onClick={verifyMfaEnroll}
                  disabled={mfaVerifying || mfaVerifyCode.length !== 6}
                >
                  {mfaVerifying ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                  Verify & Enable 2FA
                </Button>
                <Button
                  variant="outline"
                  className="font-mono text-xs"
                  onClick={() => { setMfaEnrolling(false); setMfaTotpUri(''); setMfaFactorId(''); setMfaVerifyCode(''); }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="font-mono text-xs text-muted-foreground">Two-factor authentication is not enabled. Add an extra layer of security to your account.</p>
              <Button
                variant="outline"
                className="font-mono text-xs gap-1.5"
                onClick={startMfaEnroll}
              >
                <ShieldCheck className="h-3 w-3" /> Enable 2FA
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── SECTION 3: Branding ─── */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-mono text-base">
            <Image className="h-4 w-4 text-primary" /> Branding
          </CardTitle>
          <CardDescription>Site icons and branding assets</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-mono text-sm font-medium text-foreground mb-3">Apple Touch Icon</h3>
            <p className="text-xs text-muted-foreground mb-3">Shown when users add the site to their iOS home screen (180×180 PNG recommended)</p>
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-xl border border-border bg-muted/30 flex items-center justify-center overflow-hidden shrink-0">
                {data.branding?.apple_touch_icon_url ? (
                  <img src={data.branding.apple_touch_icon_url} alt="Apple touch icon" className="h-full w-full object-contain" />
                ) : (
                  <Image className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <div className="space-y-2 flex-1">
                <Input
                  defaultValue={data.branding?.apple_touch_icon_url || ''}
                  key={`branding.apple_touch_icon_url.${data.branding?.apple_touch_icon_url}`}
                  onChange={(e) => update(['branding', 'apple_touch_icon_url'], e.target.value)}
                  placeholder="/apple-touch-icon.png or full URL"
                  className="font-mono text-sm bg-background border-border"
                />
                <input ref={iconInputRef} type="file" accept="image/*" className="hidden" onChange={handleIconUpload} />
                <Button variant="outline" size="sm" className="gap-1.5 font-mono text-xs" onClick={() => iconInputRef.current?.click()} disabled={iconUploading}>
                  {iconUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                  {iconUploading ? 'Uploading…' : 'Upload Image'}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── SECTION 4: Tracking & Analytics ─── */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-mono text-base">
            <BarChart3 className="h-4 w-4 text-primary" /> Tracking & Analytics
          </CardTitle>
          <CardDescription>Pixel IDs injected into the site for analytics & remarketing</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Google Pixel / GA4 Measurement ID" path={['tracking', 'google_pixel_id']} placeholder="G-XXXXXXXXXX or AW-XXXXXXXXX" />
          <Field label="Meta (Facebook) Pixel ID" path={['tracking', 'meta_pixel_id']} placeholder="123456789012345" />
        </CardContent>
      </Card>

      {/* Invoice Numbering */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-mono text-base">
            <Hash className="h-4 w-4 text-primary" /> Invoice Numbering
          </CardTitle>
          <CardDescription>
            Configure the prefix and padding for auto-generated invoice numbers.
            Example: prefix "INV-" with 4 digits → INV-0042
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="font-mono text-xs">Prefix</Label>
              <Input
                value={invoiceConfig.prefix}
                onChange={e => setInvoiceConfig(p => ({ ...p, prefix: e.target.value }))}
                placeholder="INV-"
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="font-mono text-xs">Digit Padding</Label>
              <Input
                type="number" min={1} max={8}
                value={invoiceConfig.padding}
                onChange={e => setInvoiceConfig(p => ({ ...p, padding: parseInt(e.target.value) || 4 }))}
                className="font-mono text-sm"
              />
            </div>
          </div>
          <p className="font-mono text-xs text-muted-foreground">
            Preview: {invoiceConfig.prefix}{String(42).padStart(invoiceConfig.padding, '0')}
          </p>
          <Button onClick={handleSaveInvoiceConfig} disabled={invConfigLoading} className="font-mono text-xs">
            {invConfigLoading ? 'Saving...' : 'Save'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsPage;
