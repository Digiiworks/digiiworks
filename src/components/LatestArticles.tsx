import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';

const LatestArticles = () => {
  const { data: posts, isLoading } = useQuery({
    queryKey: ['latest-posts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('id, title, slug, excerpt, featured_image, created_at, tags')
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(3);
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 md:gap-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="glass-card overflow-hidden">
            <Skeleton className="h-40 w-full" />
            <div className="p-5 space-y-3">
              <Skeleton className="h-4 w-20 rounded-full" />
              <Skeleton className="h-5 w-4/5" />
              <Skeleton className="h-4 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!posts?.length) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 md:gap-6">
      {posts.map((post, i) => (
        <motion.div
          key={post.id}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.4, delay: i * 0.12 }}
        >
          <Link to={`/blog/${post.slug}`} className="block group h-full">
            <article className="glass-card overflow-hidden transition-all duration-500 hover:glow-blue h-full flex flex-col">
              {post.featured_image && (
                <div className="relative h-40 overflow-hidden">
                  <img
                    src={post.featured_image}
                    alt={post.title}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                </div>
              )}
              <div className="flex flex-1 flex-col p-4 md:p-5">
                {(post.tags as string[] | null)?.length ? (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {(post.tags as string[]).slice(0, 2).map(tag => (
                      <span key={tag} className="rounded-full bg-primary/10 px-2 py-0.5 font-mono text-[10px] text-primary">
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
                <span className="font-mono text-[11px] text-muted-foreground mb-2">
                  {format(new Date(post.created_at), 'MMM d, yyyy')}
                </span>
                <h3 className="mb-2 font-mono text-base font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                  {post.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground line-clamp-2 flex-1">
                  {post.excerpt}
                </p>
                <span className="mt-3 inline-flex items-center gap-1 font-mono text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  Read more <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </article>
          </Link>
        </motion.div>
      ))}
    </div>
  );
};

export default LatestArticles;
