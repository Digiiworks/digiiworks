import { Link } from 'react-router-dom';
import { NAV_LINKS, SITE_NAME } from '@/lib/constants';

const socials = [
  { label: 'LinkedIn', href: 'https://linkedin.com/company/digiiworks' },
  { label: 'X / Twitter', href: 'https://x.com/digiiworks' },
  { label: 'GitHub', href: 'https://github.com/digiiworks' },
];

const Footer = () => (
  <footer className="relative border-t border-border/50 bg-background/80 backdrop-blur-xl">
    <div className="mx-auto max-w-6xl px-6 py-12 md:py-16">
      <div className="grid gap-10 md:grid-cols-3">
        {/* Brand + Engine */}
        <div className="space-y-5">
          <Link to="/">
            <img src="/logo.svg" alt={`${SITE_NAME} — Autonomous Digital Agency`} style={{ width: 140 }} />
          </Link>
          <p className="text-sm leading-relaxed text-muted-foreground max-w-xs">
            Human Creativity. Autonomous Execution. Three pillars powering your brand 24/7.
          </p>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-neon-mint opacity-75" />
              <span
                className="relative inline-flex h-2 w-2 rounded-full bg-neon-mint"
                style={{ boxShadow: '0 0 6px hsl(106 100% 55% / 0.8)' }}
              />
            </span>
            <span className="font-mono text-xs uppercase tracking-widest text-neon-mint">
              All Systems Operational
            </span>
          </div>
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
                  className="font-mono text-sm text-foreground/70 transition-colors hover:text-primary"
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
                  className="font-mono text-sm text-foreground/70 transition-colors hover:text-primary"
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
        <p className="font-mono text-xs text-muted-foreground">
          © {new Date().getFullYear()} {SITE_NAME}. All rights reserved.
        </p>
        <div className="flex items-center gap-4">
          <Link to="/privacy" className="font-mono text-xs text-muted-foreground/50 transition-colors hover:text-muted-foreground">
            Privacy Policy
          </Link>
          <Link to="/terms" className="font-mono text-xs text-muted-foreground/50 transition-colors hover:text-muted-foreground">
            Terms of Service
          </Link>
        </div>
        <p className="font-mono text-xs text-muted-foreground/50">
          Powered by Vantage, Pixel, Dex & Forge
        </p>
      </div>
    </div>
  </footer>
);

export default Footer;
