import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Fetches Google GA4 and Meta pixel IDs from admin settings
 * and injects the tracking scripts into <head> at runtime.
 */
const TrackingPixels = () => {
  const [injected, setInjected] = useState(false);

  useEffect(() => {
    if (injected) return;

    const load = async () => {
      try {
        const { data } = await supabase
          .from('page_content')
          .select('content')
          .eq('page_key', 'payment_settings')
          .maybeSingle();

        const content = data?.content as Record<string, any> | null;
        const gaId = content?.tracking?.google_pixel_id as string | undefined;
        const metaId = content?.tracking?.meta_pixel_id as string | undefined;

        if (gaId) injectGA4(gaId);
        if (metaId) injectMetaPixel(metaId);

        setInjected(true);
      } catch {
        // silent – tracking is non-critical
      }
    };

    load();
  }, [injected]);

  return null;
};

function injectGA4(id: string) {
  if (document.querySelector(`script[src*="googletagmanager.com/gtag/js?id=${id}"]`)) return;

  // gtag.js loader
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
  document.head.appendChild(script);

  // inline config
  const inline = document.createElement('script');
  inline.textContent = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${id}');
  `;
  document.head.appendChild(inline);
}

function injectMetaPixel(id: string) {
  if (document.querySelector(`script[data-meta-pixel="${id}"]`)) return;

  const inline = document.createElement('script');
  inline.setAttribute('data-meta-pixel', id);
  inline.textContent = `
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', '${id}');
    fbq('track', 'PageView');
  `;
  document.head.appendChild(inline);

  // noscript fallback in body
  const ns = document.createElement('noscript');
  const img = document.createElement('img');
  img.height = 1;
  img.width = 1;
  img.style.display = 'none';
  img.src = `https://www.facebook.com/tr?id=${id}&ev=PageView&noscript=1`;
  ns.appendChild(img);
  document.body.appendChild(ns);
}

export default TrackingPixels;
