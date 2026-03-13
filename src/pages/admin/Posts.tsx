import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Plus, Pencil, Trash2, Upload, X } from 'lucide-react';
import RichEditor from '@/components/admin/RichEditor';
import ConfirmDialog from '@/components/ConfirmDialog';
import AdminToolbar from '@/components/admin/AdminToolbar';
import PageLoader from '@/components/admin/PageLoader';
import EmptyState, { ErrorState } from '@/components/admin/EmptyState';

const Posts = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editingPost, setEditingPost] = useState<any>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: posts, isLoading } = useQuery({
    queryKey: ['admin-posts'],
    queryFn: async () => {
      const { data, error } = await supabase.from('posts').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (post: any) => {
      if (post.id) {
        const { error } = await supabase.from('posts').update({
          title: post.title, slug: post.slug, content: post.content,
          excerpt: post.excerpt, status: post.status, featured_image: post.featured_image,
          tags: post.tags || [],
        }).eq('id', post.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('posts').insert({
          title: post.title, slug: post.slug, content: post.content,
          excerpt: post.excerpt, status: post.status, featured_image: post.featured_image,
          tags: post.tags || [], author_id: user?.id,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-posts'] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      setShowEditor(false);
      setEditingPost(null);
      toast({ title: 'Post saved' });
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('posts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-posts'] });
      setDeleteId(null);
      toast({ title: 'Post deleted' });
    },
  });

  const uploadFeaturedImage = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const ext = file.name.split('.').pop();
      const path = `featured/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('blog-images').upload(path, file);
      if (error) {
        toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
        return;
      }
      const { data } = supabase.storage.from('blog-images').getPublicUrl(path);
      setEditingPost((prev: any) => ({ ...prev, featured_image: data.publicUrl }));
      toast({ title: 'Image uploaded' });
    };
    input.click();
  };

  const openNew = () => {
    setEditingPost({ title: '', slug: '', content: '', excerpt: '', status: 'draft', featured_image: '', tags: [] });
    setShowEditor(true);
  };

  const openEdit = (post: any) => {
    setEditingPost({ ...post });
    setShowEditor(true);
  };

  return (
    <div className="space-y-6">
      <AdminToolbar title="Blog Posts" subtitle="Create and manage blog content">
        <Button onClick={openNew} className="font-mono text-xs glow-blue bg-primary text-primary-foreground">
          <Plus className="h-3.5 w-3.5 mr-1.5" /> New Post
        </Button>
      </AdminToolbar>

      {isLoading && <PageLoader />}

      <div className="grid gap-4">
        {posts?.map((post: any) => (
          <div key={post.id} className="glass-card flex items-center justify-between p-4">
            <div className="flex items-center gap-4 min-w-0 flex-1">
              {post.featured_image && (
                <img src={post.featured_image} alt="" className="h-12 w-16 rounded object-cover shrink-0" />
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-mono text-sm font-semibold truncate">{post.title}</h3>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 font-mono text-[10px] uppercase ${
                    post.status === 'published' ? 'bg-neon-mint/10 text-neon-mint' : 'bg-muted text-muted-foreground'
                  }`}>
                    {post.status}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <p className="font-mono text-xs text-muted-foreground">
                    /{post.slug} · {format(new Date(post.created_at), 'MMM d, yyyy')}
                  </p>
                  {(post as any).tags?.length > 0 && (
                    <div className="flex gap-1">
                      {(post as any).tags.slice(0, 3).map((tag: string) => (
                        <span key={tag} className="rounded-full bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] text-primary">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <Button variant="ghost" size="icon" onClick={() => openEdit(post)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setDeleteId(post.id)}>
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
        {posts?.length === 0 && <EmptyState message="No posts yet. Create your first one." />}
      </div>

      {/* Editor Dialog */}
      <Dialog open={showEditor} onOpenChange={() => { setShowEditor(false); setEditingPost(null); }}>
        <DialogContent className="border-border bg-card max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-mono">{editingPost?.id ? 'Edit Post' : 'New Post'}</DialogTitle>
          </DialogHeader>
          {editingPost && (
            <form
              onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(editingPost); }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Title</Label>
                  <Input
                    required
                    value={editingPost.title}
                    onChange={(e) => {
                      const title = e.target.value;
                      const slug = editingPost.id ? editingPost.slug : title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
                      setEditingPost({ ...editingPost, title, slug });
                    }}
                    className="border-border bg-background/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Slug</Label>
                  <Input
                    required
                    value={editingPost.slug}
                    onChange={(e) => setEditingPost({ ...editingPost, slug: e.target.value })}
                    className="border-border bg-background/50 font-mono text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Featured Image</Label>
                <div className="flex items-center gap-3">
                  {editingPost.featured_image && (
                    <img src={editingPost.featured_image} alt="" className="h-16 w-24 rounded object-cover" />
                  )}
                  <Button type="button" variant="outline" size="sm" onClick={uploadFeaturedImage} className="font-mono text-xs">
                    <Upload className="h-3 w-3 mr-1.5" />
                    {editingPost.featured_image ? 'Replace' : 'Upload'}
                  </Button>
                  {editingPost.featured_image && (
                    <Button
                      type="button" variant="ghost" size="sm"
                      onClick={() => setEditingPost({ ...editingPost, featured_image: '' })}
                      className="font-mono text-xs text-destructive"
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Excerpt</Label>
                <Textarea
                  value={editingPost.excerpt ?? ''}
                  onChange={(e) => setEditingPost({ ...editingPost, excerpt: e.target.value })}
                  className="border-border bg-background/50"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Content</Label>
                <RichEditor
                  content={editingPost.content ?? ''}
                  onChange={(html) => setEditingPost({ ...editingPost, content: html })}
                />
              </div>

              <div className="space-y-2">
                <Label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Tags</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {(editingPost.tags || []).map((tag: string, i: number) => (
                    <span key={i} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 font-mono text-xs text-primary">
                      {tag}
                      <button type="button" onClick={() => setEditingPost((prev: any) => ({ ...prev, tags: prev.tags.filter((_: string, idx: number) => idx !== i) }))} className="hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <Input
                  placeholder="Type a tag and press Enter"
                  className="border-border bg-background/50 font-mono text-xs"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const val = (e.target as HTMLInputElement).value.trim().toLowerCase();
                      if (val && !(editingPost.tags || []).includes(val)) {
                        setEditingPost((prev: any) => ({ ...prev, tags: [...(prev.tags || []), val] }));
                        (e.target as HTMLInputElement).value = '';
                      }
                    }
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Status</Label>
                <Select value={editingPost.status} onValueChange={(val) => setEditingPost({ ...editingPost, status: val })}>
                  <SelectTrigger className="border-border bg-background/50 font-mono text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="submit" className="font-mono text-xs glow-blue bg-primary text-primary-foreground" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? 'Saving...' : 'Save Post'}
                </Button>
                <Button type="button" variant="outline" className="font-mono text-xs" onClick={() => { setShowEditor(false); setEditingPost(null); }}>
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete post?"
        description="This will permanently remove this post and cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
      />
    </div>
  );
};

export default Posts;
