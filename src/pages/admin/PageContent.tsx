import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Pencil } from 'lucide-react';

const PageContent = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<any>(null);

  const { data: pages, isLoading } = useQuery({
    queryKey: ['admin-page-content'],
    queryFn: async () => {
      const { data, error } = await supabase.from('page_content').select('*').order('page_key');
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (page: any) => {
      if (page.id) {
        const { error } = await supabase.from('page_content').update({
          title: page.title,
          content: page.content,
          updated_by: user?.id,
        }).eq('id', page.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('page_content').insert({
          page_key: page.page_key,
          title: page.title,
          content: page.content,
          updated_by: user?.id,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-page-content'] });
      setEditing(null);
      toast({ title: 'Content saved' });
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const openNew = () => {
    setEditing({ page_key: '', title: '', content: { hero_title: '', hero_subtitle: '', body: '' } });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-mono text-2xl font-bold text-foreground">Page Content</h1>
          <p className="font-mono text-xs text-muted-foreground mt-1">Edit site content and copy</p>
        </div>
        <Button onClick={openNew} className="font-mono text-xs glow-blue bg-primary text-primary-foreground">
          <Plus className="h-3.5 w-3.5 mr-1.5" /> New Page
        </Button>
      </div>

      {isLoading && <p className="font-mono text-sm text-muted-foreground">Loading...</p>}

      <div className="grid gap-4">
        {pages?.map((page: any) => (
          <div key={page.id} className="glass-card flex items-center justify-between p-4">
            <div>
              <h3 className="font-mono text-sm font-semibold">{page.title || page.page_key}</h3>
              <p className="font-mono text-xs text-muted-foreground">Key: {page.page_key}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setEditing({ ...page })}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
        {pages?.length === 0 && (
          <div className="glass-card p-12 text-center">
            <p className="font-mono text-sm text-muted-foreground">No page content entries yet.</p>
          </div>
        )}
      </div>

      <Dialog open={!!editing} onOpenChange={() => setEditing(null)}>
        <DialogContent className="border-border bg-card max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-mono">{editing?.id ? 'Edit Content' : 'New Content'}</DialogTitle>
          </DialogHeader>
          {editing && (
            <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(editing); }} className="space-y-4">
              <div className="space-y-2">
                <Label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Page Key</Label>
                <Input
                  required
                  disabled={!!editing.id}
                  value={editing.page_key}
                  onChange={(e) => setEditing({ ...editing, page_key: e.target.value })}
                  className="border-border bg-background/50 font-mono text-sm"
                  placeholder="e.g. homepage, about"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Title</Label>
                <Input
                  value={editing.title ?? ''}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  className="border-border bg-background/50"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Hero Title</Label>
                <Input
                  value={editing.content?.hero_title ?? ''}
                  onChange={(e) => setEditing({ ...editing, content: { ...editing.content, hero_title: e.target.value } })}
                  className="border-border bg-background/50"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Hero Subtitle</Label>
                <Textarea
                  value={editing.content?.hero_subtitle ?? ''}
                  onChange={(e) => setEditing({ ...editing, content: { ...editing.content, hero_subtitle: e.target.value } })}
                  className="border-border bg-background/50"
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Body</Label>
                <Textarea
                  value={editing.content?.body ?? ''}
                  onChange={(e) => setEditing({ ...editing, content: { ...editing.content, body: e.target.value } })}
                  className="border-border bg-background/50"
                  rows={6}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="submit" className="font-mono text-xs glow-blue bg-primary text-primary-foreground" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? 'Saving...' : 'Save'}
                </Button>
                <Button type="button" variant="outline" className="font-mono text-xs" onClick={() => setEditing(null)}>Cancel</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PageContent;
