import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Post } from '@/lib/types';
import { format } from 'date-fns';

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
      <div className="absolute inset-0 grid-overlay opacity-20" />
      <div className="relative mx-auto max-w-3xl px-6 py-20">
        <div className="mb-16 text-center">
          <p className="font-mono-label mb-3 text-muted-foreground">// blog_feed</p>
          <h1 className="font-mono text-4xl font-bold">
            <span className="text-gradient">Blog</span>
          </h1>
        </div>

        {isLoading && (
          <p className="text-center font-mono text-sm text-muted-foreground">Loading posts...</p>
        )}
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
            <article key={post.id} className="glass-card group p-6 transition-all duration-500 hover:glow-blue">
              <div className="mb-3 flex items-center gap-3">
                <span className="font-mono text-xs text-neon-blue">
                  {format(new Date(post.created_at), 'yyyy.MM.dd')}
                </span>
                <span className="font-mono-label text-muted-foreground">/{post.slug}</span>
              </div>
              <h2 className="mb-3 font-mono text-xl font-semibold text-foreground group-hover:text-primary transition-colors duration-300">
                {post.title}
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground line-clamp-3">
                {post.content}
              </p>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Blog;
