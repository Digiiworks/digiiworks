import { useState } from 'react';
import { supabase } from '@/lib/supabase';
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

const serviceOptions = [
  'Custom Dev',
  'Rent-A-Website',
  'SEO',
  'AI Automation',
];

const Contact = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    service_interest: '',
    message: '',
  });

  const isAI = form.service_interest === 'AI Automation';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.from('leads').insert([{
        ...form,
        priority: isAI,
      }]);

      if (error) throw error;

      toast({
        title: isAI ? 'Consultation Initialized' : 'Transmission Sent',
        description: 'We will be in touch soon.',
      });
      setForm({ name: '', email: '', service_interest: '', message: '' });
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
      <div className="relative mx-auto max-w-xl px-6 py-20">
        <div className="mb-12 text-center">
          <p className="font-mono-label mb-3 text-muted-foreground">// initiate_contact</p>
          <h1 className="font-mono text-4xl font-bold">
            <span className="text-gradient">Get in Touch</span>
          </h1>
        </div>

        <div className="glass-card p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name" className="font-mono-label text-muted-foreground">Name</Label>
              <Input
                id="name"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="border-border bg-background/50 font-sans focus:border-primary/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="font-mono-label text-muted-foreground">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="border-border bg-background/50 font-sans focus:border-primary/50"
              />
            </div>

            <div className="space-y-2">
              <Label className="font-mono-label text-muted-foreground">Service Interest</Label>
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
                  {serviceOptions.map((opt) => (
                    <SelectItem key={opt} value={opt} className="font-sans">
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="message" className="font-mono-label text-muted-foreground">Message</Label>
              <Textarea
                id="message"
                required
                rows={5}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                className="border-border bg-background/50 font-sans focus:border-primary/50"
              />
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
