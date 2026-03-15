import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import type { Post } from '@/lib/types';
import { format } from 'date-fns';
import { ArrowLeft, ArrowRight, Clock } from 'lucide-react';
import Breadcrumbs from '@/components/Breadcrumbs';
import { Skeleton } from '@/components/ui/skeleton';
import { SERVICE_PAGES } from '@/lib/service-pages';
import { updateSocialMeta } from '@/lib/seo';
import { SITE_URL } from '@/lib/constants';

/* Map blog tags → service slugs for contextual CTAs */
const TAG_SERVICE_MAP: Record<string, string> = {
  'Web Development': 'custom-web-development',
  'AI Automation': 'n8n-workflow-automation',
  'SEO': 'data-driven-seo',
  'UX Design': 'ux-ui-design',
  'Digital Marketing': 'google-social-media-ads',
  'Technology': 'cms-integration',
  'Performance': 'performance-optimization',
  'Business': 'market-competitor-research',
};

const getServiceForPost = (tags?: string[] | null) => {
  if (!tags?.length) return SERVICE_PAGES[0];
  const slug = TAG_SERVICE_MAP[tags[0]];
  return SERVICE_PAGES.find(s => s.slug === slug) ?? SERVICE_PAGES[0];
};

const getSecondaryService = (tags?: string[] | null) => {
  const primarySlug = TAG_SERVICE_MAP[tags?.[0] ?? ''];
  if (tags && tags[1] && TAG_SERVICE_MAP[tags[1]]) {
    const s = SERVICE_PAGES.find(s => s.slug === TAG_SERVICE_MAP[tags[1]]);
    if (s && s.slug !== primarySlug) return s;
  }
  const primary = SERVICE_PAGES.find(s => s.slug === primarySlug);
  const alt = SERVICE_PAGES.find(s => s.pillarId !== primary?.pillarId);
  return alt ?? SERVICE_PAGES[SERVICE_PAGES.length - 1];
};

const injectInlineServiceLink = (html: string, tags?: string[] | null): string => {
  if (!html) return html;
  const service = getSecondaryService(tags);
  const banner = `
    <div style="margin:2.5rem 0;padding:1.25rem 1.5rem;border-left:3px solid hsl(var(--primary));border-radius:0.5rem;background:hsl(var(--muted)/0.5);">
      <p style="margin:0 0 0.25rem;font-family:monospace;font-size:0.65rem;text-transform:uppercase;letter-spacing:0.1em;color:hsl(var(--muted-foreground));">Explore our service</p>
      <a href="/services/${service.slug}" style="font-family:monospace;font-size:0.95rem;font-weight:700;color:hsl(var(--primary));text-decoration:none;">
        ${service.name} →
      </a>
      <p style="margin:0.5rem 0 0;font-size:0.85rem;color:hsl(var(--muted-foreground));line-height:1.5;">${service.subtitle}</p>
    </div>
  `;
  const paragraphs = html.split('</p>');
  if (paragraphs.length < 3) return html + banner;
  const midIdx = Math.floor(paragraphs.length / 2);
  paragraphs.splice(midIdx, 0, banner);
  return paragraphs.join('</p>');
};

/** Estimate read time from HTML content */
const getReadTime = (html?: string | null): number => {
  if (!html) return 1;
  const text = html.replace(/<[^>]*>/g, '');
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
};

const ArticleJsonLd = ({ post }: { post: Post }) => (
  <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": post.title,
    "datePublished": post.created_at,
    "url": `https://digiiworks.co/blog/${post.slug}`,
    ...(post.featured_image ? { "image": post.featured_image } : {}),
    "publisher": {
      "@type": "Organization",
      "name": "Digiiworks",
      "url": "https://digiiworks.co"
    }
  }) }} />
);

const PostSkeleton = () => (
  <div className="space-y-6">
    <div className="flex gap-3">
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-4 w-32" />
    </div>
    <Skeleton className="h-10 w-3/4" />
    <div className="glass-card p-6 md:p-10 space-y-4">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  </div>
);

/** Scroll progress bar */
const ScrollProgress = () => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const el = document.documentElement;
      const scrollTop = el.scrollTop;
      const scrollHeight = el.scrollHeight - el.clientHeight;
      setProgress(scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] h-0.5 bg-transparent">
      <div
        className="h-full bg-primary transition-[width] duration-100 ease-out"
        style={{ width: `${progress}%`, boxShadow: '0 0 8px hsl(184 100% 50% / 0.5)' }}
      />
    </div>
  );
};

const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();

  const { data: post, isLoading, error } = useQuery({
    queryKey: ['post', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('slug', slug)
        .single();
      if (error) throw error;
      return data as Post;
    },
    enabled: !!slug,
  });

  // Update social meta tags when post loads
  useEffect(() => {
    if (!post) return;
    const excerpt = post.excerpt || (post.content ? post.content.replace(/<[^>]*>/g, '').slice(0, 160) : '');
    updateSocialMeta({
      title: `${post.title} — Digiiworks`,
      description: excerpt,
      url: `${SITE_URL}/blog/${post.slug}`,
      image: post.featured_image || undefined,
      type: 'article',
    });
  }, [post]);

  const readTime = getReadTime(post?.content);

  return (
    <div className="relative min-h-screen">
      {post && <ScrollProgress />}
      {post && <ArticleJsonLd post={post} />}
      
      <div className="relative mx-auto max-w-3xl px-6 pt-24 pb-16 sm:pt-20 md:pb-20">
        <Breadcrumbs items={[
          { label: 'Blog', to: '/blog' },
          { label: post?.title ?? slug ?? '...' },
        ]} />

        <Link
          to="/blog"
          className="mb-10 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-muted-foreground transition-colors hover:text-primary"
          aria-label="Back to blog listing"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Back to Blog
        </Link>

        {isLoading && <PostSkeleton />}

        {error && (
          <div className="glass-card p-12 text-center">
            <p className="font-mono text-destructive mb-4">Post not found.</p>
            <Link to="/blog" className="font-mono text-sm text-primary hover:underline">
              Return to blog
            </Link>
          </div>
        )}

        {post && (
          <article>
            {/* Featured image */}
            {post.featured_image && (
              <img
                src={post.featured_image}
                alt={post.title}
                width={1200}
                height={480}
                loading="lazy"
                decoding="async"
                className="mb-8 w-full rounded-lg object-cover max-h-80"
              />
            )}

            <div className="mb-6 flex items-center gap-3 flex-wrap">
              <span className="font-mono text-xs text-neon-blue">
                {format(new Date(post.created_at), 'yyyy.MM.dd')}
              </span>
              <span className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground">
                <Clock className="h-3 w-3" aria-hidden="true" />
                {readTime} min read
              </span>
              <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                /{post.slug}
              </span>
            </div>

            <h1 className="mb-10 font-mono text-3xl font-bold leading-tight text-foreground md:text-4xl">
              {post.title}
            </h1>

            <div className="glass-card p-6 md:p-10">
              <div
                className="prose prose-invert max-w-none text-foreground/90 leading-relaxed font-sans text-base
                  [&_h1]:font-mono [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mt-10 [&_h1]:mb-5
                  [&_h2]:font-mono [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-10 [&_h2]:mb-5 [&_h2]:pt-4 [&_h2]:border-t [&_h2]:border-border/30
                  [&_h3]:font-mono [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-8 [&_h3]:mb-4
                  [&_h4]:font-mono [&_h4]:text-base [&_h4]:font-semibold [&_h4]:mt-6 [&_h4]:mb-3 [&_h4]:text-primary/90
                  [&_p]:mb-5 [&_p]:leading-relaxed
                  [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-5
                  [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-5
                  [&_li]:mb-2
                  [&_blockquote]:border-l-2 [&_blockquote]:border-primary/50 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-muted-foreground [&_blockquote]:my-6
                  [&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-4 [&_pre]:font-mono [&_pre]:text-xs [&_pre]:overflow-x-auto [&_pre]:my-6
                  [&_code]:font-mono [&_code]:text-xs [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded
                  [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2
                  [&_img]:rounded-lg [&_img]:max-w-full [&_img]:my-8"
                dangerouslySetInnerHTML={{ __html: injectInlineServiceLink(post.content ?? '', (post as any).tags) }}
              />
            </div>
            {/* Service CTA */}
            {(() => {
              const service = getServiceForPost((post as any).tags);
              return (
                <Link
                  to={`/services/${service.slug}`}
                  className="mt-10 block glass-card p-6 md:p-8 group hover:glow-blue transition-all duration-500"
                >
                  <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
                    // related_service
                  </p>
                  <h3 className="font-mono text-lg font-bold text-foreground group-hover:text-primary transition-colors mb-2">
                    {service.name}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    {service.subtitle}
                  </p>
                  <span className="inline-flex items-center gap-2 font-mono text-xs text-primary">
                    Learn more about this service
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                  </span>
                </Link>
              );
            })()}
          </article>
        )}
      </div>
    </div>
  );
};

export default BlogPost;
