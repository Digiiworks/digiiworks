import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, Mail, Phone, MapPin, FileText } from 'lucide-react';
import { format } from 'date-fns';

// STATUS_COLORS for invoices
const INV_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-zinc-500/20 text-zinc-400',
  sent: 'bg-blue-500/20 text-blue-400',
  paid: 'bg-emerald-500/20 text-emerald-400',
  overdue: 'bg-red-500/20 text-red-400',
  cancelled: 'bg-zinc-700/20 text-zinc-500',
  partial: 'bg-yellow-500/20 text-yellow-400',
};

type Props = {
  companyId: string | null;
  onClose: () => void;
  onEdit: (companyId: string) => void;
  onNewInvoice: (companyId: string) => void;
};

export default function ClientDetailSheet({ companyId, onClose, onEdit, onNewInvoice }: Props) {
  // Fetch company details
  const { data: company } = useQuery({
    queryKey: ['client-detail', companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data } = await supabase
        .from('client_companies')
        .select('*, profiles!client_companies_user_id_fkey(display_name, email, avatar_url)')
        .eq('id', companyId!)
        .single();
      return data;
    },
  });

  // Fetch recent invoices for this company
  const { data: invoices } = useQuery({
    queryKey: ['client-invoices', companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('invoices')
        .select('id, invoice_number, status, total, paid_amount, currency, due_date, created_at')
        .eq('client_company_id', companyId!)
        .order('created_at', { ascending: false })
        .limit(5);
      return (data ?? []) as any[];
    },
  });

  // Fetch recurring services for this company
  const { data: services } = useQuery({
    queryKey: ['client-services', companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data } = await supabase
        .from('client_recurring_services')
        .select('id, quantity, unit_price_override, billing_cycle, active, products(name, price_usd)')
        .eq('client_company_id', companyId!)
        .eq('active', true);
      return data ?? [];
    },
  });

  // Compute financials
  const outstanding = (invoices ?? [])
    .filter(i => ['sent', 'overdue', 'partial', 'draft'].includes(i.status))
    .reduce((sum, i) => sum + (i.status === 'partial' ? (i.total - (i.paid_amount ?? 0)) : i.total), 0);

  const totalInvoiced = (invoices ?? []).reduce((sum, i) => sum + i.total, 0);
  const currency = company?.currency ?? 'USD';
  const sym = currency === 'ZAR' ? 'R' : currency === 'THB' ? '฿' : '$';

  const fmtAmt = (n: number) => `${sym}${n.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <Sheet open={!!companyId} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent side="right" className="w-full sm:w-[480px] overflow-y-auto p-0">
        {company ? (
          <>
            {/* Header */}
            <div className="p-6 border-b border-border">
              <div className="flex items-start gap-3 mb-4">
                {company.logo_url ? (
                  <img src={company.logo_url} alt="" className="w-12 h-12 rounded-lg object-cover border border-border" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-primary" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <SheetHeader>
                    <SheetTitle className="font-mono text-base truncate">{company.company_name}</SheetTitle>
                  </SheetHeader>
                  <p className="text-xs text-muted-foreground font-mono">{currency} · {company.country ?? 'N/A'}</p>
                </div>
                <Badge className={company.active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-500/20 text-zinc-400'}>
                  {company.active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              {/* Action buttons */}
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="font-mono text-xs flex-1" onClick={() => onEdit(company.id)}>
                  Edit
                </Button>
                <Button size="sm" className="font-mono text-xs flex-1" onClick={() => onNewInvoice(company.id)}>
                  <FileText className="h-3 w-3 mr-1" /> New Invoice
                </Button>
              </div>
            </div>

            {/* Contact Info */}
            <div className="p-6 border-b border-border space-y-3">
              <h3 className="font-mono text-xs uppercase tracking-wide text-muted-foreground">Contact</h3>
              {(company as any).profiles?.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="font-mono text-xs truncate">{(company as any).profiles.email}</span>
                </div>
              )}
              {company.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="font-mono text-xs">{company.phone}</span>
                </div>
              )}
              {company.address && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <span className="font-mono text-xs">{company.address}</span>
                </div>
              )}
              {company.cc_emails?.length > 0 && (
                <div className="flex items-start gap-2">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-mono text-[10px] text-muted-foreground uppercase mb-1">CC Emails</p>
                    {company.cc_emails.map((e: string) => (
                      <p key={e} className="font-mono text-xs text-muted-foreground">{e}</p>
                    ))}
                  </div>
                </div>
              )}
              {company.notes && (
                <p className="font-mono text-xs text-muted-foreground italic border-l-2 border-border pl-2">{company.notes}</p>
              )}
            </div>

            {/* Financial Summary */}
            <div className="p-6 border-b border-border">
              <h3 className="font-mono text-xs uppercase tracking-wide text-muted-foreground mb-3">Financials</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="glass-card p-3 rounded-lg">
                  <p className="font-mono text-[10px] text-muted-foreground uppercase">Outstanding</p>
                  <p className={`font-mono text-sm font-bold ${outstanding > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {fmtAmt(outstanding)}
                  </p>
                </div>
                <div className="glass-card p-3 rounded-lg">
                  <p className="font-mono text-[10px] text-muted-foreground uppercase">Total Invoiced</p>
                  <p className="font-mono text-sm font-bold">{fmtAmt(totalInvoiced)}</p>
                </div>
              </div>
            </div>

            {/* Recent Invoices */}
            <div className="p-6 border-b border-border">
              <h3 className="font-mono text-xs uppercase tracking-wide text-muted-foreground mb-3">
                Recent Invoices ({invoices?.length ?? 0})
              </h3>
              {invoices?.length === 0 ? (
                <p className="font-mono text-xs text-muted-foreground">No invoices yet</p>
              ) : (
                <div className="space-y-2">
                  {invoices?.map(inv => (
                    <div key={inv.id} className="flex items-center justify-between gap-2 py-1.5 border-b border-border/50 last:border-0">
                      <div className="min-w-0">
                        <p className="font-mono text-xs font-medium">{inv.invoice_number}</p>
                        {inv.due_date && (
                          <p className="font-mono text-[10px] text-muted-foreground">
                            Due {format(new Date(inv.due_date), 'dd MMM yyyy')}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${INV_STATUS_COLORS[inv.status] ?? ''}`}>
                          {inv.status}
                        </span>
                        <span className="font-mono text-xs">{fmtAmt(inv.total)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recurring Services */}
            {(services?.length ?? 0) > 0 && (
              <div className="p-6">
                <h3 className="font-mono text-xs uppercase tracking-wide text-muted-foreground mb-3">
                  Active Services ({services?.length})
                </h3>
                <div className="space-y-2">
                  {services?.map((svc: any) => (
                    <div key={svc.id} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                      <div>
                        <p className="font-mono text-xs">{svc.products?.name ?? 'Custom service'}</p>
                        <p className="font-mono text-[10px] text-muted-foreground capitalize">{svc.billing_cycle}</p>
                      </div>
                      <span className="font-mono text-xs text-muted-foreground">
                        {svc.quantity > 1 ? `×${svc.quantity}` : ''}
                        {svc.unit_price_override != null
                          ? ` ${fmtAmt(svc.unit_price_override * svc.quantity)}`
                          : svc.products?.price_usd ? ` $${svc.products.price_usd}` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
