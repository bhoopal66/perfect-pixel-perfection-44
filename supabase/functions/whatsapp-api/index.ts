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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // --- Auth ---
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

  // Get user's organization
  const { data: orgId } = await supabase.rpc("get_user_organization_id", {
    _user_id: userId,
  });
  if (!orgId) {
    return json({ error: "No organization found" }, 403);
  }

  // --- Routing ---
  const url = new URL(req.url);
  const pathParts = url.pathname.split("/").filter(Boolean);
  // Edge function URL: /whatsapp-api/<action>[/<param>]
  // pathParts[0] = "whatsapp-api", pathParts[1] = action, pathParts[2] = param
  const action = pathParts[1] || "";
  const param = pathParts[2] || "";

  const BACKEND = Deno.env.get("WHATSAPP_BACKEND_URL")!;

  try {
    switch (action) {
      // ---- Session Management ----
      case "sessions": {
        if (req.method === "POST" && !param) {
          // Create session: POST /sessions/create
          const body = await req.json();
          const sessionId = body.sessionId || `org_${orgId}_${Date.now()}`;

          const res = await fetch(`${BACKEND}/sessions/create`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId, ...body }),
          });
          const data = await res.json();

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

          return json({ sessionId, ...data });
        }

        if (req.method === "GET" && param) {
          // Get session status: GET /sessions/:id/status
          const res = await fetch(`${BACKEND}/sessions/${param}/status`);
          const data = await res.json();
          return json(data);
        }

        if (req.method === "DELETE" && param) {
          // Delete session: DELETE /sessions/:id
          const res = await fetch(`${BACKEND}/sessions/${param}`, {
            method: "DELETE",
          });
          const data = await res.json();

          // Update DB
          await supabase
            .from("wa_sessions")
            .update({ status: "disconnected" })
            .eq("session_id", param)
            .eq("organization_id", orgId);

          return json(data);
        }

        // List sessions for org
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

      // ---- QR Code ----
      case "qr": {
        if (req.method === "GET" && param) {
          // GET /sessions/:id/qr
          const res = await fetch(`${BACKEND}/sessions/${param}/qr`);
          const data = await res.json();
          return json(data);
        }
        return json({ error: "Session ID required" }, 400);
      }

      // ---- Send Message ----
      case "send": {
        if (req.method === "POST") {
          const body = await req.json();
          // POST /chats/send
          const res = await fetch(`${BACKEND}/chats/send`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          const data = await res.json();

          // Store outbound message in wa_messages
          if (data.key?.id) {
            await supabase.from("wa_messages").insert({
              message_id: data.key.id,
              session_id: body.sessionId,
              organization_id: orgId,
              from_me: true,
              sender_phone: data.key?.participant || null,
              recipient_phone: body.to,
              body: body.text || body.caption || null,
              message_type: body.type || "text",
              status: "sent",
              timestamp: new Date().toISOString(),
            });
          }

          return json(data);
        }
        return json({ error: "POST required" }, 405);
      }

      // ---- Contacts / Chats from backend ----
      case "chats": {
        if (req.method === "GET" && param) {
          // GET /chats/:sessionId
          const res = await fetch(`${BACKEND}/chats/${param}`);
          const data = await res.json();
          return json(data);
        }
        return json({ error: "Session ID required" }, 400);
      }

      default:
        return json({ error: `Unknown action: ${action}` }, 404);
    }
  } catch (err) {
    console.error("WhatsApp API proxy error:", err);
    return json({ error: "Internal server error", details: String(err) }, 500);
  }
});
