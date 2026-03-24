import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("BASE_URL") || "https://digiiworks.lovable.app",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller is admin
    const callerClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: isAdmin } = await adminClient.rpc("has_role", {
      _user_id: caller.id,
      _role: "admin",
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, display_name, phone, company, address, currency, existing_user_id, cc_emails } = await req.json();

    let userId: string;
    let resetEmailSent = false;
    let resetError: string | null = null;

    if (existing_user_id) {
      // Link new company to existing user — skip auth creation
      userId = existing_user_id;

      // Ensure client role exists
      await adminClient
        .from("user_roles")
        .upsert({ user_id: userId, role: "client" }, { onConflict: "user_id,role" });
    } else {
      // Create new auth user
      if (!email) {
        return new Response(JSON.stringify({ error: "Email is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const randomPassword = crypto.randomUUID() + "Aa1!";
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password: randomPassword,
        email_confirm: true,
        user_metadata: { display_name: display_name || email.split("@")[0] },
      });

      if (createError) {
        // If user already exists, return a hint so the UI can offer to link
        if (createError.message.includes("already been registered") || createError.message.includes("already exists")) {
          // Look up the existing user
          const { data: { users } } = await adminClient.auth.admin.listUsers();
          const existingUser = users?.find((u: any) => u.email === email);
          return new Response(JSON.stringify({
            error: "user_exists",
            message: `A user with email ${email} already exists. You can link a new company to this user.`,
            existing_user_id: existingUser?.id ?? null,
            existing_display_name: existingUser?.user_metadata?.display_name ?? null,
          }), {
            status: 409,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ error: createError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      userId = newUser.user.id;

      // Update profile with extra details (trigger already creates profile + client role)
      await adminClient
        .from("profiles")
        .update({
          phone: phone || null,
          company: company || null,
          address: address || null,
          display_name: display_name || null,
          currency: currency || "USD",
        })
        .eq("user_id", userId);

      // Send password reset email
      const { error: rstError } = await adminClient.auth.resetPasswordForEmail(email, {
        redirectTo: `${req.headers.get("origin") || supabaseUrl}/reset-password`,
      });
      resetEmailSent = !rstError;
      resetError = rstError?.message || null;
    }

    // Create the client_companies record
    const { data: companyRow, error: companyError } = await adminClient
      .from("client_companies")
      .insert({
        user_id: userId,
        company_name: company || display_name || email || "Unnamed",
        address: address || null,
        currency: currency || "USD",
        phone: phone || null,
        cc_emails: cc_emails || [],
      })
      .select("id")
      .single();

    return new Response(JSON.stringify({
      success: true,
      user_id: userId,
      client_company_id: companyRow?.id ?? null,
      reset_email_sent: resetEmailSent,
      reset_error: resetError,
      company_error: companyError?.message || null,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("create-client error:", err);
    return new Response(JSON.stringify({ error: "An unexpected error occurred. Please try again." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
