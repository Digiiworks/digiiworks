import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { PAGE_META, SITE_URL } from '@/lib/constants';
import { getServiceBySlug } from '@/lib/service-pages';
import { updateSocialMeta } from '@/lib/seo';

const PageMeta = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // Check for dynamic service pages
    const serviceMatch = pathname.match(/^\/services\/(.+)$/);
    const servicePage = serviceMatch ? getServiceBySlug(serviceMatch[1]) : undefined;

    // Skip blog post pages — BlogPost.tsx handles its own meta
    if (pathname.startsWith('/blog/')) return;

    const meta = servicePage
      ? { title: servicePage.metaTitle, description: servicePage.metaDescription }
      : PAGE_META[pathname] || PAGE_META['/'];

    updateSocialMeta({
      title: meta.title,
      description: meta.description,
      url: `${SITE_URL}${pathname}`,
    });
  }, [pathname]);

  return null;
};

export default PageMeta;
