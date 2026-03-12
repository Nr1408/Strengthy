import { serve } from "https://deno.land/std@0.203.0/http/server.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
// Force a permissive CORS fallback to avoid preflight failures caused by
// misconfigured ALLOWED_ORIGIN values in project secrets. During development
// it's safe to allow any origin; for strict production, set a precise
// ALLOWED_ORIGIN in Supabase secrets and remove the forced fallback below.
const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") || "*";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  // Include common Supabase headers that clients send so preflight passes.
  "Access-Control-Allow-Headers": "Authorization, Content-Type, apikey, x-client-info",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (!SUPABASE_URL || !SERVICE_ROLE) {
    return new Response(
      JSON.stringify({ error: "Server not configured" }),
      { status: 500, headers: { "Content-Type": "application/json", ...CORS_HEADERS } },
    );
  }

  const auth = req.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer ")) {
    return new Response(
      JSON.stringify({ error: "Missing or invalid Authorization header" }),
      { status: 401, headers: { "Content-Type": "application/json", ...CORS_HEADERS } },
    );
  }

  const userToken = auth.split(" ")[1];

  // Validate token and get user info
  const userResp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${userToken}`, apikey: userToken },
  });

  if (!userResp.ok) {
    const text = await userResp.text();
    return new Response(JSON.stringify({ error: "Invalid user token", detail: text }), {
      status: 401,
      headers: { "Content-Type": "application/json", ...CORS_HEADERS },
    });
  }

  const userData = await userResp.json();
  const userId = userData?.id || userData?.user?.id;
  if (!userId) {
    return new Response(JSON.stringify({ error: "Could not determine user id" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...CORS_HEADERS },
    });
  }

  // Delete user via Supabase Admin REST API
  const delResp = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${SERVICE_ROLE}`, apikey: SERVICE_ROLE },
  });

  if (!delResp.ok) {
    const text = await delResp.text();
    return new Response(JSON.stringify({ error: "Failed to delete user", detail: text }), {
      status: delResp.status || 500,
      headers: { "Content-Type": "application/json", ...CORS_HEADERS },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
});
