import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

interface Crumb {
  label: string;
  to?: string;
}

const Breadcrumbs = ({ items }: { items: Crumb[] }) => (
  <nav aria-label="Breadcrumb" className="mb-8">
    <ol className="flex flex-wrap items-center gap-1.5 font-mono text-xs uppercase tracking-widest text-muted-foreground">
      <li>
        <Link to="/" className="transition-colors hover:text-primary">Home</Link>
      </li>
      {items.map((item, i) => (
        <li key={i} className="flex items-center gap-1.5">
          <ChevronRight className="h-3 w-3" />
          {item.to ? (
            <Link to={item.to} className="transition-colors hover:text-primary">{item.label}</Link>
          ) : (
            <span className="text-foreground">{item.label}</span>
          )}
        </li>
      ))}
    </ol>
  </nav>
);

export default Breadcrumbs;
