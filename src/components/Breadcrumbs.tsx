import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { SITE_URL } from '@/lib/constants';

interface Crumb {
  label: string;
  to?: string;
}

const BreadcrumbJsonLd = ({ items }: { items: Crumb[] }) => {
  const allItems = [{ label: 'Home', to: '/' }, ...items];
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: allItems.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.label,
      ...(item.to ? { item: `${SITE_URL}${item.to}` } : {}),
    })),
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
};

const Breadcrumbs = ({ items }: { items: Crumb[] }) => (
  <>
    <BreadcrumbJsonLd items={items} />
    <nav aria-label="Breadcrumb" className="mb-8">
      <ol className="flex flex-wrap items-center gap-1.5 font-mono text-xs uppercase tracking-widest text-muted-foreground">
        <li>
          <Link to="/" className="transition-colors hover:text-primary">Home</Link>
        </li>
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-1.5">
            <ChevronRight className="h-3 w-3" aria-hidden="true" />
            {item.to ? (
              <Link to={item.to} className="transition-colors hover:text-primary">{item.label}</Link>
            ) : (
              <span className="text-foreground">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  </>
);

export default Breadcrumbs;
