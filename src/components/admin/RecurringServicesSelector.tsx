import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Trash2, RefreshCw, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ProductCombobox from './ProductCombobox';

type Product = { id: string; name: string; price_usd: number; price_zar: number; price_thb: number; description?: string | null; category?: string | null };

const getProductPrice = (p: Product, currency: string) => {
  if (currency === 'ZAR') return p.price_zar || p.price_usd;
  if (currency === 'THB') return p.price_thb || p.price_usd;
  return p.price_usd;
};

const fmtCurrency = (n: number, currency: string = 'USD') => {
  const symbol = currency === 'ZAR' ? 'R' : currency === 'THB' ? '฿' : '$';
  return `${symbol}${n.toFixed(2)}`;
};

const BILLING_CYCLES = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
] as const;

const cycleLabel = (cycle: string) => BILLING_CYCLES.find(c => c.value === cycle)?.label ?? cycle;

export type RecurringService = {
  id?: string;
  product_id: string;
  product_name: string;
  quantity: number;
  price: number;
  /** null = use standard product price; number = client-specific override */
  price_override: number | null;
  active: boolean;
  billing_cycle: string;
  start_date: string | null;
};

interface RecurringServicesSelectorProps {
  services: RecurringService[];
  onChange: (services: RecurringService[]) => void;
  currency?: string;
}

export default function RecurringServicesSelector({ services, onChange, currency = 'USD' }: RecurringServicesSelectorProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('products')
      .select('id, name, price_usd, price_zar, price_thb, description, category')
      .eq('active', true)
      .order('name')
      .then(({ data }) => {
        setProducts(data ?? []);
        setLoading(false);
      });
  }, []);

  // Re-price existing services when currency changes
  useEffect(() => {
    if (products.length === 0 || services.length === 0) return;
    const updated = services.map(s => {
      const product = products.find(p => p.id === s.product_id);
      if (!product) return s;
      const standardPrice = getProductPrice(product, currency);
      return { ...s, price: standardPrice };
    });
    if (updated.some((u, i) => u.price !== services[i].price)) {
      onChange(updated);
    }
  }, [currency, products]);

  const availableProducts = products.filter(
    p => !services.some(s => s.product_id === p.id)
  );

  const addService = (product: Product) => {
    const price = getProductPrice(product, currency);
    onChange([
      ...services,
      {
        product_id: product.id,
        product_name: product.name,
        quantity: 1,
        price,
        price_override: null,
        active: true,
        billing_cycle: 'monthly',
        start_date: null,
      },
    ]);
  };

  const updateService = (index: number, updates: Partial<RecurringService>) => {
    const updated = services.map((s, i) => (i === index ? { ...s, ...updates } : s));
    onChange(updated);
  };

  const removeService = (index: number) => {
    onChange(services.filter((_, i) => i !== index));
  };

  const effectivePrice = (s: RecurringService) => s.price_override ?? s.price;

  const needsStartDate = (cycle: string) => cycle === 'monthly' || cycle === 'quarterly' || cycle === 'yearly';

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
        <RefreshCw className="h-3 w-3 animate-spin" /> Loading products...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Label className="font-mono text-xs flex items-center gap-1.5">
        <RefreshCw className="h-3 w-3" /> Recurring Services
      </Label>

      {services.length > 0 && (
        <div className="space-y-2">
          {services.map((service, idx) => {
            const hasOverride = service.price_override !== null;
            return (
              <div
                key={service.product_id}
                className="rounded-md border border-border bg-background p-2 space-y-1.5"
              >
                {/* Row 1: Name, Qty, Toggle, Delete */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{service.product_name}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">
                      Standard: {fmtCurrency(service.price, currency)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Label className="text-[10px] text-muted-foreground">Qty</Label>
                    <Input
                      type="number"
                      min={1}
                      value={service.quantity}
                      onChange={e =>
                        updateService(idx, { quantity: Math.max(1, parseInt(e.target.value) || 1) })
                      }
                      className="w-14 h-7 text-xs bg-card border-border text-center"
                    />
                  </div>
                  <Switch
                    checked={service.active}
                    onCheckedChange={checked => updateService(idx, { active: checked })}
                    className="shrink-0"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive shrink-0"
                    onClick={() => removeService(idx)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {/* Row 2: Billing cycle + start date */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Label className="text-[10px] text-muted-foreground whitespace-nowrap">Cycle</Label>
                  <Select
                    value={service.billing_cycle}
                    onValueChange={val => {
                      const updates: Partial<RecurringService> = { billing_cycle: val };
                      // Clear start_date if not needed
                      if (!needsStartDate(val)) updates.start_date = null;
                      updateService(idx, updates);
                    }}
                  >
                    <SelectTrigger className="h-7 text-xs bg-card border-border w-[110px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BILLING_CYCLES.map(c => (
                        <SelectItem key={c.value} value={c.value} className="text-xs">
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {needsStartDate(service.billing_cycle) && (
                    <>
                      <Label className="text-[10px] text-muted-foreground whitespace-nowrap">Start</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            className={cn(
                              "h-7 text-xs px-2 bg-card border-border font-mono",
                              !service.start_date && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="h-3 w-3 mr-1" />
                            {service.start_date
                              ? format(new Date(service.start_date), 'dd MMM yyyy')
                              : 'Pick date'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={service.start_date ? new Date(service.start_date) : undefined}
                            onSelect={date =>
                              updateService(idx, {
                                start_date: date ? format(date, 'yyyy-MM-dd') : null,
                              })
                            }
                            initialFocus
                            className={cn("p-3 pointer-events-auto")}
                          />
                        </PopoverContent>
                      </Popover>
                    </>
                  )}
                </div>

                {/* Row 3: Price override */}
                <div className="flex items-center gap-2">
                  <Label className="text-[10px] text-muted-foreground whitespace-nowrap">Client Price</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={hasOverride ? service.price_override! : ''}
                    placeholder={service.price.toFixed(2)}
                    onChange={e => {
                      const val = e.target.value;
                      updateService(idx, {
                        price_override: val === '' ? null : Math.max(0, parseFloat(val) || 0),
                      });
                    }}
                    className={`h-7 text-xs bg-card border-border flex-1 font-mono ${hasOverride ? 'text-primary' : 'text-muted-foreground'}`}
                  />
                  {hasOverride && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-[10px] text-muted-foreground px-2"
                      onClick={() => updateService(idx, { price_override: null })}
                    >
                      Reset
                    </Button>
                  )}
                  <span className="font-mono text-xs text-foreground shrink-0">
                    {fmtCurrency(effectivePrice(service), currency)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {availableProducts.length > 0 ? (
        <ProductCombobox
          products={availableProducts}
          value={null}
          onSelect={addService}
          placeholder="Add recurring service..."
        />
      ) : services.length > 0 ? (
        <p className="text-[10px] text-muted-foreground">All products assigned</p>
      ) : (
        <p className="text-[10px] text-muted-foreground">No active products available</p>
      )}

      {services.length > 0 && (
        <div className="flex items-center justify-between text-xs pt-1 border-t border-border/50">
          <span className="text-muted-foreground">
            {services.filter(s => s.active).length} active service(s)
          </span>
          <span className="font-mono font-medium text-foreground">
            {fmtCurrency(
              services
                .filter(s => s.active)
                .reduce((sum, s) => sum + effectivePrice(s) * s.quantity, 0),
              currency
            )}
            /month equiv.
          </span>
        </div>
      )}
    </div>
  );
}
