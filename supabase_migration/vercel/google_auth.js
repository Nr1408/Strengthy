// Vercel Serverless function: google_auth
// Deploy path: /api/google-auth (Vercel will use this when placed in `api/`)
// This file is a ready-to-deploy Node serverless handler that:
//  - accepts POST { credential: <google id token> }
//  - verifies it with Google
//  - upserts a `profiles` row via Supabase REST using the service_role key
//  - returns a signed HS256 JWT (for migration/testing only)

const crypto = require('crypto')

function base64UrlEncode(input) {
  return Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

function signJwt(header, payload, secret) {
  const headerB = base64UrlEncode(JSON.stringify(header))
  const payloadB = base64UrlEncode(JSON.stringify(payload))
  const toSign = `${headerB}.${payloadB}`
  const sig = crypto.createHmac('sha256', secret).update(toSign).digest('base64')
  const sigB = sig.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  return `${toSign}.${sigB}`
}

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed')

    const body = req.body && Object.keys(req.body).length ? req.body : await new Promise(r => {
      let d = ''
      req.on('data', c => d += c)
      req.on('end', () => { try { r(JSON.parse(d)) } catch(e){ r({}) } })
    })

    const idToken = body && body.credential
    if (!idToken) return res.status(400).json({ error: 'missing credential' })

    // Verify with Google
    const infoRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(String(idToken))}`)
    if (!infoRes.ok) {
      const t = await infoRes.text().catch(() => '')
      return res.status(401).json({ error: 'invalid id token', detail: t })
    }
    const info = await infoRes.json()

    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || ''
    if (GOOGLE_CLIENT_ID && String(info.aud) !== GOOGLE_CLIENT_ID) {
      return res.status(401).json({ error: 'id token audience mismatch' })
    }

    const email = info.email
    const name = info.name || info.given_name || null
    const sub = info.sub || null
    if (!email) return res.status(400).json({ error: 'id token missing email' })

    const SUPABASE_URL = process.env.SUPABASE_URL
    const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE
    const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE || !SUPABASE_JWT_SECRET) {
      return res.status(500).json({ error: 'missing supabase env vars' })
    }

    // Ensure a Supabase AUTH user exists and that the `profiles` row is
    // associated with the Supabase `user_id`. Use the service role key
    // to perform admin operations safely on the server.
    let supabaseUserId = null
    try {
      const supabaseBase = SUPABASE_URL.replace(/\/+$/,'')

      // 1) Try to find an existing user via the admin users endpoint.
      try {
        const lookupUrl = `${supabaseBase}/auth/v1/admin/users?email=eq.${encodeURIComponent(email)}`
        const uRes = await fetch(lookupUrl, { headers: { apikey: SUPABASE_SERVICE_ROLE, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}` } })
        if (uRes.ok) {
          const users = await uRes.json().catch(() => [])
          if (users && users.length > 0 && users[0].id) {
            supabaseUserId = String(users[0].id)
          }
        }
      } catch (e) {
        // ignore lookup errors and try create below
      }

      // 2) If no user found, create one via the Admin API
      if (!supabaseUserId) {
        try {
          const createUrl = `${supabaseBase}/auth/v1/admin/users`
          const body = { email, email_confirm: true, user_metadata: { name, provider_sub: sub } }
          const cRes = await fetch(createUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              apikey: SUPABASE_SERVICE_ROLE,
              Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}`,
            },
            body: JSON.stringify(body),
          })
          if (cRes.ok) {
            const created = await cRes.json().catch(() => null)
            if (created && created.id) supabaseUserId = String(created.id)
          } else {
            // If create failed because user already exists, attempt a lookup
            try {
              const uRes2 = await fetch(`${supabaseBase}/auth/v1/admin/users?email=eq.${encodeURIComponent(email)}`, { headers: { apikey: SUPABASE_SERVICE_ROLE, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}` } })
              if (uRes2.ok) {
                const users2 = await uRes2.json().catch(() => [])
                if (users2 && users2.length > 0 && users2[0].id) supabaseUserId = String(users2[0].id)
              }
            } catch (e) {}
          }
        } catch (e) {
          // ignore create errors
        }
      }

      // 3) Upsert profile with explicit user_id when we have a Supabase UUID
      try {
        const insertUrl = `${supabaseBase}/rest/v1/profiles`
        const profileBody = supabaseUserId ? { user_id: supabaseUserId, email, full_name: name } : { email, full_name: name }
        const ins = await fetch(insertUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: SUPABASE_SERVICE_ROLE,
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}`,
            Prefer: 'resolution=merge-duplicates,return=representation',
          },
          body: JSON.stringify(profileBody),
        })
        if (!ins.ok) {
          const t = await ins.text().catch(() => '')
          console.error('profile insert failed', t)
        }
      } catch (e) {
        console.error('profile upsert error', e)
      }

      // 4) Generate a Supabase-compatible JWT signed with the project's
      // SUPABASE_JWT_SECRET. Use the Supabase user UUID as `sub`, include
      // `aud` and `iss` so client-side helpers recognize it as usable.
      if (!SUPABASE_JWT_SECRET) {
        return res.status(500).json({ error: 'missing SUPABASE_JWT_SECRET' })
      }
      const header = { alg: 'HS256', typ: 'JWT' }
      const now = Math.floor(Date.now() / 1000)
      const expires = now + 60 * 60 * 24 * 7
      const payload = {
        sub: supabaseUserId || String(email),
        email,
        name,
        iat: now,
        exp: expires,
        role: 'authenticated',
        aud: 'authenticated',
        iss: supabaseBase,
      }
      const token = signJwt(header, payload, SUPABASE_JWT_SECRET)

      return res.status(200).json({ token, email, name, sub: supabaseUserId || sub })
    } catch (err) {
      console.error('google_auth flow error', err)
      return res.status(500).json({ error: 'internal', message: String(err && err.message ? err.message : err) })
    }
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'internal', message: String(err && err.message ? err.message : err) })
  }
}
