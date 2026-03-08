import { SITE_NAME, SITE_URL } from '@/lib/constants';

const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`;

/** Set or create a <meta> tag by attribute selector */
export const setMeta = (attr: string, key: string, value: string) => {
  let el = document.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', value);
};

/** Set or create a <link> tag */
export const setLink = (rel: string, href: string) => {
  let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
};

export interface SocialMeta {
  title: string;
  description: string;
  url: string;
  image?: string;
  type?: 'website' | 'article';
}

/** Update all OG + Twitter + standard meta tags at once */
export const updateSocialMeta = ({
  title,
  description,
  url,
  image = DEFAULT_OG_IMAGE,
  type = 'website',
}: SocialMeta) => {
  document.title = title;

  // Standard
  setMeta('name', 'description', description);

  // Open Graph
  setMeta('property', 'og:type', type);
  setMeta('property', 'og:title', title);
  setMeta('property', 'og:description', description);
  setMeta('property', 'og:url', url);
  setMeta('property', 'og:image', image);
  setMeta('property', 'og:image:width', '1200');
  setMeta('property', 'og:image:height', '630');
  setMeta('property', 'og:site_name', SITE_NAME);

  // Twitter / X
  setMeta('name', 'twitter:card', 'summary_large_image');
  setMeta('name', 'twitter:title', title);
  setMeta('name', 'twitter:description', description);
  setMeta('name', 'twitter:image', image);

  // Canonical
  setLink('canonical', url);
};
