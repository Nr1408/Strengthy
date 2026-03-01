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

    // Lookup profile
    try {
      const profileQuery = `${SUPABASE_URL.replace(/\/+$/,'')}/rest/v1/profiles?select=*&email=eq.${encodeURIComponent(email)}`
      const pRes = await fetch(profileQuery, { headers: { apikey: SUPABASE_SERVICE_ROLE, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}` } })
      if (pRes.ok) {
        const existing = await pRes.json().catch(() => [])
        if (!existing || existing.length === 0) {
          // insert
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
            const t = await ins.text().catch(() => '')
            console.error('profile insert failed', t)
          }
        }
      }
    } catch (e) {
      console.error('profile upsert error', e)
    }

    // Create JWT (HS256). NOT a GoTrue token — for migration/testing only.
    const header = { alg: 'HS256', typ: 'JWT' }
    const now = Math.floor(Date.now() / 1000)
    const expires = now + 60 * 60 * 24 * 7
    const payload = { sub: String(email), email, name, iat: now, exp: expires, role: 'authenticated' }
    const token = signJwt(header, payload, SUPABASE_JWT_SECRET)

    return res.status(200).json({ token, email, name, sub })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'internal', message: String(err && err.message ? err.message : err) })
  }
}
