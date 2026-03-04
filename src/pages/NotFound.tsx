import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="relative flex min-h-[70vh] items-center justify-center">
      <div className="absolute inset-0 grid-overlay opacity-10" />
      <div className="relative z-10 mx-auto max-w-md px-6 text-center">
        <div className="glass-card p-10">
          <div className="mb-6 flex items-center justify-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-neon-mint opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-neon-mint" style={{ boxShadow: '0 0 8px hsl(106 100% 55% / 0.8)' }} />
            </span>
            <span className="font-mono text-xs uppercase tracking-widest text-neon-mint">
              Route Not Found
            </span>
          </div>

          <h1 className="mb-4 font-mono text-7xl font-bold text-gradient">404</h1>

          <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
            The route you requested does not exist or has been relocated.
          </p>

          <code className="mb-8 block rounded-md bg-muted px-4 py-2 font-mono text-xs text-muted-foreground">
            {location.pathname}
          </code>

          <Link
            to="/"
            className="glow-blue inline-block rounded-lg bg-primary px-8 py-3 font-mono text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90"
          >
            Return to Base
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
