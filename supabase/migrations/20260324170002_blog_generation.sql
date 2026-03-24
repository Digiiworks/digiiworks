-- Blog generation config and job tracking tables

CREATE TABLE IF NOT EXISTS public.blog_generation_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tone TEXT NOT NULL DEFAULT 'professional',
  default_category TEXT NOT NULL DEFAULT 'Business',
  auto_publish BOOLEAN NOT NULL DEFAULT false,
  topics_queue JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.blog_generation_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_blog_config" ON public.blog_generation_config
  FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Seed default config row
INSERT INTO public.blog_generation_config (tone, default_category, auto_publish, topics_queue)
VALUES ('professional', 'Business', false, '[]'::jsonb)
ON CONFLICT DO NOTHING;

-- Generation job history
CREATE TABLE IF NOT EXISTS public.blog_generation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  post_id UUID REFERENCES public.posts(id) ON DELETE SET NULL,
  error TEXT,
  scheduled_for TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE public.blog_generation_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_blog_jobs" ON public.blog_generation_jobs
  FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Add generated_by column to posts to track AI-generated content
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS generated_by TEXT;
-- Values: NULL (manual), 'anthropic-api' (AI generated)
