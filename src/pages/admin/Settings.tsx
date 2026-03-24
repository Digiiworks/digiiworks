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
import { CheckCircle2, Loader2, Globe, Landmark, Link as LinkIcon, BarChart3, Mail, CreditCard, Share2, Image, Upload } from 'lucide-react';
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
      setLoading(false);
    };
    load();
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
    <div className="space-y-8 max-w-4xl">
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
              <TabsList className="bg-muted/50 w-full justify-start">
                <TabsTrigger value="global" className="gap-1.5 font-mono text-xs"><Globe className="h-3.5 w-3.5" /> Global (USD)</TabsTrigger>
                <TabsTrigger value="thai" className="gap-1.5 font-mono text-xs">🇹🇭 Thailand (THB)</TabsTrigger>
                <TabsTrigger value="south_africa" className="gap-1.5 font-mono text-xs">🇿🇦 South Africa (ZAR)</TabsTrigger>
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
    </div>
  );
};

export default SettingsPage;
