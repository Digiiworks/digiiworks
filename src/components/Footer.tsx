import { Link } from 'react-router-dom';
import { NAV_LINKS, SITE_NAME } from '@/lib/constants';

const socials = [
  { label: 'LinkedIn', href: 'https://linkedin.com/company/digiiworks' },
  { label: 'X / Twitter', href: 'https://x.com/digiiworks' },
  { label: 'GitHub', href: 'https://github.com/digiiworks' },
];

const Footer = () => (
  <footer className="border-t border-border/40 bg-card/50">
    <div className="mx-auto max-w-6xl px-6 py-12 md:py-16">
      <div className="grid gap-10 md:grid-cols-3">
        {/* Brand */}
        <div className="space-y-4">
          <Link to="/">
            <img src="/logo.svg" alt={`${SITE_NAME} — Autonomous Digital Agency`} style={{ width: 140 }} />
          </Link>
          <p className="text-sm leading-relaxed text-muted-foreground max-w-xs">
            Human Creativity. Autonomous Execution. Three pillars powering your brand 24/7.
          </p>
        </div>

        {/* Navigation */}
        <div>
          <h4 className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-4">
            Navigation
          </h4>
          <ul className="space-y-2.5">
            {NAV_LINKS.map((link) => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  className="text-sm text-foreground/60 transition-colors hover:text-primary"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Socials */}
        <div>
          <h4 className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-4">
            Connect
          </h4>
          <ul className="space-y-2.5">
            {socials.map((s) => (
              <li key={s.label}>
                <a
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-foreground/60 transition-colors hover:text-primary"
                >
                  {s.label} ↗
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-border/30 pt-6 md:flex-row">
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} {SITE_NAME}. All rights reserved.
        </p>
        <div className="flex items-center gap-4">
          <Link to="/privacy" className="text-xs text-muted-foreground/50 transition-colors hover:text-muted-foreground">
            Privacy Policy
          </Link>
          <Link to="/terms" className="text-xs text-muted-foreground/50 transition-colors hover:text-muted-foreground">
            Terms of Service
          </Link>
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;
