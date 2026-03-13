import { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { SERVICE_OPTIONS } from '@/lib/constants';
import Breadcrumbs from '@/components/Breadcrumbs';
import { z } from 'zod';

const contactSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name too long'),
  email: z.string().trim().email('Invalid email').max(255, 'Email too long'),
  service_interest: z.string().optional(),
  message: z.string().trim().min(1, 'Message is required').max(2000, 'Message too long'),
});

const Contact = () => {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    service_interest: '',
    message: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Anti-spam: honeypot + timing
  const [honeypot, setHoneypot] = useState('');
  const formLoadTime = useRef(Date.now());

  useEffect(() => {
    const preset = searchParams.get('service');
    if (preset && SERVICE_OPTIONS.includes(preset as typeof SERVICE_OPTIONS[number])) {
      setForm((f) => ({ ...f, service_interest: preset }));
    }
  }, [searchParams]);

  const isAI = ['AI-Powered Social Media', 'n8n Workflow Automation', 'Content Strategy'].includes(form.service_interest);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Anti-spam checks
    if (honeypot) return; // Bot filled hidden field
    const elapsed = Date.now() - formLoadTime.current;
    if (elapsed < 3000) {
      toast({ title: 'Please slow down', description: 'Form submitted too quickly.', variant: 'destructive' });
      return;
    }

    // Validate
    const result = contactSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach(i => { fieldErrors[String(i.path[0])] = i.message; });
      setErrors(fieldErrors);
      return;
    }
    setErrors({});

    setLoading(true);
    try {
      const { error } = await supabase.from('leads').insert([{
        name: result.data.name,
        email: result.data.email,
        service_interest: result.data.service_interest || null,
        message: result.data.message,
        priority: isAI,
      }]);
      if (error) throw error;
      toast({ title: isAI ? 'Consultation Initialized' : 'Transmission Sent', description: 'We will be in touch soon.' });
      setForm({ name: '', email: '', service_interest: '', message: '' });
      formLoadTime.current = Date.now();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Connection failed. Please try again.';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen">
      <div className="absolute inset-0 grid-overlay opacity-20" />
      <div className="relative mx-auto max-w-xl px-6 py-16 md:py-20">
        <Breadcrumbs items={[{ label: 'Contact' }]} />

        <div className="mb-10 text-center md:mb-12">
          <p className="font-mono text-xs uppercase tracking-widest mb-3 text-muted-foreground">// quick_message</p>
          <h1 className="font-mono text-3xl font-bold md:text-4xl">
            <span className="text-gradient">Send a Quick Message</span>
          </h1>
          <p className="mt-3 text-sm text-muted-foreground max-w-md mx-auto">
            Have a question or want to say hi? Drop us a line below. For full project scoping,{' '}
            <Link to="/get-started" className="text-primary hover:underline underline-offset-2">use our project wizard →</Link>
          </p>
        </div>

        <div className="glass-card p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-5 md:space-y-6">
            {/* Honeypot — hidden from users, bots fill it */}
            <div className="absolute opacity-0 h-0 overflow-hidden" aria-hidden="true" tabIndex={-1}>
              <label htmlFor="website_url_hp">Website</label>
              <input
                id="website_url_hp"
                name="website_url_hp"
                type="text"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                autoComplete="off"
                tabIndex={-1}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name" className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Name</Label>
              <Input
                id="name"
                required
                maxLength={100}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="border-border bg-background/50 font-sans focus:border-primary/50"
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Email</Label>
              <Input
                id="email"
                type="email"
                required
                maxLength={255}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="border-border bg-background/50 font-sans focus:border-primary/50"
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>

            <div className="space-y-2">
              <Label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Service Interest</Label>
              <Select
                value={form.service_interest}
                onValueChange={(val) => setForm({ ...form, service_interest: val })}
              >
                <SelectTrigger className={`border-border bg-background/50 font-sans transition-all duration-300 ${
                  isAI ? 'border-neon-purple/50 glow-purple' : 'focus:border-primary/50'
                }`}>
                  <SelectValue placeholder="Select a service" />
                </SelectTrigger>
                <SelectContent className="border-border bg-card">
                  {SERVICE_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt} className="font-sans">
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="message" className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Message</Label>
              <Textarea
                id="message"
                required
                rows={5}
                maxLength={2000}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                className="border-border bg-background/50 font-sans focus:border-primary/50"
              />
              {errors.message && <p className="text-xs text-destructive">{errors.message}</p>}
            </div>

            <Button
              type="submit"
              className={`w-full font-mono transition-all duration-300 ${
                isAI
                  ? 'glow-purple bg-secondary text-secondary-foreground hover:bg-secondary/90'
                  : 'glow-blue bg-primary text-primary-foreground hover:bg-primary/90'
              }`}
              disabled={loading}
            >
              {loading
                ? 'Processing...'
                : isAI
                  ? 'Initialize Consultation'
                  : 'Send Transmission'
              }
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Contact;
