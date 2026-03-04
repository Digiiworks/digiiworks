import { Link, useLocation } from 'react-router-dom';

const links = [
  { to: '/', label: 'Home' },
  { to: '/services', label: 'Services' },
  { to: '/ai', label: 'AI & Automation' },
  { to: '/blog', label: 'Blog' },
  { to: '/contact', label: 'Contact' },
];

const Navbar = () => {
  const { pathname } = useLocation();

  return (
    <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" className="font-mono text-xl font-bold text-foreground tracking-tight">
          <span className="text-gradient">digii</span>works
        </Link>

        <div className="flex items-center gap-8">
          {/* Engine Status */}
          <div className="hidden items-center gap-2 md:flex">
            <div className="relative flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-neon-mint opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-neon-mint" style={{ boxShadow: '0 0 8px hsl(106 100% 55% / 0.8)' }} />
              </span>
              <span className="font-mono-label text-neon-mint">Engine Active</span>
            </div>
          </div>

          {/* Nav Links */}
          <div className="flex gap-6">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`font-mono text-sm font-medium transition-all duration-300 hover:text-primary ${
                  pathname === link.to
                    ? 'text-primary'
                    : 'text-muted-foreground'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
