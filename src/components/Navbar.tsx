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
  const [scrolled, setScrolled] = useState(false);
  const { user, isAdmin, isEditor, isClient } = useAuth();
  const showAdmin = user && (isAdmin || isEditor || isClient);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleLogout = async () => {
    setMobileOpen(false);
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
      scrolled
        ? 'bg-background/70 backdrop-blur-2xl border-b border-border/30 shadow-lg shadow-background/20'
        : 'bg-transparent'
    }`}>
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" className="transition-opacity hover:opacity-80">
          <img src="/logo.svg" alt="Digiiworks — Autonomous Digital Agency" style={{ width: 150 }} />
        </Link>

        <div className="flex items-center gap-6">
          {/* Desktop Nav */}
          <div className="hidden gap-7 lg:flex items-center">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                aria-current={pathname === link.to ? 'page' : undefined}
                className={`text-[13px] font-medium transition-colors duration-300 hover:text-primary ${
                  pathname === link.to ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                {link.label}
              </Link>
            ))}

            {showAdmin ? (
              <Link
                to="/admin"
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all duration-300 ${
                  pathname.startsWith('/admin')
                    ? 'border-primary/40 bg-primary/10 text-primary'
                    : 'border-border/40 text-muted-foreground hover:border-primary/30 hover:text-primary'
                }`}
              >
                <LayoutDashboard className="h-3 w-3" />
                Dashboard
              </Link>
            ) : (
              <Link
                to="/auth"
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                <LogIn className="h-3 w-3" />
                Login
              </Link>
            )}

            {user && (
              <button
                onClick={handleLogout}
                className="flex items-center justify-center rounded-lg border border-border/40 p-1.5 text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
                aria-label="Sign out"
                title="Sign out"
              >
                <LogOut className="h-3.5 w-3.5" />
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

      {/* Mobile menu */}
      <div
        ref={menuRef}
        className={`overflow-hidden border-t border-border/30 bg-background/95 backdrop-blur-2xl lg:hidden transition-all duration-300 ease-out ${
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
              className={`rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                pathname === link.to
                  ? 'bg-primary/10 text-primary'
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
              className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-primary bg-primary/10"
            >
              <LayoutDashboard className="h-3.5 w-3.5" /> Dashboard
            </Link>
          ) : (
            <Link
              to="/auth"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted"
            >
              <LogIn className="h-3.5 w-3.5" /> Login
            </Link>
          )}
          {user && (
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
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
