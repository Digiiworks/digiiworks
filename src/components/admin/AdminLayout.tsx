import { useState, useEffect } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LayoutDashboard, Users, FileText, Settings, LogOut, Mail, ChevronLeft, DollarSign, UserCircle, Package, Menu, X, Wrench } from 'lucide-react';

const navItems = [
  { label: 'Dashboard', to: '/admin', icon: LayoutDashboard },
  { label: 'Leads', to: '/admin/leads', icon: Mail },
  { label: 'Clients', to: '/admin/clients', icon: UserCircle },
  { label: 'Products', to: '/admin/products', icon: Package },
  { label: 'Invoices', to: '/admin/invoices', icon: DollarSign },
  { label: 'Blog Posts', to: '/admin/posts', icon: FileText },
  { label: 'Page Content', to: '/admin/content', icon: Settings },
  { label: 'Users', to: '/admin/users', icon: Users },
];

const settingsItem = { label: 'Settings', to: '/admin/settings', icon: Wrench };

const AdminLayout = () => {
  const { pathname } = useLocation();
  const { profile, signOut, isAdmin, isEditor, isClient } = useAuth();
  const roleLabel = isAdmin ? 'Admin' : isEditor ? 'Editor' : isClient ? 'Client' : 'User';
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close menu on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const visibleNav = isClient
    ? navItems.filter((n) => n.to === '/admin' || n.to === '/admin/invoices')
    : navItems;

  const homeLink = isClient ? '/client' : '/';

  const navContent = (
    <>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {visibleNav.map((item) => {
          const active = pathname === item.to || (item.to !== '/admin' && pathname.startsWith(item.to));
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 font-mono text-sm transition-colors ${
                active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border/50 px-3 py-4 space-y-3">
        {!isClient && (() => {
          const active = pathname === settingsItem.to || pathname.startsWith(settingsItem.to);
          return (
            <Link
              to={settingsItem.to}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 font-mono text-sm transition-colors ${
                active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <settingsItem.icon className="h-4 w-4" />
              {settingsItem.label}
            </Link>
          );
        })()}
        <div className="px-3">
          <p className="font-mono text-xs text-foreground truncate">{profile?.display_name ?? profile?.email}</p>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{roleLabel}</p>
        </div>
        <div className="flex gap-2 px-3">
          <Link
            to={homeLink}
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            <ChevronLeft className="h-3 w-3" /> Site
          </Link>
          <button
            onClick={signOut}
            className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground hover:text-destructive transition-colors ml-auto"
          >
            <LogOut className="h-3 w-3" /> Sign Out
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 flex-shrink-0 border-r border-border/50 bg-card/50 backdrop-blur-xl md:flex md:flex-col">
        <div className="flex items-center gap-3 border-b border-border/50 px-5 py-4">
          <Link to="/">
            <img src="/logo.svg" alt="Digiiworks" style={{ width: 120 }} />
          </Link>
        </div>
        {navContent}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <aside
            className="absolute left-0 top-0 bottom-0 w-64 bg-card border-r border-border/50 flex flex-col animate-in slide-in-from-left duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border/50 px-5 py-4">
              <Link to="/" onClick={() => setMobileOpen(false)}>
                <img src="/logo.svg" alt="Digiiworks" style={{ width: 120 }} />
              </Link>
              <button onClick={() => setMobileOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            {navContent}
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col">
        {/* Mobile header - matches frontend navbar */}
        <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-xl md:hidden">
          <div className="flex items-center justify-between px-6 py-4">
            <Link to="/">
              <img src="/logo.svg" alt="Digiiworks" style={{ width: 175 }} />
            </Link>
            <span className="font-mono text-xs uppercase tracking-widest text-primary">{roleLabel}</span>
            <button
              className="flex flex-col gap-1.5"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
              aria-expanded={mobileOpen}
            >
              <span className={`block h-0.5 w-5 bg-foreground transition-transform duration-300 ${mobileOpen ? 'translate-y-2 rotate-45' : ''}`} />
              <span className={`block h-0.5 w-5 bg-foreground transition-opacity duration-300 ${mobileOpen ? 'opacity-0' : ''}`} />
              <span className={`block h-0.5 w-5 bg-foreground transition-transform duration-300 ${mobileOpen ? '-translate-y-2 -rotate-45' : ''}`} />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden overflow-y-auto p-3 sm:p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
