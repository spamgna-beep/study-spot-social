import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.98.0/cors";

function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day;
  const start = new Date(now.getFullYear(), now.getMonth(), diff);
  start.setHours(0, 0, 0, 0);
  return start.toISOString().slice(0, 10);
}

function getPreviousWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day - 7;
  const start = new Date(now.getFullYear(), now.getMonth(), diff);
  start.setHours(0, 0, 0, 0);
  return start.toISOString().slice(0, 10);
}

const REWARD_TIERS = [
  { rank: 1, coins: 50 },
  { rank: 2, coins: 30 },
  { rank: 3, coins: 20 },
  { rank: 4, coins: 10 },
  { rank: 5, coins: 5 },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const prevWeekStart = getPreviousWeekStart();
    const currentWeekStart = getWeekStart();

    // Check if rewards already given for previous week
    const { data: existing } = await supabase
      .from("weekly_leaderboard_rewards")
      .select("id")
      .eq("week_start", prevWeekStart)
      .limit(1);

    if (existing && existing.length > 0) {
      return new Response(JSON.stringify({ status: "already_awarded" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only award if we're in a new week (Sunday has passed)
    const now = new Date();
    const prevWeekEnd = new Date(currentWeekStart + "T00:00:00Z");
    if (now < prevWeekEnd) {
      return new Response(JSON.stringify({ status: "week_not_over" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get study sessions from previous week
    const prevWeekEndStr = currentWeekStart + "T00:00:00Z";
    const prevWeekStartStr = prevWeekStart + "T00:00:00Z";

    const { data: sessions } = await supabase
      .from("study_sessions")
      .select("user_id, duration_seconds")
      .gte("created_at", prevWeekStartStr)
      .lt("created_at", prevWeekEndStr);

    if (!sessions || sessions.length === 0) {
      return new Response(JSON.stringify({ status: "no_sessions" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Aggregate
    const totals: Record<string, number> = {};
    const MAX = 43200;
    for (const s of sessions) {
      const clamped = Math.max(0, Math.min(s.duration_seconds || 0, MAX));
      totals[s.user_id] = (totals[s.user_id] || 0) + clamped;
    }

    const sorted = Object.entries(totals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    // Award coins
    for (let i = 0; i < sorted.length && i < REWARD_TIERS.length; i++) {
      const [userId] = sorted[i];
      const tier = REWARD_TIERS[i];

      await supabase
        .from("weekly_leaderboard_rewards")
        .insert({
          user_id: userId,
          week_start: prevWeekStart,
          rank: tier.rank,
          coins_awarded: tier.coins,
        });

      // Add coins to profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("study_coins")
        .eq("user_id", userId)
        .single();

      if (profile) {
        await supabase
          .from("profiles")
          .update({ study_coins: (profile.study_coins || 0) + tier.coins })
          .eq("user_id", userId);
      }
    }

    return new Response(JSON.stringify({ status: "awarded", count: sorted.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
