import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

interface InvoiceItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

const currencySymbol = (c: string) => (c === 'ZAR' ? 'R' : c === 'THB' ? '฿' : '$');

const InvoicePrint = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [client, setClient] = useState<any>(null);
  const [currency, setCurrency] = useState('USD');
  const [paymentSettings, setPaymentSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [invoice, setInvoice] = useState<any>(null);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [client, setClient] = useState<any>(null);
  const [currency, setCurrency] = useState('USD');
  const [paymentSettings, setPaymentSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    if (!token) { setError('Access denied — invalid link'); setLoading(false); return; }
    (async () => {
      try {
        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        const res = await fetch(
          `https://${projectId}.supabase.co/functions/v1/get-invoice-public`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ invoice_id: id, token }),
          }
        );
        if (!res.ok) { setError('Invoice not found or access denied'); setLoading(false); return; }
        const data = await res.json();
        setInvoice(data.invoice);
        setItems(data.items ?? []);
        setClient(data.client);
        setCurrency(data.currency || 'USD');
        setPaymentSettings(data.paymentSettings);
      } catch { setError('Failed to load invoice'); }
      setLoading(false);
    })();
  }, [id, token]);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', fontFamily: 'sans-serif' }}>Loading…</div>;
  if (error || !invoice) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', fontFamily: 'sans-serif', color: '#ef4444' }}>{error || 'Not found'}</div>;

  const sym = currencySymbol(currency);
  const taxAmount = Number(invoice.subtotal) * (Number(invoice.tax_rate) / 100);
  const dueDate = invoice.due_date
    ? new Date(invoice.due_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : 'On receipt';
  const statusLabel = invoice.status === 'overdue' ? 'OVERDUE' : invoice.status === 'paid' ? 'PAID' : 'AWAITING PAYMENT';
  const statusColor = invoice.status === 'overdue' ? '#ef4444' : invoice.status === 'paid' ? '#10b981' : '#0891b2';

  const bankKey = currency === 'ZAR' ? 'south_africa' : currency === 'THB' ? 'thai' : 'global';
  const bank = paymentSettings?.[bankKey];
  const links = paymentSettings?.payment_links;
  const regionLabel = currency === 'ZAR' ? 'South Africa' : currency === 'THB' ? 'Thailand' : 'International';

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      {/* Floating download button */}
      <div className="no-print" style={{ position: 'fixed', top: 20, right: 20, zIndex: 100 }}>
        <Button onClick={() => window.print()} size="lg" style={{ gap: 8, fontFamily: 'Courier New, monospace', fontWeight: 700 }}>
          <Download style={{ width: 18, height: 18 }} /> Download PDF
        </Button>
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto', fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif', color: '#111827', background: '#ffffff' }}>
        {/* Header */}
        <div style={{ background: '#0a0a0a', padding: '28px 32px', textAlign: 'center' }}>
          <img src="/logo.svg" alt="Digiiworks" style={{ width: 175, height: 'auto' }} />
          <p style={{ margin: '10px 0 0', fontSize: 10, color: '#9ca3af', letterSpacing: 4, textTransform: 'uppercase' }}>Digital Agency</p>
        </div>
        <div style={{ height: 3, background: '#0891b2' }} />

        {/* Invoice meta */}
        <div style={{ padding: '32px 32px 0', display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <p style={{ margin: '0 0 4px', fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: '#9ca3af', fontWeight: 600 }}>Invoice</p>
            <p style={{ margin: 0, fontSize: 24, fontWeight: 800, fontFamily: 'Courier New, monospace', letterSpacing: 1 }}>{invoice.invoice_number}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: '0 0 4px', fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: '#9ca3af', fontWeight: 600 }}>Due Date</p>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{dueDate}</p>
            <span style={{ display: 'inline-block', marginTop: 8, padding: '4px 12px', background: statusColor, color: '#fff', fontSize: 10, fontWeight: 700, letterSpacing: 1.5, borderRadius: 20, textTransform: 'uppercase' }}>{statusLabel}</span>
          </div>
        </div>

        {/* Billed To */}
        {client && (
          <div style={{ padding: '24px 32px 0' }}>
            <div style={{ background: '#f9fafb', borderRadius: 10, padding: '18px 20px', border: '1px solid #f3f4f6' }}>
              <p style={{ margin: '0 0 6px', fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: '#9ca3af', fontWeight: 600 }}>Billed To</p>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{client.display_name || client.email}</p>
              <p style={{ margin: '4px 0 0', fontSize: 14, color: '#6b7280' }}>{client.email}</p>
              {client.company && <p style={{ margin: '4px 0 0', fontSize: 14, color: '#6b7280' }}>{client.company}</p>}
            </div>
          </div>
        )}

        {/* Items table */}
        <div style={{ padding: '28px 32px 0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Item', 'Qty', 'Price', 'Total'].map((h, i) => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: i === 0 ? 'left' : i === 1 ? 'center' : 'right', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5, color: '#0891b2', fontWeight: 700, borderBottom: '2px solid #0891b2' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={i}>
                  <td style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6', fontSize: 14 }}>{it.description}</td>
                  <td style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6', fontSize: 14, textAlign: 'center', color: '#6b7280' }}>{it.quantity}</td>
                  <td style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6', fontSize: 14, textAlign: 'right', fontFamily: 'Courier New, monospace' }}>{sym}{Number(it.unit_price).toFixed(2)}</td>
                  <td style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6', fontSize: 14, textAlign: 'right', fontWeight: 600, fontFamily: 'Courier New, monospace' }}>{sym}{Number(it.total).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div style={{ padding: '20px 32px 0', display: 'flex', justifyContent: 'flex-end' }}>
          <table style={{ width: 240 }}>
            <tbody>
              <tr>
                <td style={{ padding: '5px 0', fontSize: 13, color: '#6b7280' }}>Subtotal</td>
                <td style={{ padding: '5px 0', fontSize: 13, textAlign: 'right', fontFamily: 'Courier New, monospace' }}>{sym}{Number(invoice.subtotal).toFixed(2)}</td>
              </tr>
              {Number(invoice.tax_rate) > 0 && (
                <tr>
                  <td style={{ padding: '5px 0', fontSize: 13, color: '#6b7280' }}>Tax ({invoice.tax_rate}%)</td>
                  <td style={{ padding: '5px 0', fontSize: 13, textAlign: 'right', fontFamily: 'Courier New, monospace' }}>{sym}{taxAmount.toFixed(2)}</td>
                </tr>
              )}
              <tr>
                <td style={{ padding: '12px 0 0', fontSize: 18, fontWeight: 800, borderTop: '2px solid #e5e7eb' }}>Total</td>
                <td style={{ padding: '12px 0 0', fontSize: 20, fontWeight: 800, color: '#0891b2', textAlign: 'right', fontFamily: 'Courier New, monospace', borderTop: '2px solid #e5e7eb' }}>{sym}{Number(invoice.total).toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div style={{ padding: '24px 32px 0' }}>
            <div style={{ padding: '14px 18px', background: '#f0f9ff', borderRadius: 8, borderLeft: '3px solid #0891b2' }}>
              <p style={{ margin: 0, fontSize: 13, color: '#374151', lineHeight: 1.5 }}>{invoice.notes}</p>
            </div>
          </div>
        )}

        {/* Banking details */}
        {bank?.bank_name && (
          <div style={{ padding: '28px 32px 0' }}>
            <div style={{ padding: '20px 24px', background: '#f0fdfa', borderRadius: 10, border: '1px solid #ccfbf1' }}>
              <p style={{ margin: '0 0 12px', fontSize: 11, textTransform: 'uppercase', letterSpacing: 2.5, color: '#0d9488', fontWeight: 700 }}>Direct Deposit — {regionLabel}</p>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {bank.bank_name && <tr><td style={{ padding: '3px 0', color: '#6b7280', fontSize: 13, width: 130 }}>Bank</td><td style={{ padding: '3px 0', color: '#111827', fontSize: 13, fontWeight: 600 }}>{bank.bank_name}</td></tr>}
                  {bank.account_name && <tr><td style={{ padding: '3px 0', color: '#6b7280', fontSize: 13 }}>Account Name</td><td style={{ padding: '3px 0', color: '#111827', fontSize: 13, fontWeight: 600 }}>{bank.account_name}</td></tr>}
                  {bank.account_number && <tr><td style={{ padding: '3px 0', color: '#6b7280', fontSize: 13 }}>Account / IBAN</td><td style={{ padding: '3px 0', color: '#111827', fontSize: 13, fontWeight: 600 }}>{bank.account_number}</td></tr>}
                  {bank.swift_code && <tr><td style={{ padding: '3px 0', color: '#6b7280', fontSize: 13 }}>SWIFT</td><td style={{ padding: '3px 0', color: '#111827', fontSize: 13, fontWeight: 600 }}>{bank.swift_code}</td></tr>}
                  {bank.routing_number && <tr><td style={{ padding: '3px 0', color: '#6b7280', fontSize: 13 }}>Routing Number</td><td style={{ padding: '3px 0', color: '#111827', fontSize: 13, fontWeight: 600 }}>{bank.routing_number}</td></tr>}
                  {bank.branch_code && <tr><td style={{ padding: '3px 0', color: '#6b7280', fontSize: 13 }}>Branch Code</td><td style={{ padding: '3px 0', color: '#111827', fontSize: 13, fontWeight: 600 }}>{bank.branch_code}</td></tr>}
                  {bank.branch && <tr><td style={{ padding: '3px 0', color: '#6b7280', fontSize: 13 }}>Branch</td><td style={{ padding: '3px 0', color: '#111827', fontSize: 13, fontWeight: 600 }}>{bank.branch}</td></tr>}
                  {bank.account_type && <tr><td style={{ padding: '3px 0', color: '#6b7280', fontSize: 13 }}>Type</td><td style={{ padding: '3px 0', color: '#111827', fontSize: 13, fontWeight: 600 }}>{bank.account_type}</td></tr>}
                </tbody>
              </table>
              {bank.reference_note && <p style={{ margin: '12px 0 0', fontSize: 12, color: '#6b7280', fontStyle: 'italic' }}>{bank.reference_note}</p>}
            </div>
          </div>
        )}

        {/* Payment links */}
        {(invoice.status === 'sent' || invoice.status === 'overdue') && (links?.yoco_payment_link || links?.wise_payment_link) && (
          <div style={{ padding: '24px 32px 0', textAlign: 'center' }}>
            {links.yoco_payment_link && currency === 'ZAR' && (
              <a href={links.yoco_payment_link + (links.yoco_payment_link.includes('?') ? '&' : '?') + 'amount=' + Number(invoice.total).toFixed(2)} style={{ display: 'inline-block', padding: '11px 28px', background: '#0a0a0a', color: '#ffffff', textDecoration: 'none', fontWeight: 700, fontSize: 13, borderRadius: 6, marginRight: 10, letterSpacing: 0.5 }}>Pay with Yoco</a>
            )}
            {links.wise_payment_link && (
              <a href={links.wise_payment_link} style={{ display: 'inline-block', padding: '11px 28px', background: '#9fe870', color: '#0a0a0a', textDecoration: 'none', fontWeight: 700, fontSize: 13, borderRadius: 6, letterSpacing: 0.5 }}>Pay with Wise</a>
            )}
            <p style={{ margin: '10px 0 0', fontSize: 11, color: '#9ca3af' }}>Don't have a Wise account? <a href="https://wise.com/invite/dic/justind507" style={{ color: '#0d9488', textDecoration: 'underline' }}>Sign up today</a> for fee-free transfers.</p>
          </div>
        )}

        {/* Footer */}
        <div style={{ padding: '40px 32px 32px', textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: 12, color: '#9ca3af' }}>© {new Date().getFullYear()} DigiiWorks. All rights reserved.</p>
          <p style={{ margin: '6px 0 0', fontSize: 11, color: '#d1d5db' }}>This invoice was generated by DigiiWorks billing.</p>
        </div>
      </div>
    </>
  );
};

export default InvoicePrint;
