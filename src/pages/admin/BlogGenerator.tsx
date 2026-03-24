import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Plus, Trash2, Clock, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const CATEGORIES = ['Web Development', 'AI Automation', 'SEO', 'UX Design', 'Digital Marketing', 'Technology', 'Performance', 'Business'];
const TONES = ['professional', 'casual', 'technical', 'seo-focused'];

type Job = {
  id: string;
  topic: string;
  status: string;
  error: string | null;
  created_at: string;
  completed_at: string | null;
  post_id: string | null;
};

type Config = {
  id: string;
  tone: string;
  default_category: string;
  auto_publish: boolean;
  topics_queue: string[];
};

export default function BlogGenerator() {
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState('professional');
  const [category, setCategory] = useState('Business');
  const [autoPublish, setAutoPublish] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [newTopic, setNewTopic] = useState('');
  const [config, setConfig] = useState<Config | null>(null);
  const [savingConfig, setSavingConfig] = useState(false);
  const queryClient = useQueryClient();

  // Load config
  useEffect(() => {
    supabase.from('blog_generation_config').select('*').limit(1).single()
      .then(({ data }) => { if (data) setConfig(data as Config); });
  }, []);

  // Load job history
  const { data: jobs, refetch: refetchJobs } = useQuery({
    queryKey: ['blog-generation-jobs'],
    queryFn: async () => {
      const { data } = await supabase
        .from('blog_generation_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      return (data ?? []) as Job[];
    },
  });

  const handleGenerate = async () => {
    if (!topic.trim()) { toast.error('Enter a topic first'); return; }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-blog-post', {
        body: { topic: topic.trim(), tone, category, auto_publish: autoPublish },
      });
      if (error) throw error;
      toast.success(`Post "${data.title}" ${autoPublish ? 'published' : 'saved as draft'}!`);
      setTopic('');
      refetchJobs();
      queryClient.invalidateQueries({ queryKey: ['admin-posts'] });
    } catch (err: any) {
      toast.error('Generation failed: ' + (err.message || 'Unknown error'));
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!config) return;
    setSavingConfig(true);
    await supabase.from('blog_generation_config').update({
      tone: config.tone,
      default_category: config.default_category,
      auto_publish: config.auto_publish,
      topics_queue: config.topics_queue,
      updated_at: new Date().toISOString(),
    }).eq('id', config.id);
    toast.success('Configuration saved');
    setSavingConfig(false);
  };

  const addTopicToQueue = () => {
    if (!newTopic.trim() || !config) return;
    setConfig(prev => prev ? { ...prev, topics_queue: [...prev.topics_queue, newTopic.trim()] } : prev);
    setNewTopic('');
  };

  const removeTopicFromQueue = (idx: number) => {
    setConfig(prev => prev ? { ...prev, topics_queue: prev.topics_queue.filter((_, i) => i !== idx) } : prev);
  };

  const StatusIcon = ({ status }: { status: string }) => {
    if (status === 'completed') return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />;
    if (status === 'failed') return <XCircle className="h-3.5 w-3.5 text-red-400" />;
    if (status === 'running') return <Loader2 className="h-3.5 w-3.5 text-blue-400 animate-spin" />;
    return <Clock className="h-3.5 w-3.5 text-muted-foreground" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Sparkles className="h-5 w-5 text-primary" />
        <div>
          <h1 className="font-mono text-xl font-bold">Blog AI Generator</h1>
          <p className="font-mono text-xs text-muted-foreground">Generate blog posts with Claude AI + Unsplash images</p>
        </div>
      </div>

      <Tabs defaultValue="generate">
        <TabsList className="font-mono text-xs">
          <TabsTrigger value="generate">Generate Now</TabsTrigger>
          <TabsTrigger value="queue">Topics Queue</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        {/* Generate Now Tab */}
        <TabsContent value="generate">
          <Card>
            <CardHeader>
              <CardTitle className="font-mono text-sm">Generate a Blog Post</CardTitle>
              <CardDescription className="font-mono text-xs">
                Claude will write a full post (~800-1200 words) with a relevant Unsplash image
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label className="font-mono text-xs">Topic *</Label>
                <Textarea
                  placeholder="e.g. How AI is transforming small business operations in 2025"
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  className="font-mono text-sm resize-none"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="font-mono text-xs">Tone</Label>
                  <Select value={tone} onValueChange={setTone}>
                    <SelectTrigger className="font-mono text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TONES.map(t => (
                        <SelectItem key={t} value={t} className="font-mono text-xs capitalize">{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="font-mono text-xs">Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="font-mono text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => (
                        <SelectItem key={c} value={c} className="font-mono text-xs">{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={autoPublish} onCheckedChange={setAutoPublish} id="auto-publish" />
                <Label htmlFor="auto-publish" className="font-mono text-xs cursor-pointer">
                  Auto-publish (off = save as draft for review)
                </Label>
              </div>
              <Button onClick={handleGenerate} disabled={generating || !topic.trim()} className="w-full font-mono text-xs">
                {generating ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating... (~15 seconds)</>
                ) : (
                  <><Sparkles className="h-4 w-4 mr-2" /> Generate Post</>
                )}
              </Button>
              <p className="font-mono text-[10px] text-muted-foreground text-center">
                Requires ANTHROPIC_API_KEY in Supabase Edge Function Secrets
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Topics Queue Tab */}
        <TabsContent value="queue">
          <Card>
            <CardHeader>
              <CardTitle className="font-mono text-sm">Topics Queue</CardTitle>
              <CardDescription className="font-mono text-xs">
                Topics for scheduled weekly generation (every Thursday 9am UTC).
                Posts are generated in order — oldest topic first.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {config && (
                <>
                  {/* Schedule config */}
                  <div className="grid grid-cols-2 gap-4 p-3 border border-border rounded-lg">
                    <div className="space-y-1">
                      <Label className="font-mono text-xs">Default Tone</Label>
                      <Select value={config.tone} onValueChange={v => setConfig(p => p ? { ...p, tone: v } : p)}>
                        <SelectTrigger className="font-mono text-xs h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TONES.map(t => <SelectItem key={t} value={t} className="font-mono text-xs capitalize">{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="font-mono text-xs">Default Category</Label>
                      <Select value={config.default_category} onValueChange={v => setConfig(p => p ? { ...p, default_category: v } : p)}>
                        <SelectTrigger className="font-mono text-xs h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map(c => <SelectItem key={c} value={c} className="font-mono text-xs">{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2 col-span-2">
                      <Switch
                        checked={config.auto_publish}
                        onCheckedChange={v => setConfig(p => p ? { ...p, auto_publish: v } : p)}
                        id="auto-pub-config"
                      />
                      <Label htmlFor="auto-pub-config" className="font-mono text-xs cursor-pointer">
                        Auto-publish scheduled posts (off = save as draft)
                      </Label>
                    </div>
                  </div>

                  {/* Topic queue */}
                  <div className="space-y-2">
                    <Label className="font-mono text-xs">Queue ({config.topics_queue.length} topics)</Label>
                    {config.topics_queue.length === 0 ? (
                      <p className="font-mono text-xs text-muted-foreground py-3 text-center border border-dashed border-border rounded-lg">
                        No topics queued. Add topics below.
                      </p>
                    ) : (
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {config.topics_queue.map((t, idx) => (
                          <div key={idx} className="flex items-center gap-2 p-2 border border-border rounded text-xs font-mono">
                            <span className="text-muted-foreground w-5 flex-shrink-0">{idx + 1}.</span>
                            <span className="flex-1 truncate">{t}</span>
                            <button onClick={() => removeTopicFromQueue(idx)} className="text-muted-foreground hover:text-red-400 transition-colors">
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add a topic..."
                        value={newTopic}
                        onChange={e => setNewTopic(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && addTopicToQueue()}
                        className="font-mono text-xs"
                      />
                      <Button variant="outline" size="sm" onClick={addTopicToQueue} disabled={!newTopic.trim()}>
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  <Button onClick={handleSaveConfig} disabled={savingConfig} className="w-full font-mono text-xs">
                    {savingConfig ? 'Saving...' : 'Save Configuration'}
                  </Button>

                  <p className="font-mono text-[10px] text-muted-foreground text-center">
                    Schedule: every Thursday 9am UTC · requires pg_cron + app.settings configured in Supabase
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="font-mono text-sm">Generation History</CardTitle>
            </CardHeader>
            <CardContent>
              {jobs?.length === 0 ? (
                <p className="font-mono text-xs text-muted-foreground text-center py-4">No generation history yet</p>
              ) : (
                <div className="space-y-2">
                  {jobs?.map(job => (
                    <div key={job.id} className="flex items-start gap-3 p-3 border border-border rounded-lg">
                      <StatusIcon status={job.status} />
                      <div className="flex-1 min-w-0">
                        <p className="font-mono text-xs font-medium truncate">{job.topic}</p>
                        <p className="font-mono text-[10px] text-muted-foreground">
                          {format(new Date(job.created_at), 'dd MMM yyyy HH:mm')}
                        </p>
                        {job.error && (
                          <p className="font-mono text-[10px] text-red-400 mt-1 truncate">{job.error}</p>
                        )}
                      </div>
                      <div className="flex-shrink-0 flex items-center gap-2">
                        <Badge className={
                          job.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                          job.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                          job.status === 'running' ? 'bg-blue-500/20 text-blue-400' :
                          'bg-zinc-500/20 text-zinc-400'
                        }>
                          {job.status}
                        </Badge>
                        {job.post_id && (
                          <a
                            href={`/admin/posts`}
                            className="font-mono text-[10px] text-primary hover:underline"
                          >
                            View post
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
