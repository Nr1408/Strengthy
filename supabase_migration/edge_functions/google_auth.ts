// Supabase Edge Function (TypeScript) - google_auth
// Purpose: accept `{ credential: idToken }` POSTed from the SPA and
// verify it with Google, then upsert a `profiles` row via the Supabase
// REST API using the service role key and return a signed JWT the client
// can use as a Bearer token for requests during migration/testing.

// WARNING: This function issues custom JWTs (HS256) signed with the
// `SUPABASE_JWT_SECRET`. This is intended only for migration/testing and
// requires careful security review before production use. Prefer
// Supabase's built-in OAuth/GoTrue session flows for production.

import { serve } from 'std/server'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE') || ''
const SUPABASE_JWT_SECRET = Deno.env.get('SUPABASE_JWT_SECRET') || ''

async function verifyGoogleIdToken(idToken: string) {
  const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`)
  if (!res.ok) throw new Error('Invalid Google id token')
  return await res.json()
}

async function ensureProfile(email: string, name?: string) {
  // Lookup by email
  const url = `${SUPABASE_URL.replace(/\/+$/,'')}/rest/v1/profiles?select=*&email=eq.${encodeURIComponent(email)}`
  const r = await fetch(url, { headers: { apikey: SUPABASE_SERVICE_ROLE, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}` } })
  if (r.ok) {
    const j = await r.json().catch(() => [])
    if (Array.isArray(j) && j.length > 0) return j[0]
  }

  // Insert minimal profile row; adapt keys to your schema if necessary
  const insertUrl = `${SUPABASE_URL.replace(/\/+$/,'')}/rest/v1/profiles`
  const ins = await fetch(insertUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_SERVICE_ROLE,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}`,
      Prefer: 'return=representation',
    },
    body: JSON.stringify({ email, full_name: name }),
  })
  if (!ins.ok) {
    // Non-fatal for issuing a token; log and continue
    try { const txt = await ins.text(); console.error('profile insert failed', txt); } catch (e) {}
    return null
  }
  return await ins.json().catch(() => null)
}

function base64UrlEncode(buf: Uint8Array) {
  let s = ''
  for (let i = 0; i < buf.length; i++) s += String.fromCharCode(buf[i])
  const b64 = btoa(s)
  return b64.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

async function signJwt(header: Record<string, any>, payload: Record<string, any>, secret: string) {
  const encoder = new TextEncoder()
  const headerStr = base64UrlEncode(encoder.encode(JSON.stringify(header)))
  const payloadStr = base64UrlEncode(encoder.encode(JSON.stringify(payload)))
  const toSign = `${headerStr}.${payloadStr}`
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(toSign))
  const sigBytes = new Uint8Array(sig as ArrayBuffer)
  const sigStr = base64UrlEncode(sigBytes)
  return `${toSign}.${sigStr}`
}

serve(async (req: Request) => {
  try {
    if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 })
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE || !SUPABASE_JWT_SECRET) {
      return new Response(JSON.stringify({ error: 'missing supabase env vars' }), { status: 500 })
    }

    const body = await req.json().catch(() => ({}))
    const credential = body && body.credential
    if (!credential) return new Response(JSON.stringify({ detail: 'Missing credential' }), { status: 400 })

    const info = await verifyGoogleIdToken(String(credential))
    const email = info.email
    const name = info.name || info.given_name || null
    const sub = info.sub || null
    if (!email) return new Response(JSON.stringify({ detail: 'Google token missing email' }), { status: 400 })

    // Ensure a profile row exists (best-effort)
    try { await ensureProfile(email, name); } catch (e) { /* ignore */ }

    // Build a simple HS256 JWT. This is NOT a GoTrue session token, but
    // can be used as a Bearer token for supabase PostgREST requests if your
    // RLS policies accept `auth.role()` = 'authenticated' and identify users
    // by email/uid matching the `sub` claim.
    const header = { alg: 'HS256', typ: 'JWT' }
    const now = Math.floor(Date.now() / 1000)
    const expires = now + 60 * 60 * 24 * 7
    const payload: Record<string, any> = { sub: String(email), email, name, iat: now, exp: expires, role: 'authenticated' }
    const token = await signJwt(header, payload, SUPABASE_JWT_SECRET)

    return new Response(JSON.stringify({ token, email, name, sub }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (e: any) {
    return new Response(JSON.stringify({ detail: String(e?.message || e) }), { status: 400 })
  }
})
