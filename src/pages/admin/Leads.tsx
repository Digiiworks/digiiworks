import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

const STATUSES = ['new', 'contacted', 'qualified', 'converted', 'lost'] as const;

const Leads = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const { data: leads, isLoading } = useQuery({
    queryKey: ['admin-leads', filterStatus],
    queryFn: async () => {
      let query = supabase.from('leads').select('*').order('created_at', { ascending: false });
      if (filterStatus !== 'all') query = query.eq('status', filterStatus);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const updateLead = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { error } = await supabase.from('leads').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-leads'] });
      toast({ title: 'Lead updated' });
    },
  });

  const deleteLead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('leads').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-leads'] });
      setSelectedLead(null);
      toast({ title: 'Lead deleted' });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-mono text-2xl font-bold text-foreground">Leads</h1>
          <p className="font-mono text-xs text-muted-foreground mt-1">Manage contact form submissions</p>
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36 border-border bg-background/50 font-mono text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading && <p className="font-mono text-sm text-muted-foreground">Loading...</p>}

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50">
                <th className="px-4 py-3 text-left font-mono text-xs uppercase tracking-widest text-muted-foreground">Name</th>
                <th className="px-4 py-3 text-left font-mono text-xs uppercase tracking-widest text-muted-foreground">Email</th>
                <th className="px-4 py-3 text-left font-mono text-xs uppercase tracking-widest text-muted-foreground hidden md:table-cell">Service</th>
                <th className="px-4 py-3 text-left font-mono text-xs uppercase tracking-widest text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-mono text-xs uppercase tracking-widest text-muted-foreground hidden lg:table-cell">Date</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {leads?.map((lead: any) => (
                <tr key={lead.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-sm">{lead.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{lead.email}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground hidden md:table-cell">{lead.service_interest}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 font-mono text-[10px] uppercase ${
                      lead.status === 'new' ? 'bg-neon-blue/10 text-neon-blue' :
                      lead.status === 'contacted' ? 'bg-neon-purple/10 text-neon-purple' :
                      lead.status === 'converted' ? 'bg-neon-mint/10 text-neon-mint' :
                      lead.status === 'lost' ? 'bg-destructive/10 text-destructive' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {lead.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground hidden lg:table-cell">
                    {format(new Date(lead.created_at), 'MMM d, yyyy')}
                  </td>
                  <td className="px-4 py-3">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedLead(lead)} className="font-mono text-xs">
                      View
                    </Button>
                  </td>
                </tr>
              ))}
              {leads?.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center font-mono text-sm text-muted-foreground">No leads found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Lead detail dialog */}
      <Dialog open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
        <DialogContent className="border-border bg-card max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-mono text-lg">{selectedLead?.name}</DialogTitle>
          </DialogHeader>
          {selectedLead && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-mono text-xs text-muted-foreground uppercase">Email</p>
                  <p className="font-mono">{selectedLead.email}</p>
                </div>
                <div>
                  <p className="font-mono text-xs text-muted-foreground uppercase">Service</p>
                  <p className="font-mono">{selectedLead.service_interest}</p>
                </div>
                <div>
                  <p className="font-mono text-xs text-muted-foreground uppercase">Priority</p>
                  <p className="font-mono">{selectedLead.priority ? '⚡ High' : 'Normal'}</p>
                </div>
                <div>
                  <p className="font-mono text-xs text-muted-foreground uppercase">Date</p>
                  <p className="font-mono">{format(new Date(selectedLead.created_at), 'MMM d, yyyy HH:mm')}</p>
                </div>
              </div>

              <div>
                <p className="font-mono text-xs text-muted-foreground uppercase mb-1">Message</p>
                <p className="text-sm text-foreground/90 leading-relaxed">{selectedLead.message}</p>
              </div>

              <div>
                <p className="font-mono text-xs text-muted-foreground uppercase mb-1">Status</p>
                <Select
                  value={selectedLead.status}
                  onValueChange={(val) => {
                    updateLead.mutate({ id: selectedLead.id, updates: { status: val } });
                    setSelectedLead({ ...selectedLead, status: val });
                  }}
                >
                  <SelectTrigger className="border-border bg-background/50 font-mono text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s} className="capitalize font-mono text-xs">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <p className="font-mono text-xs text-muted-foreground uppercase mb-1">Internal Notes</p>
                <Textarea
                  defaultValue={selectedLead.notes ?? ''}
                  onBlur={(e) => {
                    if (e.target.value !== (selectedLead.notes ?? '')) {
                      updateLead.mutate({ id: selectedLead.id, updates: { notes: e.target.value } });
                    }
                  }}
                  className="border-border bg-background/50 font-sans text-sm"
                  rows={3}
                />
              </div>

              <Button
                variant="destructive"
                size="sm"
                className="font-mono text-xs"
                onClick={() => deleteLead.mutate(selectedLead.id)}
              >
                Delete Lead
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Leads;
