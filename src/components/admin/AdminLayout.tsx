import { Link, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LayoutDashboard, Users, FileText, Settings, LogOut, Mail, ChevronLeft, DollarSign } from 'lucide-react';

const navItems = [
  { label: 'Dashboard', to: '/admin', icon: LayoutDashboard },
  { label: 'Leads', to: '/admin/leads', icon: Mail },
  { label: 'Blog Posts', to: '/admin/posts', icon: FileText },
  { label: 'Page Content', to: '/admin/content', icon: Settings },
  { label: 'Invoices', to: '/admin/invoices', icon: DollarSign },
  { label: 'Users', to: '/admin/users', icon: Users },
];

const AdminLayout = () => {
  const { pathname } = useLocation();
  const { profile, signOut, isAdmin, isEditor, isClient } = useAuth();
  const roleLabel = isAdmin ? 'Admin' : isEditor ? 'Editor' : isClient ? 'Client' : 'User';

  // Clients only see Dashboard and Leads
  const visibleNav = isClient
    ? navItems.filter((n) => n.to === '/admin' || n.to === '/admin/leads' || n.to === '/admin/invoices')
    : navItems;

  // Redirect clients to /client dashboard instead
  const homeLink = isClient ? '/client' : '/';

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="hidden w-64 flex-shrink-0 border-r border-border/50 bg-card/50 backdrop-blur-xl md:flex md:flex-col">
        <div className="flex items-center gap-3 border-b border-border/50 px-5 py-4">
          <Link to="/">
            <img src="/logo.svg" alt="Digiiworks" style={{ width: 120 }} />
          </Link>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {visibleNav.map((item) => {
            const active = pathname === item.to || (item.to !== '/admin' && pathname.startsWith(item.to));
            return (
              <Link
                key={item.to}
                to={item.to}
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
          <div className="px-3">
            <p className="font-mono text-xs text-foreground truncate">{profile?.display_name ?? profile?.email}</p>
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{roleLabel}</p>
          </div>
          <div className="flex gap-2 px-3">
            <Link
              to={homeLink}
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
      </aside>

      {/* Mobile header */}
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border/50 bg-card/50 backdrop-blur-xl px-4 py-3 md:hidden">
          <Link to="/">
            <img src="/logo.svg" alt="Digiiworks" style={{ width: 100 }} />
          </Link>
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-muted-foreground">{roleLabel}</span>
            <button onClick={signOut} className="text-muted-foreground hover:text-destructive">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Mobile nav */}
        <nav className="flex overflow-x-auto border-b border-border/50 bg-card/30 px-2 md:hidden">
          {visibleNav.map((item) => {
            const active = pathname === item.to || (item.to !== '/admin' && pathname.startsWith(item.to));
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-1.5 whitespace-nowrap px-3 py-2.5 font-mono text-xs transition-colors ${
                  active ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'
                }`}
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
