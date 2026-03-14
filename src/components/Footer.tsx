import { Link } from 'react-router-dom';
import { NAV_LINKS, SITE_NAME } from '@/lib/constants';
import { motion } from 'framer-motion';

const ease = [0.25, 0.1, 0.25, 1] as const;

const socials = [
  { label: 'LinkedIn', href: 'https://linkedin.com/company/digiiworks' },
  { label: 'X / Twitter', href: 'https://x.com/digiiworks' },
  { label: 'GitHub', href: 'https://github.com/digiiworks' },
];

const Footer = () => (
  <footer className="relative z-10 border-t border-border/30 bg-card/40 backdrop-blur-xl">
    <div className="mx-auto max-w-6xl px-6 py-14 md:py-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, ease }}
        className="grid gap-12 md:grid-cols-3"
      >
        {/* Brand */}
        <div className="space-y-5">
          <Link to="/" className="inline-block transition-opacity hover:opacity-80">
            <img src="/logo.svg" alt={`${SITE_NAME} — Autonomous Digital Agency`} style={{ width: 130 }} />
          </Link>
          <p className="text-sm leading-relaxed text-muted-foreground max-w-xs">
            Human creativity meets autonomous execution. Three pillars powering your brand 24/7.
          </p>
        </div>

        {/* Navigation */}
        <div>
          <h4 className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary/60 mb-5">
            Navigation
          </h4>
          <ul className="space-y-3">
            {NAV_LINKS.map((link) => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Socials */}
        <div>
          <h4 className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary/60 mb-5">
            Connect
          </h4>
          <ul className="space-y-3">
            {socials.map((s) => (
              <li key={s.label}>
                <a
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {s.label} ↗
                </a>
              </li>
            ))}
          </ul>
        </div>
      </motion.div>

      {/* Bottom bar */}
      <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-border/20 pt-8 md:flex-row">
        <p className="text-xs text-muted-foreground/50">
          © {new Date().getFullYear()} {SITE_NAME}. All rights reserved.
        </p>
        <div className="flex items-center gap-6">
          <Link to="/privacy" className="text-xs text-muted-foreground/40 transition-colors hover:text-muted-foreground">
            Privacy
          </Link>
          <Link to="/terms" className="text-xs text-muted-foreground/40 transition-colors hover:text-muted-foreground">
            Terms
          </Link>
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;
