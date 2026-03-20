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
  console.log(`[whatsapp-api] → ${options?.method || "GET"} ${url}`);
  const res = await fetch(url, options);
  const text = await res.text();

  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    console.error(`[whatsapp-api] Non-JSON (${res.status}): ${text.slice(0, 300)}`);
    throw new Error(`Backend returned non-JSON (HTTP ${res.status}). Check WHATSAPP_BACKEND_URL and endpoint path.`);
  }

  return { data, status: res.status, ok: res.ok };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ error: "Unauthorized" }, 401);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims(token);
  if (claimsError || !claimsData?.claims) {
    return json({ error: "Unauthorized" }, 401);
  }
  const userId = claimsData.claims.sub as string;

  const { data: orgId } = await supabase.rpc("get_user_organization_id", {
    _user_id: userId,
  });
  if (!orgId) return json({ error: "No organization found" }, 403);

  const url = new URL(req.url);
  const pathParts = url.pathname.split("/").filter(Boolean);
  // /whatsapp-api/<action>[/<param>]
  const action = pathParts[1] || "";
  const param = pathParts[2] || "";

  const BACKEND = (Deno.env.get("WHATSAPP_BACKEND_URL") || "").replace(/\/+$/, "");
  if (!BACKEND) return json({ error: "WHATSAPP_BACKEND_URL not configured" }, 500);

  try {
    switch (action) {
      // ---- Create session + get QR: POST /api/sessions/:id ----
      case "sessions": {
        if (req.method === "POST" && !param) {
          const body = await req.json();
          const sessionId = body.sessionId || `org_${orgId}_${Date.now()}`;

          // Your backend: POST /api/sessions/:sessionId
          const { data } = await backendFetch(`${BACKEND}/api/sessions/${sessionId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });

          // Upsert session in DB
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

        // Get session status: GET /api/sessions/:id (or /api/sessions/:id/status)
        if (req.method === "GET" && param) {
          try {
            const { data } = await backendFetch(`${BACKEND}/api/sessions/${param}/status`);
            return json(data);
          } catch {
            // Fallback: try without /status
            const { data } = await backendFetch(`${BACKEND}/api/sessions/${param}`);
            return json(data);
          }
        }

        // Delete session
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

        // List sessions from DB
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

      // ---- QR Code: POST /api/sessions/:id (same as create, returns QR) ----
      case "qr": {
        if (req.method === "GET" && param) {
          // Re-call the session endpoint to get current QR
          const { data } = await backendFetch(`${BACKEND}/api/sessions/${param}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
          });
          return json(data);
        }
        return json({ error: "Session ID required" }, 400);
      }

      // ---- Send Message: POST /api/sessions/:id/send ----
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

          // Store outbound message in wa_messages
          const respData = data as Record<string, unknown>;
          const messageId = (respData?.key as Record<string, string>)?.id || 
                           `out_${Date.now()}`;

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
    console.error("WhatsApp API proxy error:", err);
    return json({ error: String(err) }, 502);
  }
});
