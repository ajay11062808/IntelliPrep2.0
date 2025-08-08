// @ts-nocheck
// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.1"

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { ...cors(), "Access-Control-Allow-Methods": "*" } })
  }
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || Deno.env.get("My_SUPABASE_URL")
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("My_SUPABASE_ANON_KEY")
    if (!supabaseUrl || !supabaseAnon) {
      return j({ status: "error", error: "missing_env" })
    }
    const supabase = createClient(supabaseUrl, supabaseAnon, {
      global: {
        headers: { Authorization: req.headers.get("Authorization") ?? "" },
      },
    })

    // Derive user from JWT, fallback to body.user_id
    const { data: authData } = await supabase.auth.getUser()
    let user_id = authData?.user?.id
    let body: any = {}
    try { body = await req.json() } catch {}
    if (!user_id) user_id = body?.user_id
    if (!user_id) {
      return j({ status: "unauthorized" })
    }

    // Load profile
    const today = new Date().toISOString().slice(0, 10)
    let retries = 0
    while (true) {
      const { data: profile, error: pErr } = await supabase
        .from("profiles")
        .select("id,is_premium,ai_usage_count,ai_usage_date")
        .eq("id", user_id)
        .single()
      if (pErr || !profile) return j({ status: "error", error: "profile_not_found" })

      const limit = profile.is_premium ? 100 : 10
      const storedDate = typeof profile.ai_usage_date === "string"
        ? profile.ai_usage_date.split("T")[0]
        : (profile.ai_usage_date ? new Date(profile.ai_usage_date as any).toISOString().slice(0, 10) : today)
      const count = storedDate === today ? (profile.ai_usage_count || 0) : 0

      if (count >= limit) {
        return j({ status: "limit_exceeded", limit })
      }

      // Compare-and-swap style guarded update
      const { data: updated, error: updErr } = await supabase
        .from("profiles")
        .update({ ai_usage_count: count + 1, ai_usage_date: today })
        .eq("id", user_id)
        .eq("ai_usage_count", storedDate === today ? (profile.ai_usage_count || 0) : (profile.ai_usage_count ?? null))
        .select("ai_usage_count")
        .single()

      if (!updErr && updated) {
        const used = updated.ai_usage_count || 0
        return j({ status: "ok", remaining: Math.max(0, limit - used) })
      }

      // If update failed due to race, retry once
      retries += 1
      if (retries > 1) {
        // Fallback: re-check; if now at/over limit, report; else return generic error
        const { data: p2 } = await supabase
          .from("profiles")
          .select("ai_usage_count, ai_usage_date, is_premium")
          .eq("id", user_id)
          .single()
        const limit2 = p2?.is_premium ? 100 : 10
        const d2 = typeof p2?.ai_usage_date === "string" ? p2?.ai_usage_date.split("T")[0] : today
        const c2 = d2 === today ? (p2?.ai_usage_count || 0) : 0
        if (c2 >= limit2) {
          return j({ status: "limit_exceeded", limit: limit2 })
        }
        return j({ status: "error", error: "update_conflict" })
      }
    }
  } catch (e: any) {
    return j({ status: "error", error: e?.message || "internal" })
  }
})

function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  }
}

function j(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(), "Content-Type": "application/json; charset=utf-8" },
  })
}


