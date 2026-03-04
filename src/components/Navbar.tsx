import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { NAV_LINKS } from '@/lib/constants';
import logo from '@/assets/logo.svg';

const Navbar = () => {
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/">
          <img src={logo} alt="Digiiworks" style={{ width: 175 }} />
        </Link>

        <div className="flex items-center gap-8">
          {/* Engine Status */}
          <div className="hidden items-center gap-2 md:flex">
            <div className="relative flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-neon-mint opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-neon-mint" style={{ boxShadow: '0 0 8px hsl(106 100% 55% / 0.8)' }} />
              </span>
              <span className="font-mono text-xs uppercase tracking-widest text-neon-mint">Engine Active</span>
            </div>
          </div>

          {/* Desktop Nav */}
          <div className="hidden gap-6 md:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`font-mono text-sm font-medium transition-all duration-300 hover:text-primary ${
                  pathname === link.to ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Mobile burger */}
          <button
            className="flex flex-col gap-1.5 md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            <span className={`block h-0.5 w-5 bg-foreground transition-transform duration-300 ${mobileOpen ? 'translate-y-2 rotate-45' : ''}`} />
            <span className={`block h-0.5 w-5 bg-foreground transition-opacity duration-300 ${mobileOpen ? 'opacity-0' : ''}`} />
            <span className={`block h-0.5 w-5 bg-foreground transition-transform duration-300 ${mobileOpen ? '-translate-y-2 -rotate-45' : ''}`} />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-border/50 bg-background/95 backdrop-blur-xl md:hidden">
          <div className="flex flex-col gap-1 px-6 py-4">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className={`rounded-md px-3 py-2.5 font-mono text-sm font-medium transition-colors ${
                  pathname === link.to
                    ? 'bg-muted text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
