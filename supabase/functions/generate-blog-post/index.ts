import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const UNSPLASH_ACCESS_KEY = Deno.env.get("UNSPLASH_ACCESS_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("BASE_URL") || "https://digiiworks.lovable.app",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim()
    .slice(0, 80);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({ error: "ANTHROPIC_API_KEY not configured in Supabase secrets" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Parse request body
    const body = await req.json().catch(() => ({}));
    let { topic, tone = "professional", category = "Business", auto_publish = false, scheduled = false } = body;

    // If scheduled=true, pull the next topic from blog_generation_config
    if (scheduled) {
      const { data: config } = await supabase
        .from("blog_generation_config")
        .select("*")
        .limit(1)
        .single();

      if (!config) {
        return new Response(
          JSON.stringify({ message: "No blog generation config found" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const queue: string[] = config.topics_queue ?? [];
      if (queue.length === 0) {
        return new Response(
          JSON.stringify({ message: "Topics queue is empty — add topics in Blog AI settings" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      topic = queue[0];
      tone = config.tone ?? "professional";
      category = config.default_category ?? "Business";
      auto_publish = config.auto_publish ?? false;

      // Remove consumed topic from queue
      await supabase
        .from("blog_generation_config")
        .update({ topics_queue: queue.slice(1) })
        .eq("id", config.id);
    }

    if (!topic) {
      return new Response(
        JSON.stringify({ error: "topic is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log the generation job
    const { data: job } = await supabase
      .from("blog_generation_jobs")
      .insert({ topic, status: "running", scheduled_for: scheduled ? new Date().toISOString() : null })
      .select()
      .single();

    const jobId = job?.id;

    // Call Claude API
    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 4000,
        messages: [
          {
            role: "user",
            content: `You are an expert content writer for Digiiworks, a web agency specialising in AI automation, web development, SEO and digital marketing based in South Africa and Thailand.

Write a professional blog post about: ${topic}
Tone: ${tone}
Category: ${category}

IMPORTANT: Return ONLY valid JSON with no markdown code blocks, no backticks, no extra text. Just the raw JSON object:
{
  "title": "engaging SEO-friendly title",
  "slug": "url-slug-with-hyphens",
  "excerpt": "1-2 sentence compelling description for meta tag and preview cards",
  "content": "<h2>First Section</h2><p>Opening paragraph...</p><h2>Second Section</h2><p>...</p>",
  "tags": ["tag1", "tag2", "tag3"],
  "image_search_query": "3-5 word descriptive search term for relevant stock photo"
}

Requirements:
- Post should be 800-1200 words of substantive content
- Use h2 and h3 headings to structure content
- Keep paragraphs short (2-4 sentences)
- Include practical actionable insights
- Naturally mention Digiiworks' services where relevant
- Tags should be the exact category name from this list: Web Development, AI Automation, SEO, UX Design, Digital Marketing, Technology, Performance, Business`,
          },
        ],
      }),
    });

    if (!claudeRes.ok) {
      const errText = await claudeRes.text();
      if (jobId) {
        await supabase.from("blog_generation_jobs").update({ status: "failed", error: errText, completed_at: new Date().toISOString() }).eq("id", jobId);
      }
      throw new Error(`Claude API error ${claudeRes.status}: ${errText}`);
    }

    const claudeData = await claudeRes.json();
    const rawContent = claudeData.content?.[0]?.text ?? "";

    // Parse JSON from Claude response
    let parsed: { title: string; slug: string; excerpt: string; content: string; tags: string[]; image_search_query: string };
    try {
      // Strip any accidental markdown backticks
      const cleaned = rawContent.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
      parsed = JSON.parse(cleaned);
    } catch (e) {
      if (jobId) {
        await supabase.from("blog_generation_jobs").update({ status: "failed", error: `JSON parse error: ${String(e)}`, completed_at: new Date().toISOString() }).eq("id", jobId);
      }
      throw new Error(`Failed to parse Claude response as JSON: ${rawContent.slice(0, 300)}`);
    }

    // Ensure unique slug
    let slug = generateSlug(parsed.slug || parsed.title);
    const { data: existingSlug } = await supabase.from("posts").select("id").eq("slug", slug).maybeSingle();
    if (existingSlug) {
      slug = `${slug}-${Date.now()}`;
    }

    // Fetch image from Unsplash
    let featured_image: string | null = null;
    if (UNSPLASH_ACCESS_KEY && parsed.image_search_query) {
      try {
        const unsplashRes = await fetch(
          `https://api.unsplash.com/photos/random?query=${encodeURIComponent(parsed.image_search_query)}&orientation=landscape&content_filter=high`,
          { headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` } }
        );
        if (unsplashRes.ok) {
          const imgData = await unsplashRes.json();
          featured_image = imgData.urls?.regular ?? null;
        }
      } catch {
        // Image fetch failed — post still created without image
      }
    }

    // Save post to database
    const { data: post, error: postError } = await supabase
      .from("posts")
      .insert({
        title: parsed.title,
        slug,
        content: parsed.content,
        excerpt: parsed.excerpt,
        featured_image,
        tags: parsed.tags ?? [],
        status: auto_publish ? "published" : "draft",
        generated_by: "anthropic-api",
      })
      .select()
      .single();

    if (postError) {
      if (jobId) {
        await supabase.from("blog_generation_jobs").update({ status: "failed", error: postError.message, completed_at: new Date().toISOString() }).eq("id", jobId);
      }
      throw new Error(`Failed to save post: ${postError.message}`);
    }

    // Update job record
    if (jobId) {
      await supabase.from("blog_generation_jobs").update({
        status: "completed",
        post_id: post.id,
        completed_at: new Date().toISOString(),
      }).eq("id", jobId);
    }

    return new Response(
      JSON.stringify({
        post_id: post.id,
        title: post.title,
        slug: post.slug,
        status: post.status,
        featured_image: post.featured_image,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("generate-blog-post error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
