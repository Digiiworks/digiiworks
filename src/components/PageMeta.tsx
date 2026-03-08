import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { PAGE_META, SITE_URL } from '@/lib/constants';
import { getServiceBySlug } from '@/lib/service-pages';

const PageMeta = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // Check for dynamic service pages
    const serviceMatch = pathname.match(/^\/services\/(.+)$/);
    const servicePage = serviceMatch ? getServiceBySlug(serviceMatch[1]) : undefined;

    const meta = servicePage
      ? { title: servicePage.metaTitle, description: servicePage.metaDescription }
      : PAGE_META[pathname] || PAGE_META['/'];

    document.title = meta.title;

    const setMeta = (attr: string, key: string, value: string) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute('content', value);
    };

    setMeta('name', 'description', meta.description);
    setMeta('property', 'og:title', meta.title);
    setMeta('property', 'og:description', meta.description);
    setMeta('property', 'og:url', `${SITE_URL}${pathname}`);

    // Canonical
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', `${SITE_URL}${pathname}`);
  }, [pathname]);

  return null;
};

export default PageMeta;
