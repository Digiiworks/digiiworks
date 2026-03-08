import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Post } from '@/lib/types';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import Breadcrumbs from '@/components/Breadcrumbs';
import { Skeleton } from '@/components/ui/skeleton';

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
  <div className="space-y-6">
    {[1, 2, 3].map((i) => (
      <div key={i} className="glass-card p-6 space-y-3">
        <div className="flex gap-3">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    ))}
  </div>
);

const Blog = () => {
  const [activeTag, setActiveTag] = useState<string | null>(null);

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

  const allTags = useMemo(() => {
    if (!posts) return [];
    const tagSet = new Set<string>();
    posts.forEach(p => (p.tags || []).forEach(t => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }, [posts]);

  const filteredPosts = useMemo(() => {
    if (!posts) return [];
    if (!activeTag) return posts;
    return posts.filter(p => (p.tags || []).includes(activeTag));
  }, [posts, activeTag]);

  return (
    <div className="relative min-h-screen">
      <BlogJsonLd />
      <div className="absolute inset-0 grid-overlay opacity-20" />
      <div className="relative mx-auto max-w-3xl px-6 py-16 md:py-20">
        <Breadcrumbs items={[{ label: 'Blog' }]} />

        <div className="mb-12 text-center md:mb-16">
          <p className="font-mono text-xs uppercase tracking-widest mb-3 text-muted-foreground">// blog_feed</p>
          <h1 className="font-mono text-3xl font-bold md:text-4xl">
            <span className="text-gradient">Blog</span>
          </h1>
        </div>

        {/* Tag filter chips */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            <button
              onClick={() => setActiveTag(null)}
              className={`rounded-full px-3 py-1 font-mono text-xs transition-colors ${
                !activeTag ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              All
            </button>
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => setActiveTag(tag === activeTag ? null : tag)}
                className={`rounded-full px-3 py-1 font-mono text-xs transition-colors ${
                  activeTag === tag ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}

        {isLoading && <BlogSkeletons />}
        {error && (
          <p className="text-center font-mono text-sm text-destructive">Failed to load posts.</p>
        )}

        {filteredPosts.length === 0 && !isLoading && (
          <div className="glass-card p-12 text-center">
            <p className="font-mono text-muted-foreground">
              {activeTag ? `No posts tagged "${activeTag}".` : 'No posts yet. Check back soon.'}
            </p>
          </div>
        )}

        <div className="space-y-6">
          {filteredPosts.map((post) => (
            <Link key={post.id} to={`/blog/${post.slug}`} className="block">
              <article className="glass-card group p-6 transition-all duration-500 hover:glow-blue">
                <div className="mb-3 flex items-center gap-3">
                  <span className="font-mono text-xs text-neon-blue">
                    {format(new Date(post.created_at), 'yyyy.MM.dd')}
                  </span>
                  <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">/{post.slug}</span>
                </div>
                <h2 className="mb-2 font-mono text-xl font-semibold text-foreground group-hover:text-primary transition-colors duration-300">
                  {post.title}
                </h2>
                {(post.tags || []).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {post.tags!.map(tag => (
                      <span key={tag} className="rounded-full bg-primary/10 px-2 py-0.5 font-mono text-[10px] text-primary">{tag}</span>
                    ))}
                  </div>
                )}
                <p className="text-sm leading-relaxed text-muted-foreground line-clamp-3">
                  {post.excerpt || post.content}
                </p>
              </article>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Blog;
