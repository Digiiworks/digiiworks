import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SITE = "https://digiiworks.co";

const STATIC_ROUTES: { loc: string; changefreq: string; priority: string }[] = [
  { loc: "/", changefreq: "weekly", priority: "1.0" },
  { loc: "/services", changefreq: "monthly", priority: "0.9" },
  { loc: "/ai", changefreq: "monthly", priority: "0.9" },
  { loc: "/blog", changefreq: "daily", priority: "0.8" },
  { loc: "/contact", changefreq: "monthly", priority: "0.7" },
  { loc: "/get-started", changefreq: "monthly", priority: "0.7" },
  { loc: "/privacy", changefreq: "yearly", priority: "0.3" },
  { loc: "/terms", changefreq: "yearly", priority: "0.3" },
  // Service detail pages
  { loc: "/services/custom-web-development", changefreq: "monthly", priority: "0.8" },
  { loc: "/services/responsive-design", changefreq: "monthly", priority: "0.8" },
  { loc: "/services/ux-ui-design", changefreq: "monthly", priority: "0.8" },
  { loc: "/services/cms-integration", changefreq: "monthly", priority: "0.8" },
  { loc: "/services/rent-a-website", changefreq: "monthly", priority: "0.8" },
  { loc: "/services/data-driven-seo", changefreq: "monthly", priority: "0.8" },
  { loc: "/services/performance-optimization", changefreq: "monthly", priority: "0.8" },
  { loc: "/services/google-social-media-ads", changefreq: "monthly", priority: "0.8" },
  { loc: "/services/market-competitor-research", changefreq: "monthly", priority: "0.8" },
  { loc: "/services/ai-powered-social-media", changefreq: "monthly", priority: "0.8" },
  { loc: "/services/n8n-workflow-automation", changefreq: "monthly", priority: "0.8" },
  { loc: "/services/content-strategy", changefreq: "monthly", priority: "0.8" },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: posts } = await supabase
      .from("posts")
      .select("slug, updated_at")
      .eq("status", "published")
      .order("created_at", { ascending: false });

    const urlEntries = STATIC_ROUTES.map(
      (r) =>
        `  <url>\n    <loc>${SITE}${r.loc}</loc>\n    <changefreq>${r.changefreq}</changefreq>\n    <priority>${r.priority}</priority>\n  </url>`
    );

    if (posts) {
      for (const post of posts) {
        const lastmod = post.updated_at
          ? `\n    <lastmod>${post.updated_at.split("T")[0]}</lastmod>`
          : "";
        urlEntries.push(
          `  <url>\n    <loc>${SITE}/blog/${post.slug}</loc>${lastmod}\n    <changefreq>weekly</changefreq>\n    <priority>0.6</priority>\n  </url>`
        );
      }
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlEntries.join("\n")}\n</urlset>`;

    return new Response(xml, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("generate-sitemap error:", error);
    return new Response(`<?xml version="1.0" encoding="UTF-8"?><error>An unexpected error occurred.</error>`, {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/xml" },
    });
  }
});
