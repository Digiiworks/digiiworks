import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import type { Post } from '@/lib/types';
import { format } from 'date-fns';
import { ArrowLeft } from 'lucide-react';
import Breadcrumbs from '@/components/Breadcrumbs';
import { Skeleton } from '@/components/ui/skeleton';

const ArticleJsonLd = ({ post }: { post: Post }) => (
  <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": post.title,
    "datePublished": post.created_at,
    "url": `https://digiiworks.co/blog/${post.slug}`,
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

  return (
    <div className="relative min-h-screen">
      {post && <ArticleJsonLd post={post} />}
      <div className="absolute inset-0 grid-overlay opacity-10" />
      <div className="relative mx-auto max-w-3xl px-6 py-16 md:py-20">
        <Breadcrumbs items={[
          { label: 'Blog', to: '/blog' },
          { label: post?.title ?? slug ?? '...' },
        ]} />

        <Link
          to="/blog"
          className="mb-10 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
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
            <div className="mb-6 flex items-center gap-3">
              <span className="font-mono text-xs text-neon-blue">
                {format(new Date(post.created_at), 'yyyy.MM.dd')}
              </span>
              <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                /{post.slug}
              </span>
            </div>

            <h1 className="mb-10 font-mono text-3xl font-bold leading-tight text-foreground md:text-4xl">
              {post.title}
            </h1>

            <div className="glass-card p-6 md:p-10">
              <div className="prose-invert max-w-none text-foreground/90 leading-relaxed whitespace-pre-wrap font-sans text-base">
                {post.content}
              </div>
            </div>
          </article>
        )}
      </div>
    </div>
  );
};

export default BlogPost;
