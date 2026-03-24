import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

const plans = [
  {
    tag: 'STARTER',
    name: 'Launch',
    monthly: 49,
    setup: 199,
    zarMonthly: 910,
    subtitle: 'For new businesses going online',
    features: [
      'Up to 5 pages, custom designed',
      'Mobile responsive',
      'Hosting + SSL included',
      'On-page SEO foundation',
      'Google Analytics setup',
      'WhatsApp click-to-chat widget',
      '1 content update/month',
      'Security monitoring',
      'Blog / CMS',
      'AI chatbot',
      'Lead capture forms',
      'Social media integration',
    ],
    featureHeader: 'DELIVERABLES',
    cta: 'Explore this tier',
    popular: false,
  },
  {
    tag: 'MOST POPULAR',
    name: 'Grow',
    monthly: 99,
    setup: 299,
    zarMonthly: 1840,
    subtitle: 'For businesses ready to generate leads',
    features: [
      'Up to 10 pages',
      'Blog / CMS (up to 2 posts/mo)',
      'Lead capture forms + CRM connect',
      '3 content updates/month',
      'Google Search Console setup',
      'Monthly SEO report',
      'Social media link integration',
      'Basic schema markup',
      'AI chatbot (basic FAQ bot)',
      'E-commerce',
      'Advanced automation',
    ],
    featureHeader: 'EVERYTHING IN LAUNCH, PLUS:',
    cta: 'Explore this tier',
    popular: true,
  },
  {
    tag: 'PRO',
    name: 'Dominate',
    monthly: 199,
    setup: 499,
    zarMonthly: 3700,
    subtitle: 'For businesses that want full digital presence',
    features: [
      'Unlimited pages',
      '4 blog posts/month (AI-assisted)',
      'Unlimited content updates',
      'Advanced AI chatbot (trained on biz)',
      'n8n workflow automations',
      'E-commerce ready (up to 50 products)',
      'Monthly strategy call (30 min)',
      'Priority support (24hr response)',
      'Free redesign every 24 months',
      'Heatmap + conversion tracking',
    ],
    featureHeader: 'EVERYTHING IN GROW, PLUS:',
    cta: 'Explore this tier',
    popular: false,
  },
];

const ANNUAL_DISCOUNT = 0.15;

const WebsitePricing = () => {
  const [annual, setAnnual] = useState(false);
  const navigate = useNavigate();

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
          const zarPrice = annual
            ? Math.round(plan.zarMonthly * (1 - ANNUAL_DISCOUNT))
            : plan.zarMonthly;

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
                    background: 'hsl(var(--primary))',
                    boxShadow: '0 0 12px hsl(var(--primary) / 0.5)',
                  }}
                />
              )}

              <span className={cn(
                'inline-block w-fit rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] mb-4',
                plan.popular
                  ? 'border-primary/50 text-primary bg-primary/10'
                  : 'border-border text-muted-foreground'
              )}>
                {plan.tag}
              </span>

              <h3 className="font-mono text-2xl font-bold text-foreground">{plan.name}</h3>
              <p className="mb-4 text-sm text-muted-foreground">{plan.subtitle}</p>

              <div className="mb-1 flex items-baseline gap-1">
                <span className={cn(
                  'font-mono text-4xl font-bold',
                  plan.popular ? 'text-primary' : 'text-foreground'
                )}>
                  ${price}
                </span>
                <span className="text-sm text-muted-foreground">/mo</span>
              </div>

              <p className="text-xs text-muted-foreground mb-1">
                ≈ ZAR {zarPrice.toLocaleString()}/mo
              </p>

              {annual && (
                <p className="text-xs text-muted-foreground mb-2">
                  <span className="line-through">${plan.monthly}/mo</span> billed annually
                </p>
              )}

              <span className="inline-block w-fit rounded-md border border-border bg-muted/30 px-2.5 py-1 text-xs text-muted-foreground mb-6">
                Setup: ${plan.setup} once-off
              </span>

              <div className="mb-4 h-px bg-border/60" />

              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-4">
                {plan.featureHeader}
              </p>

              <ul className="mb-8 flex-1 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                    <span className={cn(
                      'mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full',
                      plan.popular ? 'bg-primary' : 'bg-primary/60'
                    )} />
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => navigate(`/services/rent-a-website/start?package=${plan.name.toLowerCase()}`)}
                className={cn(
                  'block w-full rounded-lg py-3 text-center font-mono text-sm font-semibold transition-all duration-300',
                  plan.popular
                    ? 'bg-primary text-primary-foreground glow-primary hover:bg-primary/90'
                    : 'border border-border text-foreground hover:border-primary/50 hover:text-primary'
                )}
              >
                {plan.cta} ↗
              </button>
            </motion.div>
          );
        })}
      </div>
    </motion.section>
  );
};

export default WebsitePricing;
