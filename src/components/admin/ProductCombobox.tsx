import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Search, Tag } from 'lucide-react';

type Product = { id: string; name: string; price_usd: number; description?: string | null; category?: string | null };

interface ProductComboboxProps {
  products: Product[];
  value: string | null;
  onSelect: (product: Product) => void;
  placeholder?: string;
}

export default function ProductCombobox({ products, value, onSelect, placeholder = 'Search products...' }: ProductComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const selectedProduct = products.find(p => p.id === value);

  const filtered = query.trim()
    ? products.filter(p => {
        const q = query.toLowerCase();
        return p.name.toLowerCase().includes(q) || 
               (p.description ?? '').toLowerCase().includes(q) ||
               (p.category ?? '').toLowerCase().includes(q);
      })
    : products;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={open ? query : (selectedProduct ? selectedProduct.name : query)}
          onChange={e => { setQuery(e.target.value); if (!open) setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="h-9 pl-7 text-xs bg-background border-border"
        />
      </div>
      {open && (
        <div className="absolute z-[100] bottom-full mb-1 w-full max-h-48 overflow-y-auto rounded-md border border-border bg-popover shadow-md">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">No products found</div>
          ) : (
            filtered.map(p => (
              <button
                key={p.id}
                type="button"
                className={`flex w-full items-center justify-between px-3 py-2 text-left text-xs hover:bg-accent transition-colors ${
                  p.id === value ? 'bg-accent/50 text-accent-foreground' : 'text-foreground'
                }`}
                onClick={() => { onSelect(p); setQuery(''); setOpen(false); }}
              >
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="truncate font-medium">{p.name}</span>
                  {p.category && (
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Tag className="h-2.5 w-2.5" /> {p.category}
                    </span>
                  )}
                </div>
                <span className="ml-2 font-mono text-muted-foreground shrink-0">${p.price_usd.toFixed(2)}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
