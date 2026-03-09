import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Trash2 } from 'lucide-react';
import ConfirmDialog from '@/components/ConfirmDialog';
import AdminToolbar from '@/components/admin/AdminToolbar';
import PageLoader from '@/components/admin/PageLoader';

const ROLES = ['admin', 'editor', 'client'] as const;

const UsersAdmin = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deleteRoleId, setDeleteRoleId] = useState<string | null>(null);

  const { data: profiles, isLoading } = useQuery({
    queryKey: ['admin-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: allRoles } = useQuery({
    queryKey: ['admin-all-roles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('user_roles').select('*');
      if (error) throw error;
      return data;
    },
  });

  const addRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const { error } = await supabase.from('user_roles').insert({ user_id: userId, role: role as any });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-all-roles'] });
      toast({ title: 'Role added' });
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const removeRole = useMutation({
    mutationFn: async (roleId: string) => {
      const { error } = await supabase.from('user_roles').delete().eq('id', roleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-all-roles'] });
      setDeleteRoleId(null);
      toast({ title: 'Role removed' });
    },
  });

  const getUserRoles = (userId: string) => allRoles?.filter((r: any) => r.user_id === userId) ?? [];

  return (
    <div className="space-y-6">
      <AdminToolbar title="Users & Roles" subtitle="Manage team members and permissions" />

      {isLoading && <PageLoader />}

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50">
                <th className="px-4 py-3 text-left font-mono text-xs uppercase tracking-widest text-muted-foreground">User</th>
                <th className="px-4 py-3 text-left font-mono text-xs uppercase tracking-widest text-muted-foreground">Roles</th>
                <th className="px-4 py-3 text-left font-mono text-xs uppercase tracking-widest text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {profiles?.map((profile: any) => {
                const roles = getUserRoles(profile.user_id);
                return (
                  <tr key={profile.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-mono text-sm">{profile.display_name}</p>
                      <p className="font-mono text-xs text-muted-foreground">{profile.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {roles.map((r: any) => (
                          <span key={r.id} className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] uppercase bg-primary/10 text-primary">
                            {r.role}
                            <button onClick={() => setDeleteRoleId(r.id)} className="hover:text-destructive">
                              <Trash2 className="h-2.5 w-2.5" />
                            </button>
                          </span>
                        ))}
                        {roles.length === 0 && (
                          <span className="font-mono text-[10px] text-muted-foreground">No roles</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Select onValueChange={(role) => addRole.mutate({ userId: profile.user_id, role })}>
                        <SelectTrigger className="w-28 border-border bg-background/50 font-mono text-[10px]">
                          <SelectValue placeholder="Add role" />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLES.map((r) => (
                            <SelectItem key={r} value={r} className="font-mono text-xs capitalize">{r}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog
        open={!!deleteRoleId}
        onOpenChange={(open) => !open && setDeleteRoleId(null)}
        title="Remove role?"
        description="This will remove the role from this user."
        confirmLabel="Remove"
        onConfirm={() => deleteRoleId && removeRole.mutate(deleteRoleId)}
      />
    </div>
  );
};

export default UsersAdmin;
