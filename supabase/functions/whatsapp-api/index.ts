import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function backendFetch(url: string, options?: RequestInit) {
  console.log(`[wa-proxy] → ${options?.method || "GET"} ${url}`);
  let res: Response;
  try {
    res = await fetch(url, options);
  } catch (e) {
    console.error(`[wa-proxy] Network error fetching ${url}:`, e);
    throw new Error(`Cannot reach backend at ${url}: ${e}`);
  }

  const text = await res.text();
  console.log(`[wa-proxy] ← ${res.status} (${text.length} bytes) ${text.slice(0, 200)}`);

  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(
      `Backend returned non-JSON (HTTP ${res.status}). First 200 chars: ${text.slice(0, 200)}`
    );
  }

  return { data, status: res.status, ok: res.ok };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get user from token
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error("[wa-proxy] Auth error:", userError);
      return json({ error: "Unauthorized" }, 401);
    }
    const userId = user.id;

    const { data: orgId } = await supabase.rpc("get_user_organization_id", {
      _user_id: userId,
    });
    if (!orgId) return json({ error: "No organization found" }, 403);

    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    const action = pathParts[1] || "";
    const param = pathParts[2] || "";

    const BACKEND = (Deno.env.get("WHATSAPP_BACKEND_URL") || "").replace(/\/+$/, "");
    if (!BACKEND) return json({ error: "WHATSAPP_BACKEND_URL not configured" }, 500);

    console.log(`[wa-proxy] action=${action} param=${param} method=${req.method} backend=${BACKEND}`);

    switch (action) {
      case "sessions": {
        // POST /sessions → create session via POST /api/sessions/:id
        if (req.method === "POST" && !param) {
          const body = await req.json();
          const sessionId = body.sessionId || `org_${orgId}_${Date.now()}`;

          const { data } = await backendFetch(`${BACKEND}/api/sessions/${sessionId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });

          await supabase.from("wa_sessions").upsert(
            {
              session_id: sessionId,
              organization_id: orgId,
              status: "connecting",
              name: body.name || sessionId,
            },
            { onConflict: "session_id" }
          );

          return json({ sessionId, ...(data as object) });
        }

        // GET /sessions/:id → status
        if (req.method === "GET" && param) {
          const { data } = await backendFetch(`${BACKEND}/api/sessions/${param}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
          });
          return json(data);
        }

        // DELETE /sessions/:id
        if (req.method === "DELETE" && param) {
          const { data } = await backendFetch(`${BACKEND}/api/sessions/${param}`, {
            method: "DELETE",
          });

          await supabase
            .from("wa_sessions")
            .update({ status: "disconnected" })
            .eq("session_id", param)
            .eq("organization_id", orgId);

          return json(data);
        }

        // GET /sessions → list from DB
        if (req.method === "GET" && !param) {
          const { data: sessions } = await supabase
            .from("wa_sessions")
            .select("*")
            .eq("organization_id", orgId)
            .order("created_at", { ascending: false });
          return json({ sessions });
        }

        return json({ error: "Invalid sessions endpoint" }, 400);
      }

      case "qr": {
        if (req.method === "GET" && param) {
          const { data } = await backendFetch(`${BACKEND}/api/sessions/${param}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
          });
          return json(data);
        }
        return json({ error: "Session ID required" }, 400);
      }

      case "send": {
        if (req.method === "POST") {
          const body = await req.json();
          const { sessionId, to, text, ...rest } = body;

          if (!sessionId || !to) {
            return json({ error: "sessionId and to are required" }, 400);
          }

          const { data } = await backendFetch(`${BACKEND}/api/sessions/${sessionId}/send`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ to, text, ...rest }),
          });

          const respData = data as Record<string, unknown>;
          const messageId =
            (respData?.key as Record<string, string>)?.id || `out_${Date.now()}`;

          await supabase.from("wa_messages").insert({
            message_id: messageId,
            session_id: sessionId,
            organization_id: orgId,
            from_me: true,
            recipient_phone: to,
            body: text || null,
            message_type: "text",
            status: "sent",
            timestamp: new Date().toISOString(),
          });

          return json(data);
        }
        return json({ error: "POST required" }, 405);
      }

      default:
        return json({ error: `Unknown action: ${action}` }, 404);
    }
  } catch (err) {
    console.error("[wa-proxy] Error:", err);
    return json({ error: String(err) }, 502);
  }
});
