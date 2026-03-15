import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';

const ease = [0.25, 0.1, 0.25, 1] as const;

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
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="glass-card overflow-hidden">
            <Skeleton className="h-44 w-full" />
            <div className="p-5 space-y-3">
              <Skeleton className="h-3 w-16 rounded-full" />
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
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {posts.map((post, i) => (
        <motion.div
          key={post.id}
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5, delay: i * 0.1, ease }}
          whileHover={{ y: -6, transition: { duration: 0.3 } }}
        >
          <Link to={`/blog/${post.slug}`} className="block group h-full">
            <article className="glass-card overflow-hidden h-full flex flex-col">
              {post.featured_image && (
                <div className="relative h-44 overflow-hidden">
                    <img
                      src={post.featured_image}
                      alt={post.title}
                      width={800}
                      height={450}
                      className="h-full w-full object-cover transition-transform duration-600 group-hover:scale-105"
                      loading="lazy"
                      decoding="async"
                    />
                  <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
                </div>
              )}
              <div className="flex flex-1 flex-col p-5">
                <div className="flex items-center gap-3 mb-3">
                  {(post.tags as string[] | null)?.length ? (
                    (post.tags as string[]).slice(0, 1).map(tag => (
                      <span key={tag} className="rounded-full bg-primary/10 px-2.5 py-0.5 font-mono text-[10px] text-primary tracking-wider uppercase">
                        {tag}
                      </span>
                    ))
                  ) : null}
                  <span className="font-mono text-[10px] text-muted-foreground/60 tracking-wider">
                    {format(new Date(post.created_at), 'MMM d, yyyy')}
                  </span>
                </div>
                <h3 className="mb-2 font-mono text-base font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                  {post.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground line-clamp-2 flex-1">
                  {post.excerpt}
                </p>
                <span className="mt-4 inline-flex items-center gap-1 font-mono text-xs text-primary/60 group-hover:text-primary transition-all duration-300 group-hover:gap-2">
                  Read article <ArrowRight className="h-3 w-3" />
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
