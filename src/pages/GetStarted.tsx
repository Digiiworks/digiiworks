import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Send, CheckCircle2, Loader2, Clock, Mail, MessageSquare, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import ConstellationBg from '@/components/ConstellationBg';

const SERVICE_GROUPS = [
  {
    pillar: 'Digital Architecture',
    accent: 'border-neon-blue/40 hover:border-neon-blue',
    glowHsl: '184 100% 50%',
    services: ['Custom Web Development', 'Responsive Design', 'UX/UI Design', 'CMS Integration', 'Rent-A-Website'],
  },
  {
    pillar: 'Growth Engine',
    accent: 'border-neon-blue/40 hover:border-neon-blue',
    glowHsl: '184 100% 50%',
    services: ['Data-Driven SEO', 'Performance Optimization', 'Google & Social Media Ads', 'Market & Competitor Research'],
  },
  {
    pillar: 'Autonomous Agency',
    accent: 'border-neon-purple/40 hover:border-neon-purple',
    glowHsl: '280 99% 53%',
    services: ['AI-Powered Social Media', 'n8n Workflow Automation', 'Content Strategy'],
  },
];

const BUSINESS_TYPES = [
  { label: 'Startup', desc: 'Early-stage or pre-revenue' },
  { label: 'SMB', desc: 'Small-to-medium business' },
  { label: 'Enterprise', desc: 'Established organization' },
  { label: 'Creator / Personal', desc: 'Personal brand or creator' },
];

const BUDGETS = [
  { label: 'Under $1K', desc: 'Lean & focused' },
  { label: '$1K – $5K', desc: 'Most popular range' },
  { label: '$5K – $10K', desc: 'Premium builds' },
  { label: '$10K+', desc: 'Enterprise-grade' },
];

const TIMELINES = [
  { label: 'ASAP', desc: 'Need it yesterday' },
  { label: '1 – 3 months', desc: 'Standard timeline' },
  { label: '3 – 6 months', desc: 'No rush' },
  { label: 'Just exploring', desc: 'Gathering info' },
];

const TOTAL_STEPS = 5;

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 80 : -80, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -80 : 80, opacity: 0 }),
};

const GetStarted = () => {
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const formLoadTime = useRef(Date.now());
  const [honeypot, setHoneypot] = useState('');

  // Form state
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [businessType, setBusinessType] = useState('');
  const [budget, setBudget] = useState('');
  const [timeline, setTimeline] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [message, setMessage] = useState('');

  const toggleService = (s: string) =>
    setSelectedServices((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  const canNext = () => {
    if (step === 0) return selectedServices.length > 0;
    if (step === 1) return !!businessType;
    if (step === 2) return !!budget;
    if (step === 3) return !!timeline;
    if (step === 4) return name.trim() !== '' && email.trim() !== '';
    return false;
  };

  const goNext = () => { setDir(1); setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1)); };
  const goBack = () => { setDir(-1); setStep((s) => Math.max(s - 1, 0)); };

  const handleSubmit = async () => {
    if (!canNext()) return;
    // Anti-spam
    if (honeypot) return;
    const elapsed = Date.now() - formLoadTime.current;
    if (elapsed < 5000) {
      toast({ title: 'Please slow down', description: 'Form submitted too quickly.', variant: 'destructive' });
      return;
    }
    if (name.trim().length > 100 || email.trim().length > 255 || message.trim().length > 2000) {
      toast({ title: 'Input too long', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const isPriority = selectedServices.some((s) => s.includes('AI') || s.includes('n8n') || s.includes('Automation'));
      const { error } = await supabase.from('leads').insert({
        name: name.trim(),
        email: email.trim(),
        service_interest: selectedServices.join(', '),
        message: message.trim() || null,
        budget_range: budget,
        timeline,
        business_type: businessType,
        website_url: websiteUrl.trim() || null,
        priority: isPriority,
      });
      if (error) throw error;

      // Fire notification (non-blocking)
      supabase.functions.invoke('notify-lead', {
        body: {
          name: name.trim(),
          email: email.trim(),
          services: selectedServices.join(', '),
          businessType,
          budget,
          timeline,
          message: message.trim() || undefined,
          websiteUrl: websiteUrl.trim() || undefined,
          priority: isPriority,
        },
      }).catch((err) => console.error('Notification failed:', err));

      setSubmitted(true);
    } catch {
      toast({ title: 'Something went wrong', description: 'Please try again or use the contact form.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    const nextSteps = [
      { icon: <Mail className="h-5 w-5 text-neon-blue" />, title: 'Check your inbox', desc: `We'll send a confirmation to ${email} shortly.` },
      { icon: <Clock className="h-5 w-5 text-neon-mint" />, title: 'Response within 24 hours', desc: 'Our team reviews every submission personally — no bots.' },
      { icon: <MessageSquare className="h-5 w-5 text-neon-purple" />, title: 'Discovery call', desc: 'We\'ll schedule a quick call to discuss scope, timeline, and fit.' },
      { icon: <Sparkles className="h-5 w-5 text-neon-blue" />, title: 'Custom proposal', desc: 'You\'ll receive a tailored proposal with pricing and deliverables.' },
    ];

    return (
      <div className="relative min-h-[calc(100vh-65px)] overflow-hidden">
        <ConstellationBg />
        <div className="relative mx-auto max-w-2xl px-6 py-16 md:py-24">
          {/* Success header */}
          <motion.div className="mb-10 text-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}>
              <CheckCircle2 className="mx-auto mb-5 h-16 w-16 text-neon-mint" />
            </motion.div>
            <h1 className="mb-3 font-mono text-3xl font-bold text-foreground md:text-4xl">You're on the list.</h1>
            <p className="text-muted-foreground">Thanks, <span className="text-foreground font-medium">{name}</span>. We've received your answers and we're already on it.</p>
          </motion.div>

          {/* Estimated response */}
          <motion.div
            className="glass-card mb-10 rounded-lg border border-neon-mint/20 p-5 text-center"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-1">Estimated response time</p>
            <p className="font-mono text-2xl font-bold text-neon-mint">Under 24 hours</p>
          </motion.div>

          {/* Next steps */}
          <div className="mb-10">
            <p className="mb-4 font-mono text-xs uppercase tracking-widest text-muted-foreground">// what_happens_next</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {nextSteps.map((s, i) => (
                <motion.div
                  key={s.title}
                  className="glass-card rounded-lg border border-border p-4"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + i * 0.1 }}
                >
                  <div className="mb-2 flex items-center gap-2">
                    {s.icon}
                    <span className="font-mono text-sm font-semibold text-foreground">{s.title}</span>
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">{s.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>

          {/* CTAs */}
          <motion.div
            className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <Button asChild className="w-full sm:w-auto font-mono glow-blue bg-primary text-primary-foreground hover:bg-primary/90 px-8">
              <Link to="/services">Explore Our Services</Link>
            </Button>
            <Button variant="outline" asChild className="w-full sm:w-auto font-mono border-border hover:border-primary/50 hover:text-primary px-8">
              <Link to="/blog">Read the Blog</Link>
            </Button>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[calc(100vh-65px)] overflow-hidden">
      <ConstellationBg />
      <div className="relative mx-auto max-w-3xl px-6 py-12 md:py-20">
        {/* Header */}
        <div className="mb-8 text-center">
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">// get_started</p>
          <h1 className="font-mono text-2xl font-bold text-foreground md:text-4xl">Let's scope your project</h1>
          <p className="mt-2 text-sm text-muted-foreground">5 quick steps — takes under 2 minutes.</p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <Progress value={((step + 1) / TOTAL_STEPS) * 100} className="h-1.5 bg-muted" />
          <p className="mt-2 text-right font-mono text-xs text-muted-foreground">
            Step {step + 1} / {TOTAL_STEPS}
          </p>
        </div>

        {/* Steps */}
        <div className="relative min-h-[380px]">
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div
              key={step}
              custom={dir}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              {/* Step 0: Services */}
              {step === 0 && (
                <div className="space-y-6">
                  <h2 className="font-mono text-lg font-semibold text-foreground">What do you need help with?</h2>
                  <p className="text-sm text-muted-foreground">Select all that apply.</p>
                  {SERVICE_GROUPS.map((group) => (
                    <div key={group.pillar}>
                      <p className="mb-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">{group.pillar}</p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {group.services.map((s) => {
                          const active = selectedServices.includes(s);
                          return (
                            <button
                              key={s}
                              type="button"
                              onClick={() => toggleService(s)}
                              className={`glass-card cursor-pointer rounded-lg border px-4 py-3 text-left text-sm transition-all ${
                                active
                                  ? 'border-primary bg-primary/10 text-foreground'
                                  : `border-border text-muted-foreground ${group.accent}`
                              }`}
                            >
                              {s}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Step 1: Business Type */}
              {step === 1 && (
                <div className="space-y-4">
                  <h2 className="font-mono text-lg font-semibold text-foreground">What best describes your business?</h2>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {BUSINESS_TYPES.map((bt) => (
                      <button
                        key={bt.label}
                        type="button"
                        onClick={() => setBusinessType(bt.label)}
                        className={`glass-card cursor-pointer rounded-lg border px-5 py-4 text-left transition-all ${
                          businessType === bt.label
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <span className="block font-mono text-sm font-semibold text-foreground">{bt.label}</span>
                        <span className="text-xs text-muted-foreground">{bt.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 2: Budget */}
              {step === 2 && (
                <div className="space-y-4">
                  <h2 className="font-mono text-lg font-semibold text-foreground">What's your budget range?</h2>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {BUDGETS.map((b) => (
                      <button
                        key={b.label}
                        type="button"
                        onClick={() => setBudget(b.label)}
                        className={`glass-card cursor-pointer rounded-lg border px-5 py-4 text-left transition-all ${
                          budget === b.label
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <span className="block font-mono text-sm font-semibold text-foreground">{b.label}</span>
                        <span className="text-xs text-muted-foreground">{b.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 3: Timeline */}
              {step === 3 && (
                <div className="space-y-4">
                  <h2 className="font-mono text-lg font-semibold text-foreground">What's your timeline?</h2>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {TIMELINES.map((t) => (
                      <button
                        key={t.label}
                        type="button"
                        onClick={() => setTimeline(t.label)}
                        className={`glass-card cursor-pointer rounded-lg border px-5 py-4 text-left transition-all ${
                          timeline === t.label
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <span className="block font-mono text-sm font-semibold text-foreground">{t.label}</span>
                        <span className="text-xs text-muted-foreground">{t.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 4: Contact */}
              {step === 4 && (
                <div className="space-y-4">
                  <h2 className="font-mono text-lg font-semibold text-foreground">Almost there — how do we reach you?</h2>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block font-mono text-xs text-muted-foreground">Name *</label>
                      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
                    </div>
                    <div>
                      <label className="mb-1 block font-mono text-xs text-muted-foreground">Email *</label>
                      <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block font-mono text-xs text-muted-foreground">Current website URL (optional)</label>
                    <Input value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://yoursite.com" />
                  </div>
                  <div>
                    <label className="mb-1 block font-mono text-xs text-muted-foreground">Anything else? (optional)</label>
                    <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Tell us more about your project..." rows={3} />
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <div className="mt-8 flex items-center justify-between">
          <Button variant="ghost" onClick={goBack} disabled={step === 0} className="font-mono text-muted-foreground">
            <ArrowLeft className="mr-1 h-4 w-4" /> Back
          </Button>

          {step < TOTAL_STEPS - 1 ? (
            <Button onClick={goNext} disabled={!canNext()} className="font-mono glow-blue bg-primary text-primary-foreground hover:bg-primary/90">
              Next <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={!canNext() || submitting} className="font-mono glow-blue bg-primary text-primary-foreground hover:bg-primary/90">
              {submitting ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Send className="mr-1 h-4 w-4" />}
              Submit
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default GetStarted;
