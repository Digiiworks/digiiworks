import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { NAV_LINKS } from '@/lib/constants';
import { useAuth } from '@/contexts/AuthContext';
import { LayoutDashboard, LogIn, LogOut } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const Navbar = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, isAdmin, isEditor, isClient } = useAuth();
  const showAdmin = user && (isAdmin || isEditor || isClient);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    setMobileOpen(false);
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/">
          <img src="/logo.svg" alt="Digiiworks — Autonomous Digital Agency" style={{ width: 175 }} />
        </Link>

        <div className="flex items-center gap-8">
          {/* Engine Status */}
          <div className="hidden items-center gap-2 lg:flex">
            <div className="relative flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-neon-mint opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-neon-mint" style={{ boxShadow: '0 0 8px hsl(106 100% 55% / 0.8)' }} />
              </span>
              <span className="font-mono text-xs uppercase tracking-widest text-neon-mint">Engine Active</span>
            </div>
          </div>

          {/* Desktop Nav */}
          <div className="hidden gap-6 lg:flex items-center">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                aria-current={pathname === link.to ? 'page' : undefined}
                className={`font-mono text-sm font-medium transition-all duration-300 hover:text-primary ${
                  pathname === link.to ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                {link.label}
              </Link>
            ))}

            {showAdmin ? (
              <Link
                to="/admin"
                className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 font-mono text-xs font-medium transition-all duration-300 ${
                  pathname.startsWith('/admin')
                    ? 'border-primary/50 bg-primary/10 text-primary'
                    : 'border-border/50 text-muted-foreground hover:border-primary/30 hover:text-primary'
                }`}
              >
                <LayoutDashboard className="h-3 w-3" />
                Dashboard
              </Link>
            ) : (
              <Link
                to="/auth"
                className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                <LogIn className="h-3 w-3" />
                Login
              </Link>
            )}

            {user && (
              <button
                onClick={handleLogout}
                className="ml-2 flex items-center justify-center rounded-md border border-border/50 p-1.5 text-muted-foreground transition-colors hover:border-destructive/50 hover:text-destructive"
                aria-label="Sign out"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Mobile burger */}
          <button
            className="flex flex-col gap-1.5 lg:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
          >
            <span className={`block h-0.5 w-5 bg-foreground transition-transform duration-300 ${mobileOpen ? 'translate-y-2 rotate-45' : ''}`} />
            <span className={`block h-0.5 w-5 bg-foreground transition-opacity duration-300 ${mobileOpen ? 'opacity-0' : ''}`} />
            <span className={`block h-0.5 w-5 bg-foreground transition-transform duration-300 ${mobileOpen ? '-translate-y-2 -rotate-45' : ''}`} />
          </button>
        </div>
      </div>

      {/* Mobile menu - CSS transition instead of AnimatePresence */}
      <div
        ref={menuRef}
        className={`overflow-hidden border-t border-border/50 bg-background/95 backdrop-blur-xl lg:hidden transition-all duration-200 ease-out ${
          mobileOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0 border-t-0'
        }`}
      >
        <div className="flex flex-col gap-1 px-6 py-4">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMobileOpen(false)}
              aria-current={pathname === link.to ? 'page' : undefined}
              className={`rounded-md px-3 py-2.5 font-mono text-sm font-medium transition-colors ${
                pathname === link.to
                  ? 'bg-muted text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {link.label}
            </Link>
          ))}
          {showAdmin ? (
            <Link
              to="/admin"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2 rounded-md px-3 py-2.5 font-mono text-sm font-medium text-primary bg-primary/10"
            >
              <LayoutDashboard className="h-3.5 w-3.5" /> Dashboard
            </Link>
          ) : (
            <Link
              to="/auth"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2 rounded-md px-3 py-2.5 font-mono text-sm font-medium text-muted-foreground hover:bg-muted"
            >
              <LogIn className="h-3.5 w-3.5" /> Login
            </Link>
          )}
          {user && (
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-md px-3 py-2.5 font-mono text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign Out
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;