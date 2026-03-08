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
  const { data: posts, isLoading, error } = useQuery({
    queryKey: ['posts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Post[];
    },
  });

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

        {isLoading && <BlogSkeletons />}
        {error && (
          <p className="text-center font-mono text-sm text-destructive">Failed to load posts.</p>
        )}

        {posts && posts.length === 0 && (
          <div className="glass-card p-12 text-center">
            <p className="font-mono text-muted-foreground">No posts yet. Check back soon.</p>
          </div>
        )}

        <div className="space-y-6">
          {posts?.map((post) => (
            <Link key={post.id} to={`/blog/${post.slug}`} className="block">
              <article className="glass-card group p-6 transition-all duration-500 hover:glow-blue">
                <div className="mb-3 flex items-center gap-3">
                  <span className="font-mono text-xs text-neon-blue">
                    {format(new Date(post.created_at), 'yyyy.MM.dd')}
                  </span>
                  <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">/{post.slug}</span>
                </div>
                <h2 className="mb-3 font-mono text-xl font-semibold text-foreground group-hover:text-primary transition-colors duration-300">
                  {post.title}
                </h2>
                <p className="text-sm leading-relaxed text-muted-foreground line-clamp-3">
                  {post.content}
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
