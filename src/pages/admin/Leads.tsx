import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ChevronDown, Trash2, ExternalLink, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import ConfirmDialog from '@/components/ConfirmDialog';

const STATUSES = ['new', 'contacted', 'qualified', 'converted', 'lost'] as const;

const statusStyle = (status: string) => {
  switch (status) {
    case 'new': return 'bg-neon-blue/10 text-neon-blue';
    case 'contacted': return 'bg-neon-purple/10 text-neon-purple';
    case 'qualified': return 'bg-yellow-500/10 text-yellow-500';
    case 'converted': return 'bg-neon-mint/10 text-neon-mint';
    case 'lost': return 'bg-destructive/10 text-destructive';
    default: return 'bg-muted text-muted-foreground';
  }
};

const Leads = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [openId, setOpenId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: leads, isLoading } = useQuery({
    queryKey: ['admin-leads', filterStatus],
    queryFn: async () => {
      let query = supabase.from('leads').select('*').order('created_at', { ascending: false });
      if (filterStatus !== 'all') query = query.eq('status', filterStatus as any);
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
      setOpenId(null);
      toast({ title: 'Lead deleted' });
    },
  });

  const toggle = (id: string) => setOpenId((prev) => (prev === id ? null : id));

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

      <div className="divide-y divide-border/30">
        {leads?.map((lead: any) => {
          const isOpen = openId === lead.id;
          return (
            <div key={lead.id}>
              {/* Accordion trigger row */}
              <button
                type="button"
                onClick={() => toggle(lead.id)}
                className="flex w-full items-center gap-4 px-2 py-3.5 text-left transition-colors hover:bg-muted/20"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-medium text-foreground truncate">{lead.name}</span>
                    {lead.priority && <Zap className="h-3.5 w-3.5 text-yellow-500 shrink-0" />}
                    <span className={`shrink-0 rounded-full px-2 py-0.5 font-mono text-[10px] uppercase ${statusStyle(lead.status)}`}>
                      {lead.status}
                    </span>
                  </div>
                  <p className="font-mono text-xs text-muted-foreground truncate mt-0.5">
                    {lead.email} · {lead.service_interest || 'No service selected'} · {format(new Date(lead.created_at), 'MMM d, yyyy')}
                  </p>
                </div>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200',
                    isOpen && 'rotate-180'
                  )}
                />
              </button>

              {/* Accordion content */}
              {isOpen && (
                <div className="pb-5 pl-2 pr-2 space-y-4 animate-in fade-in-0 slide-in-from-top-1 duration-200">
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 lg:grid-cols-4">
                    <Field label="Email" value={lead.email} />
                    <Field label="Service Interest" value={lead.service_interest} />
                    <Field label="Business Type" value={lead.business_type} />
                    <Field label="Budget" value={lead.budget_range} />
                    <Field label="Timeline" value={lead.timeline} />
                    <Field label="Priority" value={lead.priority ? '⚡ High' : 'Normal'} />
                    <Field label="Submitted" value={format(new Date(lead.created_at), 'MMM d, yyyy HH:mm')} />
                    {lead.website_url && (
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">Website</p>
                        <a
                          href={lead.website_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-mono text-xs text-primary hover:underline"
                        >
                          {lead.website_url} <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                  </div>

                  {lead.message && (
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Message</p>
                      <p className="text-sm text-foreground/90 leading-relaxed">{lead.message}</p>
                    </div>
                  )}

                  <div className="flex flex-wrap items-end gap-4">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Status</p>
                      <Select
                        value={lead.status}
                        onValueChange={(val) => updateLead.mutate({ id: lead.id, updates: { status: val } })}
                      >
                        <SelectTrigger className="w-36 border-border bg-background/50 font-mono text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((s) => (
                            <SelectItem key={s} value={s} className="capitalize font-mono text-xs">{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex-1 min-w-[200px]">
                      <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Internal Notes</p>
                      <Textarea
                        defaultValue={lead.notes ?? ''}
                        onBlur={(e) => {
                          if (e.target.value !== (lead.notes ?? '')) {
                            updateLead.mutate({ id: lead.id, updates: { notes: e.target.value } });
                          }
                        }}
                        className="border-border bg-background/50 font-sans text-sm"
                        rows={2}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="font-mono text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        if (confirm('Delete this lead permanently?')) {
                          deleteLead.mutate(lead.id);
                        }
                      }}
                    >
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                      Delete
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {leads?.length === 0 && (
          <p className="py-12 text-center font-mono text-sm text-muted-foreground">No leads found.</p>
        )}
      </div>
    </div>
  );
};

const Field = ({ label, value }: { label: string; value: string | null | undefined }) => (
  <div>
    <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">{label}</p>
    <p className="font-mono text-xs text-foreground">{value || '—'}</p>
  </div>
);

export default Leads;
