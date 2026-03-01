// Supabase Edge Function (TypeScript) - create_set
// Purpose: atomically create a workout_set row, assign set_number if missing,
// compute PR flags using the historical data, and return the created row.
// Deploy to Supabase Edge Functions; set SUPABASE_URL and SUPABASE_SERVICE_ROLE.

import { serve } from 'std/server'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE') || ''

async function supaFetch(path: string, method = 'GET', body?: unknown) {
  const opts: any = { method, headers: { Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}` } }
  if (method === 'GET') {
    opts.headers['Accept'] = 'application/json'
  } else {
    opts.headers['Content-Type'] = 'application/json'
  }
  const res = await fetch(`${SUPABASE_URL}${path}`, { ...opts, body: body ? JSON.stringify(body) : undefined })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`Supabase request failed: ${res.status} ${txt}`)
  }
  // Some endpoints return array, some return single object
  const txt = await res.text()
  try { return JSON.parse(txt) } catch { return txt }
}

function kgFromWeight(weight: number | null, unit?: string): number | null {
  if (weight == null) return null
  try {
    if (!unit || unit.toLowerCase() === 'kg') return Number(weight)
    return Number(weight) * 0.45359237
  } catch (e) { return null }
}

function computeE1RM(weightKg: number, reps: number): number {
  return Math.round(weightKg * (1 + reps / 30))
}

serve(async (req) => {
  try {
    if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 })
    const body = await req.json()
    const { workout, exercise, reps, half_reps = 0, weight = null, unit = 'kg', set_number } = body
    if (!workout || !exercise || !reps) return new Response(JSON.stringify({ detail: 'Missing fields' }), { status: 400 })

    // 1) Determine owner_id for the workout
    const workoutRows = await supaFetch(`/rest/v1/workouts?id=eq.${workout}&select=owner_id`,'GET')
    if (!Array.isArray(workoutRows) || workoutRows.length === 0) return new Response(JSON.stringify({ detail: 'Workout not found' }), { status: 404 })
    const ownerId = workoutRows[0].owner_id

    // 2) Compute next set_number if not provided
    const last = await supaFetch(`/rest/v1/workout_sets?workout_id=eq.${workout}&exercise_id=eq.${exercise}&select=set_number&order=set_number.desc.limit=1`,'GET')
    let nextNumber = 1
    if (Array.isArray(last) && last.length > 0) nextNumber = (last[0].set_number || 0) + 1
    const chosenSetNumber = typeof set_number === 'number' ? set_number : nextNumber

    // 3) Insert the set
    const insertBody = {
      workout_id: workout,
      exercise_id: exercise,
      set_number: chosenSetNumber,
      reps,
      half_reps,
      weight,
      unit,
    }
    const createdArr = await supaFetch(`/rest/v1/workout_sets`, 'POST', insertBody)
    // PostgREST returns array of created rows when returning content
    const created = Array.isArray(createdArr) ? createdArr[0] : createdArr

    // 4) Gather historical sets for this owner & exercise
    // 4a: fetch all workouts for owner to limit the search
    const ownerWorkouts = await supaFetch(`/rest/v1/workouts?owner_id=eq.${ownerId}&select=id`,'GET')
    const workoutIds = Array.isArray(ownerWorkouts) ? ownerWorkouts.map((w:any)=>w.id).filter(Boolean) : []

    let histSets: any[] = []
    if (workoutIds.length > 0) {
      // Build in(...) list
      const idList = workoutIds.join(',')
      histSets = await supaFetch(`/rest/v1/workout_sets?exercise_id=eq.${exercise}&workout_id=in.(${idList})&select=reps,half_reps,weight,unit`,'GET')
      if (!Array.isArray(histSets)) histSets = []
    }

    // 5) Compute existing maxima
    let maxAbsWeight = -Infinity
    let maxE1RM = -Infinity
    let maxVolume = -Infinity
    let maxReps = -Infinity

    for (const s of histSets) {
      const r = Number(s.reps) || 0
      const hr = Number(s.half_reps) || 0
      const repsTotal = r + hr * 0.5
      const w = s.weight != null ? Number(s.weight) : null
      const unitS = s.unit
      const wKg = kgFromWeight(w, unitS)
      if (wKg != null) {
        if (wKg > maxAbsWeight) maxAbsWeight = wKg
        const e1 = computeE1RM(wKg, repsTotal)
        if (e1 > maxE1RM) maxE1RM = e1
        const vol = wKg * repsTotal
        if (vol > maxVolume) maxVolume = vol
      }
      if (repsTotal > maxReps) maxReps = repsTotal
    }

    // 6) Compute metrics for created set
    const createdReps = Number(created.reps) || 0
    const createdHalf = Number(created.half_reps) || 0
    const createdRepsTotal = createdReps + createdHalf * 0.5
    const createdWeight = created.weight != null ? Number(created.weight) : null
    const createdKg = kgFromWeight(createdWeight, created.unit || unit)
    const createdE1 = createdKg != null ? computeE1RM(createdKg, createdRepsTotal) : null
    const createdVol = createdKg != null ? createdKg * createdRepsTotal : null

    const flags: any = {}
    if (createdKg != null && createdKg > maxAbsWeight) flags.is_abs_weight_pr = true
    if (createdE1 != null && createdE1 > maxE1RM) flags.is_e1rm_pr = true
    if (createdVol != null && createdVol > maxVolume) flags.is_volume_pr = true
    if (createdRepsTotal > maxReps) flags.is_rep_pr = true
    // Aggregate PR
    flags.is_pr = !!(flags.is_abs_weight_pr || flags.is_e1rm_pr || flags.is_volume_pr || flags.is_rep_pr)

    // 7) Patch created row with flags if any
    if (Object.keys(flags).length > 0) {
      await supaFetch(`/rest/v1/workout_sets?id=eq.${created.id}`, 'PATCH', flags)
      // re-load updated row
      const updatedArr = await supaFetch(`/rest/v1/workout_sets?id=eq.${created.id}`, 'GET')
      const updated = Array.isArray(updatedArr) ? updatedArr[0] : updatedArr
      return new Response(JSON.stringify(updated), { status: 200 })
    }

    return new Response(JSON.stringify(created), { status: 200 })
  } catch (e) {
    return new Response(JSON.stringify({ detail: String(e?.message || e) }), { status: 400 })
  }
})
