import { useState, useRef } from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Send, CheckCircle2, Loader2, Clock, Mail, MessageSquare, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getServiceOnboarding } from '@/lib/service-onboarding';

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 80 : -80, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -80 : 80, opacity: 0 }),
};

const ServiceOnboarding = () => {
  const { slug } = useParams<{ slug: string }>();
  const config = slug ? getServiceOnboarding(slug) : undefined;

  if (!config) return <Navigate to="/services" replace />;

  return <OnboardingForm config={typeof config === 'object' ? config : config} />;
};

function OnboardingForm({ config }: { config: NonNullable<ReturnType<typeof getServiceOnboarding>> }) {
  const { toast } = useToast();
  const TOTAL_STEPS = config.steps.length + 1; // +1 for contact step
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const formLoadTime = useRef(Date.now());
  const [honeypot, setHoneypot] = useState('');

  // Quiz answers
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});

  // Contact fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [message, setMessage] = useState('');

  const currentQuizStep = step < config.steps.length ? config.steps[step] : null;

  const selectSingle = (key: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  };

  const toggleMulti = (key: string, value: string) => {
    setAnswers((prev) => {
      const current = (prev[key] as string[]) || [];
      return {
        ...prev,
        [key]: current.includes(value) ? current.filter((v) => v !== value) : [...current, value],
      };
    });
  };

  const canNext = () => {
    if (currentQuizStep) {
      const answer = answers[currentQuizStep.key];
      if (currentQuizStep.type === 'single') return !!answer;
      if (currentQuizStep.type === 'multi') return Array.isArray(answer) && answer.length > 0;
      return false;
    }
    // Contact step
    return name.trim() !== '' && email.trim() !== '';
  };

  const goNext = () => { setDir(1); setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1)); };
  const goBack = () => { setDir(-1); setStep((s) => Math.max(s - 1, 0)); };

  const handleSubmit = async () => {
    if (!canNext()) return;
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
      // Build structured message from quiz answers
      const quizSummary = config.steps.map((s) => {
        const a = answers[s.key];
        const val = Array.isArray(a) ? a.join(', ') : a || '—';
        return `${s.question}\n→ ${val}`;
      }).join('\n\n');

      const fullMessage = [
        `[${config.serviceName} Onboarding]`,
        '',
        quizSummary,
        '',
        message.trim() ? `Additional notes:\n${message.trim()}` : '',
      ].filter(Boolean).join('\n');

      const { error } = await supabase.from('leads').insert({
        name: name.trim(),
        email: email.trim(),
        service_interest: config.serviceName,
        message: fullMessage,
        budget_range: (answers['budget'] as string) || null,
        timeline: (answers['timeline'] as string) || null,
        website_url: websiteUrl.trim() || null,
        priority: false,
      });
      if (error) throw error;

      // Fire notification (non-blocking)
      supabase.functions.invoke('notify-lead', {
        body: {
          name: name.trim(),
          email: email.trim(),
          services: config.serviceName,
          budget: (answers['budget'] as string) || undefined,
          timeline: (answers['timeline'] as string) || undefined,
          message: fullMessage,
          websiteUrl: websiteUrl.trim() || undefined,
          priority: false,
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
      { icon: <MessageSquare className="h-5 w-5 text-neon-purple" />, title: 'Discovery call', desc: "We'll schedule a quick call to discuss scope, timeline, and fit." },
      { icon: <Sparkles className="h-5 w-5 text-neon-blue" />, title: 'Custom proposal', desc: "You'll receive a tailored proposal with pricing and deliverables." },
    ];

    return (
      <div className="relative min-h-[calc(100vh-65px)] overflow-hidden">
        <div className="relative mx-auto max-w-2xl px-6 pt-24 pb-12 sm:pt-20 md:pb-20">
          <motion.div className="mb-10 text-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}>
              <CheckCircle2 className="mx-auto mb-5 h-16 w-16 text-neon-mint" />
            </motion.div>
            <h1 className="mb-3 font-mono text-3xl font-bold text-foreground md:text-4xl">You're on the list.</h1>
            <p className="text-muted-foreground">Thanks, <span className="text-foreground font-medium">{name}</span>. We've received your {config.serviceName.toLowerCase()} requirements and we're already on it.</p>
          </motion.div>

          <motion.div
            className="glass-card mb-10 rounded-lg border border-neon-mint/20 p-5 text-center"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-1">Estimated response time</p>
            <p className="font-mono text-2xl font-bold text-neon-mint">Under 24 hours</p>
          </motion.div>

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
      <div className="relative mx-auto max-w-3xl px-6 pt-24 pb-12 sm:pt-20 md:pb-20">
        {/* Header */}
        <div className="mb-8 text-center">
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">{config.headerLabel}</p>
          <h1 className="font-mono text-2xl font-bold text-foreground md:text-4xl">{config.headline}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{config.subtitle}</p>
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
              {/* Quiz steps */}
              {currentQuizStep && (
                <div className="space-y-4">
                  <h2 className="font-mono text-lg font-semibold text-foreground">{currentQuizStep.question}</h2>
                  {currentQuizStep.subtitle && (
                    <p className="text-sm text-muted-foreground">{currentQuizStep.subtitle}</p>
                  )}
                  <div className={`grid gap-2 ${currentQuizStep.options.length > 4 ? 'sm:grid-cols-2' : 'sm:grid-cols-2'}`}>
                    {currentQuizStep.options.map((opt) => {
                      const isMulti = currentQuizStep.type === 'multi';
                      const active = isMulti
                        ? ((answers[currentQuizStep.key] as string[]) || []).includes(opt.label)
                        : answers[currentQuizStep.key] === opt.label;

                      return (
                        <button
                          key={opt.label}
                          type="button"
                          onClick={() =>
                            isMulti
                              ? toggleMulti(currentQuizStep.key, opt.label)
                              : selectSingle(currentQuizStep.key, opt.label)
                          }
                          className={`glass-card cursor-pointer rounded-lg border px-5 py-4 text-left transition-all ${
                            active
                              ? 'border-primary bg-primary/10'
                              : 'border-border hover:border-primary/50'
                          }`}
                        >
                          <span className="block font-mono text-sm font-semibold text-foreground">{opt.label}</span>
                          {opt.desc && <span className="text-xs text-muted-foreground">{opt.desc}</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Contact step (last) */}
              {!currentQuizStep && (
                <div className="space-y-4">
                  <h2 className="font-mono text-lg font-semibold text-foreground">Almost there — how do we reach you?</h2>
                  {/* Honeypot */}
                  <div className="absolute opacity-0 h-0 overflow-hidden" aria-hidden="true" tabIndex={-1}>
                    <input name="fax_number" type="text" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} autoComplete="off" tabIndex={-1} />
                  </div>
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
}

export default ServiceOnboarding;
