import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import type { Post } from '@/lib/types';
import { format } from 'date-fns';
import { ArrowLeft } from 'lucide-react';

const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();

  const { data: post, isLoading, error } = useQuery({
    queryKey: ['post', slug],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('posts')
          .select('*')
          .eq('slug', slug)
          .single();
        if (error) throw error;
        return data as Post;
      } catch (err) {
        throw err;
      }
    },
    enabled: !!slug,
  });

  return (
    <div className="relative min-h-screen">
      <div className="absolute inset-0 grid-overlay opacity-10" />
      <div className="relative mx-auto max-w-3xl px-6 py-16 md:py-20">
        {/* Back link */}
        <Link
          to="/blog"
          className="mb-10 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Blog
        </Link>

        {isLoading && (
          <p className="text-center font-mono text-sm text-muted-foreground">Loading...</p>
        )}

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
            {/* Meta */}
            <div className="mb-6 flex items-center gap-3">
              <span className="font-mono text-xs text-neon-blue">
                {format(new Date(post.created_at), 'yyyy.MM.dd')}
              </span>
              <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                /{post.slug}
              </span>
            </div>

            {/* Title */}
            <h1 className="mb-10 font-mono text-3xl font-bold leading-tight text-foreground md:text-4xl">
              {post.title}
            </h1>

            {/* Content */}
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
