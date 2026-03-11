import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Loader2, Globe, Landmark, Link as LinkIcon } from 'lucide-react';

const PAGE_KEY = 'payment_settings';

interface BankingInfo {
  global: {
    bank_name: string;
    account_name: string;
    account_number: string;
    swift_code: string;
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
}

const defaultData: BankingInfo = {
  global: { bank_name: '', account_name: '', account_number: '', swift_code: '', currency: 'USD', reference_note: '' },
  thai: { bank_name: '', account_name: '', account_number: '', branch: '', currency: 'THB', reference_note: '' },
  south_africa: { bank_name: '', account_name: '', account_number: '', branch_code: '', account_type: 'Cheque', currency: 'ZAR', reference_note: '' },
  payment_links: { yoco_payment_link: '', wise_payment_link: '' },
};

const SettingsPage = () => {
  const [data, setData] = useState<BankingInfo>(defaultData);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [recordId, setRecordId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const update = (path: string[], value: string) => {
    setData((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      let obj = next;
      for (let i = 0; i < path.length - 1; i++) obj = obj[path[i]];
      obj[path[path.length - 1]] = value;

      // Auto-save with 5s debounce
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => persist(next), 5000);

      return next;
    });
  };
  const getVal = (obj: any, path: string[]) => {
    let v = obj;
    for (const k of path) v = v?.[k] ?? '';
    return v;
  };

  const Field = ({ label, path, placeholder }: { label: string; path: string[]; placeholder?: string }) => (
    <div className="space-y-1.5">
      <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">{label}</Label>
      <Input
        defaultValue={getVal(data, path)}
        key={path.join('.')}
        onChange={(e) => update(path, e.target.value)}
        placeholder={placeholder}
        className="font-mono text-sm bg-background border-border"
      />
    </div>
  );
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-mono text-xl font-bold text-foreground">Payment Settings</h1>
          <p className="text-sm text-muted-foreground">Banking details shown on invoices & emails per region</p>
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
        </div>
      </div>

      <Tabs defaultValue="global" className="space-y-4">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="global" className="gap-1.5 font-mono text-xs"><Globe className="h-3.5 w-3.5" /> Global (USD)</TabsTrigger>
          <TabsTrigger value="thai" className="gap-1.5 font-mono text-xs">🇹🇭 Thailand (THB)</TabsTrigger>
          <TabsTrigger value="south_africa" className="gap-1.5 font-mono text-xs">🇿🇦 South Africa (ZAR)</TabsTrigger>
          <TabsTrigger value="links" className="gap-1.5 font-mono text-xs"><LinkIcon className="h-3.5 w-3.5" /> Payment Links</TabsTrigger>
        </TabsList>

        <TabsContent value="global">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-mono text-base">
                <Landmark className="h-4 w-4 text-primary" /> Global Bank Details
              </CardTitle>
              <CardDescription>Used for USD clients and international transfers via SWIFT</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field label="Bank Name" path={['global', 'bank_name']} placeholder="e.g. Wise, Mercury" />
              <Field label="Account Name" path={['global', 'account_name']} placeholder="DigiiWorks LLC" />
              <Field label="Account Number / IBAN" path={['global', 'account_number']} placeholder="GB12 XXXX …" />
              <Field label="SWIFT / BIC Code" path={['global', 'swift_code']} placeholder="TRWIGB2L" />
              <Field label="Currency" path={['global', 'currency']} placeholder="USD" />
              <Field label="Reference Note" path={['global', 'reference_note']} placeholder="Use invoice number as reference" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="thai">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-mono text-base">
                <Landmark className="h-4 w-4 text-primary" /> Thailand Bank Details
              </CardTitle>
              <CardDescription>Used for THB clients paying via local Thai bank transfer</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field label="Bank Name" path={['thai', 'bank_name']} placeholder="e.g. Bangkok Bank, Kasikorn" />
              <Field label="Account Name" path={['thai', 'account_name']} placeholder="DigiiWorks Co., Ltd." />
              <Field label="Account Number" path={['thai', 'account_number']} placeholder="xxx-x-xxxxx-x" />
              <Field label="Branch" path={['thai', 'branch']} placeholder="e.g. Sukhumvit" />
              <Field label="Currency" path={['thai', 'currency']} placeholder="THB" />
              <Field label="Reference Note" path={['thai', 'reference_note']} placeholder="Use invoice number as reference" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="south_africa">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-mono text-base">
                <Landmark className="h-4 w-4 text-primary" /> South Africa Bank Details
              </CardTitle>
              <CardDescription>Used for ZAR clients paying via local EFT</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field label="Bank Name" path={['south_africa', 'bank_name']} placeholder="e.g. FNB, Capitec, Standard Bank" />
              <Field label="Account Name" path={['south_africa', 'account_name']} placeholder="DigiiWorks (Pty) Ltd" />
              <Field label="Account Number" path={['south_africa', 'account_number']} placeholder="62xxxxxxx" />
              <Field label="Branch Code" path={['south_africa', 'branch_code']} placeholder="250655" />
              <Field label="Account Type" path={['south_africa', 'account_type']} placeholder="Cheque / Savings" />
              <Field label="Currency" path={['south_africa', 'currency']} placeholder="ZAR" />
              <Field label="Reference Note" path={['south_africa', 'reference_note']} placeholder="Use invoice number as reference" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="links">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-mono text-base">
                <LinkIcon className="h-4 w-4 text-primary" /> Direct Payment Links
              </CardTitle>
              <CardDescription>Links shown on invoices and emails for quick online payments</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label="Yoco Payment Link" path={['payment_links', 'yoco_payment_link']} placeholder="https://pay.yoco.com/your-link" />
              <Separator />
              <Field label="Wise Payment Link" path={['payment_links', 'wise_payment_link']} placeholder="https://wise.com/pay/your-link" />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsPage;
