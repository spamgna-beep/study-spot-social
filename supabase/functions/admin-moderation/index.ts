import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.98.0/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const anonClient = createClient(supabaseUrl, anonKey);
    const { data: { user }, error: authErr } = await anonClient.auth.getUser(token);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceKey);

    // Check admin role
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Not admin" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action, target_user_id } = body;

    if (!target_user_id || !action) {
      return new Response(JSON.stringify({ error: "Missing action or target_user_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "ban") {
      const { banned_until, ban_reason } = body;
      await adminClient.from("profiles").update({
        banned_until: banned_until || null,
        ban_reason: ban_reason || null,
      }).eq("user_id", target_user_id);

      // Also end their active check-ins
      await adminClient.from("check_ins").update({
        is_active: false, ended_at: new Date().toISOString(),
      }).eq("user_id", target_user_id).eq("is_active", true);

      return new Response(JSON.stringify({ ok: true, action: "banned" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "unban") {
      await adminClient.from("profiles").update({
        banned_until: null, ban_reason: null,
      }).eq("user_id", target_user_id);

      return new Response(JSON.stringify({ ok: true, action: "unbanned" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete") {
      // Delete user data in order
      await adminClient.from("check_ins").delete().eq("user_id", target_user_id);
      await adminClient.from("friendships").delete().or(`requester_id.eq.${target_user_id},addressee_id.eq.${target_user_id}`);
      await adminClient.from("user_purchases").delete().eq("user_id", target_user_id);
      await adminClient.from("study_sessions").delete().eq("user_id", target_user_id);
      await adminClient.from("weekly_leaderboard_rewards").delete().eq("user_id", target_user_id);
      await adminClient.from("lore_drops").delete().eq("author_id", target_user_id);
      await adminClient.from("user_roles").delete().eq("user_id", target_user_id);
      await adminClient.from("profiles").delete().eq("user_id", target_user_id);

      // Delete auth user
      await adminClient.auth.admin.deleteUser(target_user_id);

      return new Response(JSON.stringify({ ok: true, action: "deleted" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
