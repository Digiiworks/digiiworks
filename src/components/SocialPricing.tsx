import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

const plans = [
  {
    tag: 'GET SEEN',
    name: 'Starter',
    monthly: 297,
    features: [
      '8 designed posts per month (2/week)',
      '1 social platform managed',
      'Custom-branded graphic templates',
      'Caption copywriting & hashtag strategy',
      'Content calendar & scheduling',
      'Monthly content review call (15 min)',
    ],
    cta: 'Start Growing',
    popular: false,
  },
  {
    tag: 'MOST POPULAR',
    name: 'Growth',
    monthly: 597,
    features: [
      '16 designed posts per month (4/week)',
      '2 social platforms managed',
      'Custom graphics + brand asset library',
      '2 short-form Reels or video edits/month',
      'Caption copywriting & hashtag strategy',
      'Content calendar & scheduling',
      'Monthly analytics report',
      'Bi-weekly strategy call (30 min)',
    ],
    cta: 'Accelerate Growth',
    popular: true,
  },
  {
    tag: 'FULL FORCE',
    name: 'Power',
    monthly: 997,
    features: [
      '24 designed posts per month (6/week)',
      '3 social platforms managed',
      'Premium custom graphics & branded content',
      '4 short-form Reels or video edits/month',
      'Caption copywriting & advanced hashtag strategy',
      'Content calendar & scheduling',
      'Story design & scheduling (10/month)',
      'Monthly analytics report with insights',
      'Weekly strategy call (30 min)',
      'Priority support & same-day revisions',
    ],
    cta: 'Dominate Your Market',
    popular: false,
  },
];

const ANNUAL_DISCOUNT = 0.15;

const SocialPricing = () => {
  const [annual, setAnnual] = useState(false);

  return (
    <motion.section
      className="mb-14 md:mb-20"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5 }}
    >
      <div className="mb-6 flex items-center gap-3">
        <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">// pricing</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* Toggle */}
      <div className="mb-10 flex justify-center">
        <div className="inline-flex items-center rounded-full border border-border bg-muted/20 p-1">
          <button
            onClick={() => setAnnual(false)}
            className={cn(
              'rounded-full px-5 py-2 font-mono text-xs transition-all duration-300',
              !annual
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Monthly
          </button>
          <button
            onClick={() => setAnnual(true)}
            className={cn(
              'flex items-center gap-2 rounded-full px-5 py-2 font-mono text-xs transition-all duration-300',
              annual
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Annual
            <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
              Save 15%
            </span>
          </button>
        </div>
      </div>

      {/* Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan, i) => {
          const price = annual
            ? Math.round(plan.monthly * (1 - ANNUAL_DISCOUNT))
            : plan.monthly;

          return (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className={cn(
                'glass-card relative flex flex-col p-6 transition-all duration-500',
                plan.popular && 'border-primary/50 shadow-[0_0_30px_hsl(175_100%_42%/0.15)]'
              )}
            >
              {plan.popular && (
                <div
                  className="absolute inset-x-0 top-0 h-[2px] rounded-t-lg"
                  style={{
                    background: 'hsl(175 100% 42%)',
                    boxShadow: '0 0 12px hsl(175 100% 42% / 0.5)',
                  }}
                />
              )}

              <span className={cn(
                'font-mono text-[10px] uppercase tracking-[0.2em] mb-3',
                plan.popular ? 'text-primary' : 'text-muted-foreground'
              )}>
                {plan.tag}
              </span>

              <h3 className="font-mono text-2xl font-bold text-foreground mb-2">{plan.name}</h3>

              <div className="mb-1 flex items-baseline gap-1">
                <span className={cn(
                  'font-mono text-4xl font-bold',
                  plan.popular ? 'text-primary' : 'text-foreground'
                )}>
                  ${price}
                </span>
                <span className="text-sm text-muted-foreground">/mo</span>
              </div>

              {annual && (
                <p className="mb-3 text-xs text-muted-foreground">
                  <span className="line-through">${plan.monthly}</span> billed annually
                </p>
              )}

              <p className="mb-6 text-sm text-muted-foreground leading-relaxed">
                {i === 0 && 'For businesses ready to show up consistently and build a professional social presence.'}
                {i === 1 && 'For brands ready to scale their reach with multi-platform content and video.'}
                {i === 2 && 'For businesses that want a full-service social engine driving leads and engagement daily.'}
              </p>

              {plan.popular && <div className="mb-4 h-px bg-border/60" />}

              <ul className="mb-8 flex-1 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                    <Check className={cn(
                      'mt-0.5 h-4 w-4 shrink-0',
                      plan.popular ? 'text-primary' : 'text-primary/60'
                    )} />
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                to="/contact"
                className={cn(
                  'block w-full rounded-lg py-3 text-center font-mono text-sm font-semibold transition-all duration-300',
                  plan.popular
                    ? 'bg-primary text-primary-foreground glow-primary hover:bg-primary/90'
                    : 'border border-border text-foreground hover:border-primary/50 hover:text-primary'
                )}
              >
                {plan.cta}
              </Link>
            </motion.div>
          );
        })}
      </div>
    </motion.section>
  );
};

export default SocialPricing;
