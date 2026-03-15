import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Post } from '@/lib/types';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import Breadcrumbs from '@/components/Breadcrumbs';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2 } from 'lucide-react';

const CATEGORIES = [
  'Web Development',
  'AI Automation',
  'SEO',
  'UX Design',
  'Digital Marketing',
  'Technology',
  'Performance',
  'Business',
] as const;

const PAGE_SIZE = 6;

const BlogJsonLd = () => (
  <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "Blog — Digiiworks",
    "url": "https://digiiworks.co/blog",
    "description": "Insights on web development, AI automation, and SEO from the Digiiworks team.",
    "publisher": {
      "@type": "Organization",
      "name": "Digiiworks",
      "url": "https://digiiworks.co"
    }
  }) }} />
);

const BlogSkeletons = () => (
  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
    {[1, 2, 3, 4, 5, 6].map((i) => (
      <div key={i} className="glass-card overflow-hidden">
        <Skeleton className="h-44 w-full" />
        <div className="p-5 space-y-3">
          <div className="flex gap-2">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <Skeleton className="h-6 w-4/5" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    ))}
  </div>
);

const Blog = () => {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const { data: posts, isLoading, error } = useQuery({
    queryKey: ['posts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('status', 'published')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as (Post & { tags?: string[] })[];
    },
  });

  const filteredPosts = useMemo(() => {
    if (!posts) return [];
    let result = posts;
    if (activeCategory) {
      result = result.filter(p => (p.tags || []).includes(activeCategory));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p =>
        p.title.toLowerCase().includes(q) ||
        (p.excerpt || '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [posts, activeCategory, searchQuery]);

  const visiblePosts = useMemo(
    () => filteredPosts.slice(0, visibleCount),
    [filteredPosts, visibleCount],
  );

  const hasMore = visibleCount < filteredPosts.length;

  // Reset visible count when category changes
  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [activeCategory, searchQuery]);

  // Infinite scroll observer
  const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
    const [entry] = entries;
    if (entry.isIntersecting && hasMore) {
      setVisibleCount(prev => prev + PAGE_SIZE);
    }
  }, [hasMore]);

  useEffect(() => {
    const observer = new IntersectionObserver(handleObserver, { threshold: 1.0, rootMargin: '0px' });
    if (loadMoreRef.current) observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [handleObserver]);

  return (
    <div className="relative min-h-screen">
      <BlogJsonLd />
      
      <div className="relative mx-auto max-w-6xl px-6 py-16 md:py-20">
        <Breadcrumbs items={[{ label: 'Blog' }]} />

        <div className="mb-12 text-center md:mb-16">
          <p className="font-mono text-xs uppercase tracking-widest mb-3 text-muted-foreground">// blog_feed</p>
          <h1 className="font-mono text-3xl font-bold md:text-4xl">
            <span className="text-gradient">Digital Marketing Insights & Articles</span>
          </h1>
          <p className="mt-3 text-sm text-muted-foreground max-w-xl mx-auto">
            Expert insights on web development, AI automation, SEO, and digital growth strategies.
          </p>
        </div>

        {/* Search bar */}
        <div className="relative max-w-md mx-auto mb-8">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search articles..."
            aria-label="Search articles"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-border bg-background/50 py-2.5 pl-10 pr-4 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/25 transition-colors"
          />
        </div>

        {/* Category filter chips */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          <button
            onClick={() => setActiveCategory(null)}
            className={`rounded-full px-4 py-1.5 font-mono text-xs transition-all duration-300 ${
              !activeCategory
                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            All
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat === activeCategory ? null : cat)}
              className={`rounded-full px-4 py-1.5 font-mono text-xs transition-all duration-300 ${
                activeCategory === cat
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {isLoading && <BlogSkeletons />}
        {error && (
          <p className="text-center font-mono text-sm text-destructive">Failed to load posts.</p>
        )}

        {filteredPosts.length === 0 && !isLoading && (
          <div className="glass-card p-12 text-center">
            <p className="font-mono text-muted-foreground">
              {activeCategory ? `No posts in "${activeCategory}" yet.` : 'No posts yet. Check back soon.'}
            </p>
          </div>
        )}

        {/* Blog cards grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visiblePosts.map((post, i) => (
            <Link key={post.id} to={`/blog/${post.slug}`} className="block group">
              <article
                className="glass-card overflow-hidden transition-all duration-500 hover:glow-blue h-full flex flex-col"
                style={{ animationDelay: `${(i % PAGE_SIZE) * 80}ms` }}
              >
                {/* Featured image */}
                {post.featured_image && (
                  <div className="relative h-44 overflow-hidden">
                    <img
                      src={post.featured_image}
                      alt={post.title}
                      width={800}
                      height={450}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      loading="lazy"
                      decoding="async"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                  </div>
                )}

                <div className="flex flex-1 flex-col p-5">
                  {/* Tags */}
                  {(post.tags || []).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {(post.tags as string[]).slice(0, 2).map(tag => (
                        <span key={tag} className="rounded-full bg-primary/10 px-2 py-0.5 font-mono text-[10px] text-primary">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Date */}
                  <span className="font-mono text-[11px] text-muted-foreground mb-2">
                    {format(new Date(post.created_at), 'MMM d, yyyy')}
                  </span>

                  {/* Title */}
                  <h2 className="mb-2 font-mono text-lg font-semibold text-foreground group-hover:text-primary transition-colors duration-300 line-clamp-2">
                    {post.title}
                  </h2>

                  {/* Excerpt */}
                  <p className="text-sm leading-relaxed text-muted-foreground line-clamp-3 flex-1">
                    {post.excerpt}
                  </p>

                  {/* Read more */}
                  <span className="mt-4 inline-flex items-center font-mono text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    Read article →
                  </span>
                </div>
              </article>
            </Link>
          ))}
        </div>

        {/* Infinite scroll sentinel */}
        {hasMore && (
          <div ref={loadMoreRef} className="flex justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        )}

        {!hasMore && visiblePosts.length > 0 && (
          <p className="text-center font-mono text-xs text-muted-foreground py-12">
            You've reached the end · {filteredPosts.length} article{filteredPosts.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>
    </div>
  );
};

export default Blog;
