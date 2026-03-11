import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Trash2, RefreshCw } from 'lucide-react';
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

export type RecurringService = {
  id?: string;
  product_id: string;
  product_name: string;
  quantity: number;
  price: number;
  active: boolean;
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
        active: true,
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
          {services.map((service, idx) => (
            <div
              key={service.product_id}
              className="flex items-center gap-2 rounded-md border border-border bg-background p-2"
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{service.product_name}</p>
                <p className="text-[10px] text-muted-foreground font-mono">
                  {fmtCurrency(service.price, currency)} / unit
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
          ))}
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
                .reduce((sum, s) => sum + s.price * s.quantity, 0),
              currency
            )}
            /month
          </span>
        </div>
      )}
    </div>
  );
}
