import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const UNSPLASH_ACCESS_KEY = Deno.env.get("UNSPLASH_ACCESS_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function generateSlug(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").trim().slice(0, 80);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (!ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not configured in Supabase secrets" }), { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const body = await req.json().catch(() => ({}));
    let { topic, tone = "professional", category = "Business", auto_publish = false, scheduled = false } = body;

    if (scheduled) {
      const { data: config } = await supabase.from("blog_generation_config").select("*").limit(1).single();
      if (!config) return new Response(JSON.stringify({ message: "No config found" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const queue: string[] = config.topics_queue ?? [];
      if (queue.length === 0) return new Response(JSON.stringify({ message: "Queue empty" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      topic = queue[0]; tone = config.tone ?? "professional"; category = config.default_category ?? "Business"; auto_publish = config.auto_publish ?? false;
      await supabase.from("blog_generation_config").update({ topics_queue: queue.slice(1) }).eq("id", config.id);
    }

    if (!topic) return new Response(JSON.stringify({ error: "topic is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: job } = await supabase.from("blog_generation_jobs").insert({ topic, status: "running", scheduled_for: scheduled ? new Date().toISOString() : null }).select().single();
    const jobId = job?.id;

    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 4000,
        messages: [{ role: "user", content: `You are an expert content writer for Digiiworks, a web agency specialising in AI automation, web development, SEO and digital marketing based in South Africa and Thailand.\n\nWrite a professional blog post about: ${topic}\nTone: ${tone}\nCategory: ${category}\n\nIMPORTANT: Return ONLY valid JSON with no markdown code blocks, no backticks, no extra text. Just the raw JSON object:\n{\n  "title": "engaging SEO-friendly title",\n  "slug": "url-slug-with-hyphens",\n  "excerpt": "1-2 sentence compelling description for meta tag and preview cards",\n  "content": "<h2>First Section</h2><p>Opening paragraph...</p>",\n  "tags": ["tag1", "tag2", "tag3"],\n  "image_search_query": "3-5 word descriptive search term for relevant stock photo"\n}\n\nRequirements:\n- Post should be 800-1200 words\n- Use h2 and h3 headings\n- Keep paragraphs short (2-4 sentences)\n- Include practical actionable insights\n- Naturally mention Digiiworks services where relevant\n- Tags from: Web Development, AI Automation, SEO, UX Design, Digital Marketing, Technology, Performance, Business` }],
      }),
    });

    if (!claudeRes.ok) {
      const errText = await claudeRes.text();
      if (jobId) await supabase.from("blog_generation_jobs").update({ status: "failed", error: errText, completed_at: new Date().toISOString() }).eq("id", jobId);
      throw new Error(`Claude API error ${claudeRes.status}: ${errText}`);
    }

    const claudeData = await claudeRes.json();
    const rawContent = claudeData.content?.[0]?.text ?? "";
    let parsed: any;
    try {
      parsed = JSON.parse(rawContent.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim());
    } catch (e) {
      if (jobId) await supabase.from("blog_generation_jobs").update({ status: "failed", error: `JSON parse error: ${String(e)}`, completed_at: new Date().toISOString() }).eq("id", jobId);
      throw new Error(`Failed to parse Claude response as JSON: ${rawContent.slice(0, 300)}`);
    }

    let slug = generateSlug(parsed.slug || parsed.title);
    const { data: existingSlug } = await supabase.from("posts").select("id").eq("slug", slug).maybeSingle();
    if (existingSlug) slug = `${slug}-${Date.now()}`;

    let featured_image: string | null = null;
    if (UNSPLASH_ACCESS_KEY && parsed.image_search_query) {
      try {
        const unsplashRes = await fetch(`https://api.unsplash.com/photos/random?query=${encodeURIComponent(parsed.image_search_query)}&orientation=landscape&content_filter=high`, { headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` } });
        if (unsplashRes.ok) { const imgData = await unsplashRes.json(); featured_image = imgData.urls?.regular ?? null; }
      } catch { /* post still created without image */ }
    }

    const { data: post, error: postError } = await supabase.from("posts").insert({ title: parsed.title, slug, content: parsed.content, excerpt: parsed.excerpt, featured_image, tags: parsed.tags ?? [], status: auto_publish ? "published" : "draft", generated_by: "anthropic-api" }).select().single();
    if (postError) {
      if (jobId) await supabase.from("blog_generation_jobs").update({ status: "failed", error: postError.message, completed_at: new Date().toISOString() }).eq("id", jobId);
      throw new Error(`Failed to save post: ${postError.message}`);
    }

    if (jobId) await supabase.from("blog_generation_jobs").update({ status: "completed", post_id: post.id, completed_at: new Date().toISOString() }).eq("id", jobId);

    return new Response(JSON.stringify({ post_id: post.id, title: post.title, slug: post.slug, status: post.status, featured_image: post.featured_image }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error("generate-blog-post error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
