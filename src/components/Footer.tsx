import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { NAV_LINKS, SITE_NAME } from '@/lib/constants';
import { motion } from 'framer-motion';
import { Instagram, Facebook, Linkedin, Github, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const ease = [0.25, 0.1, 0.25, 1] as const;

interface SocialLink {
  key: string;
  label: string;
  url: string;
  icon: React.ReactNode;
}

const SOCIAL_CONFIG = [
  { key: 'instagram', label: 'Instagram', icon: <Instagram className="h-4 w-4" /> },
  { key: 'facebook', label: 'Facebook', icon: <Facebook className="h-4 w-4" /> },
  { key: 'linkedin', label: 'LinkedIn', icon: <Linkedin className="h-4 w-4" /> },
  { key: 'github', label: 'GitHub', icon: <Github className="h-4 w-4" /> },
];

const Footer = () => {
  const [socials, setSocials] = useState<SocialLink[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data: row } = await supabase
        .from('page_content')
        .select('content')
        .eq('page_key', 'payment_settings')
        .single();
      if (row?.content && typeof row.content === 'object') {
        const s = (row.content as any).socials;
        if (s) {
          const active = SOCIAL_CONFIG
            .filter((c) => s[c.key] && String(s[c.key]).trim().length > 0)
            .map((c) => ({ ...c, url: s[c.key] }));
          setSocials(active);
        }
      }
    };
    load();
  }, []);

  return (
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
            <div className="flex flex-col sm:flex-row items-start gap-3 pt-1">
              <Link
                to="/contact"
                className="inline-flex items-center rounded-lg border border-border/50 px-5 py-2 font-mono text-xs text-muted-foreground transition-all hover:text-foreground hover:border-primary/30"
              >
                Contact Us
              </Link>
              <a
                href="mailto:hello@digiiworks.co"
                className="font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                hello@digiiworks.co
              </a>
            </div>
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

          {/* Socials — only render if there's at least one URL */}
          {socials.length > 0 && (
            <div>
              <h4 className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary/60 mb-5">
                Connect
              </h4>
              <ul className="space-y-3">
                {socials.map((s) => (
                  <li key={s.key}>
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground group"
                    >
                      <span className="text-primary">{s.icon}</span>
                      {s.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
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
};

export default Footer;
