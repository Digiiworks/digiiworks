import { useParams, Link, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getServiceBySlug } from '@/lib/service-pages';
import SocialPricing from '@/components/SocialPricing';

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-40px' as const },
};

const ServiceDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const service = slug ? getServiceBySlug(slug) : undefined;

  if (!service) return <Navigate to="/services" replace />;

  const isAutonomous = service.pillarId === 'autonomous';
  const glowClass = 'glow-primary';
  const bgClass = 'bg-primary text-primary-foreground hover:bg-primary/90';

  return (
    <div className="relative min-h-screen">
      
      <div className="relative mx-auto max-w-4xl px-6 pt-24 pb-16 sm:pt-20 md:pb-20">
        {/* Breadcrumb */}
        <nav className="mb-8 font-mono text-xs text-muted-foreground">
          <Link to="/" className="hover:text-primary transition-colors">Home</Link>
          <span className="mx-2">/</span>
          <Link to="/services" className="hover:text-primary transition-colors">Services</Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">{service.name}</span>
        </nav>

        {/* Hero */}
        <motion.div className="mb-14 md:mb-20" {...fadeUp} transition={{ duration: 0.5 }}>
          <span className={`font-mono text-xs uppercase tracking-widest ${service.accentColor} mb-3 block`}>
            {service.pillarLabel}
          </span>
          <h1 className="mb-4 font-mono text-3xl font-bold md:text-5xl">
            <span className="text-gradient">{service.headline}</span>
          </h1>
          <p className="mb-6 text-lg text-muted-foreground md:text-xl">{service.subtitle}</p>
          <p className="text-base leading-relaxed text-muted-foreground/80">{service.heroDescription}</p>
        </motion.div>

        {/* Features */}
        <motion.section className="mb-14 md:mb-20" {...fadeUp} transition={{ duration: 0.5, delay: 0.1 }}>
          <div className="mb-6 flex items-center gap-3">
            <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">// what_you_get</span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {service.features.map((feature, i) => (
              <motion.div
                key={feature.title}
                className="glass-card relative overflow-hidden p-5 md:p-6"
                style={{ boxShadow: `0 0 20px hsl(${service.glowHsl} / 0.06)` }}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: i * 0.1 }}
              >
                <div
                  className="absolute inset-x-0 top-0 h-[2px]"
                  style={{ background: `hsl(${service.glowHsl})`, boxShadow: `0 0 8px hsl(${service.glowHsl} / 0.4)` }}
                />
                <div className="mb-2 flex items-start gap-2">
                  <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${service.accentColor}`} />
                  <h3 className="font-mono text-sm font-semibold text-foreground">{feature.title}</h3>
                </div>
                <p className="pl-6 text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Process */}
        <motion.section className="mb-14 md:mb-20" {...fadeUp} transition={{ duration: 0.5, delay: 0.2 }}>
          <div className="mb-6 flex items-center gap-3">
            <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">// our_process</span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {service.process.map((step, i) => (
              <motion.div
                key={step.step}
                className="glass-card relative p-5"
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: i * 0.1 }}
              >
                <span className={`font-mono text-2xl font-bold ${service.accentColor} opacity-30`}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className="mt-2 mb-2 font-mono text-sm font-semibold text-foreground">{step.step}</h3>
                <p className="text-xs leading-relaxed text-muted-foreground">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* CTA Section */}
        <motion.section
          className="glass-card relative overflow-hidden p-8 text-center md:p-12"
          style={{ boxShadow: `0 0 40px hsl(${service.glowHsl} / 0.1)` }}
          {...fadeUp}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div
            className="absolute inset-x-0 top-0 h-[2px]"
            style={{ background: `hsl(${service.glowHsl})`, boxShadow: `0 0 16px hsl(${service.glowHsl} / 0.5)` }}
          />
          <h2 className="mb-3 font-mono text-2xl font-bold text-foreground md:text-3xl">
            {service.ctaHeadline}
          </h2>
          <p className="mx-auto mb-8 max-w-lg text-base text-muted-foreground">
            {service.ctaDescription}
          </p>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-4">
            <Button
              asChild
              className={`${glowClass} ${bgClass} font-mono px-8 py-3`}
            >
              <Link to={`/services/${service.slug}/start`}>
                {service.ctaButtonLabel}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" asChild className="font-mono border-border hover:border-primary/50 hover:text-primary px-8 py-3">
              <Link to="/contact">Contact Us</Link>
            </Button>
          </div>
        </motion.section>

        {/* JSON-LD */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Service',
              name: service.name,
              description: service.metaDescription,
              provider: {
                '@type': 'Organization',
                name: 'Digiiworks',
                url: 'https://digiiworks.co',
              },
              url: `https://digiiworks.co/services/${service.slug}`,
            }),
          }}
        />
      </div>
    </div>
  );
};

export default ServiceDetail;
