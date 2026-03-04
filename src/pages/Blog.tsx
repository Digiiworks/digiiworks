import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Post } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
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
    <div className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="mb-12 text-center text-4xl font-bold">Blog</h1>

      {isLoading && <p className="text-center text-muted-foreground">Loading posts...</p>}
      {error && <p className="text-center text-destructive">Failed to load posts.</p>}

      {posts && posts.length === 0 && (
        <p className="text-center text-muted-foreground">No posts yet. Check back soon!</p>
      )}

      <div className="space-y-6">
        {posts?.map((post) => (
          <Card key={post.id}>
            <CardHeader>
              <CardTitle>{post.title}</CardTitle>
              <CardDescription>{format(new Date(post.created_at), 'MMMM d, yyyy')}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground line-clamp-3">{post.content}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Blog;
