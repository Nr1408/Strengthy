// Vercel Serverless: create_set compatibility endpoint
// Expects JSON body matching existing SPA `createSet` payload
// Uses SUPABASE_URL and SUPABASE_SERVICE_ROLE env vars to write to Postgres via Supabase REST

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;

function toKg(weight, unit) {
  if (weight == null) return null;
  const n = Number(weight);
  if (!Number.isFinite(n)) return null;
  if (unit === 'lbs') return n * 0.45359237;
  return n; // assume kg
}

function epleyE1RM(weightKg, reps) {
  if (weightKg == null || reps == null) return null;
  const r = Number(reps);
  if (!Number.isFinite(r) || r <= 0) return null;
  return weightKg * (1 + r / 30);
}

export default async function handler(req, res) {
  if (!SUPABASE_URL || !SERVICE_ROLE) {
    res.status(500).json({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE env var' });
    return;
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).end('Method Not Allowed');
    return;
  }

  let body;
  try {
    body = req.body;
    if (!body || typeof body !== 'object') throw new Error('invalid body');
  } catch (e) {
    res.status(400).json({ error: 'Invalid JSON body' });
    return;
  }

  const workout = Number(body.workout);
  const exercise = Number(body.exercise);
  const reps = Number(body.reps);
  const half_reps = typeof body.half_reps === 'number' ? Number(body.half_reps) : 0;
  const weight = typeof body.weight === 'number' ? Number(body.weight) : null;
  const unit = body.unit || 'kg';
  const set_number_provided = typeof body.set_number === 'number';

  if (!Number.isFinite(workout) || workout <= 0) return res.status(400).json({ error: 'invalid workout' });
  if (!Number.isFinite(exercise) || exercise <= 0) return res.status(400).json({ error: 'invalid exercise' });
  if (!Number.isFinite(reps) || reps <= 0) return res.status(400).json({ error: 'invalid reps' });

  try {
    // Determine set_number if not provided: max set_number for workout + 1
    let set_number = typeof body.set_number === 'number' ? Number(body.set_number) : null;
    if (!set_number_provided) {
      const maxRes = await fetch(`${SUPABASE_URL}/rest/v1/workout_sets?workout=eq.${workout}&select=set_number&order=set_number.desc&limit=1`, {
        headers: {
          apikey: SERVICE_ROLE,
          Authorization: `Bearer ${SERVICE_ROLE}`,
        },
      });
      if (!maxRes.ok) throw new Error('Failed to query set_number');
      const arr = await maxRes.json();
      const max = (arr && arr[0] && typeof arr[0].set_number === 'number') ? Number(arr[0].set_number) : 0;
      set_number = max + 1;
    }

    // Fetch historical sets for this exercise to compute PRs
    const histRes = await fetch(`${SUPABASE_URL}/rest/v1/workout_sets?exercise=eq.${exercise}&select=weight,reps,half_reps,unit`, {
      headers: {
        apikey: SERVICE_ROLE,
        Authorization: `Bearer ${SERVICE_ROLE}`,
      },
    });
    if (!histRes.ok) throw new Error('Failed to fetch historical sets');
    const history = await histRes.json();

    const weightKg = toKg(weight, unit);
    const e1rm = epleyE1RM(weightKg, reps);
    const volume = weightKg != null ? weightKg * reps : null;

    let absWeightPR = false;
    let e1rmPR = false;
    let volumePR = false;
    let repPR = false;

    for (const h of history) {
      const hw = typeof h.weight === 'number' ? toKg(h.weight, h.unit || 'kg') : (h.weight != null ? toKg(Number(h.weight), h.unit || 'kg') : null);
      const hr = typeof h.reps === 'number' ? Number(h.reps) : (h.reps != null ? Number(h.reps) : null);
      const he1 = hw != null && hr != null ? epleyE1RM(hw, hr) : null;
      const hvol = hw != null && hr != null ? hw * hr : null;

      if (weightKg != null && hw != null && weightKg > hw) absWeightPR = true;
      if (e1rm != null && he1 != null && e1rm > he1) e1rmPR = true;
      if (volume != null && hvol != null && volume > hvol) volumePR = true;
      if (reps != null && hr != null && reps > hr) repPR = true;
    }

    // If any specific PR is true, mark is_pr true
    const is_pr = absWeightPR || e1rmPR || volumePR || repPR;

    const insertPayload = {
      workout,
      exercise,
      set_number,
      reps,
      half_reps,
      weight: weight != null ? String(weight) : null,
      unit: unit || null,
      is_pr,
      is_abs_weight_pr: absWeightPR,
      is_e1rm_pr: e1rmPR,
      is_volume_pr: volumePR,
      is_rep_pr: repPR,
    };

    const insRes = await fetch(`${SUPABASE_URL}/rest/v1/workout_sets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SERVICE_ROLE,
        Authorization: `Bearer ${SERVICE_ROLE}`,
        Prefer: 'return=representation',
      },
      body: JSON.stringify(insertPayload),
    });

    if (!insRes.ok) {
      const txt = await insRes.text().catch(() => '');
      console.error('insert failed', insRes.status, txt);
      throw new Error('Insert failed');
    }

    const inserted = await insRes.json();
    // Supabase returns an array when using return=representation
    const row = Array.isArray(inserted) ? inserted[0] : inserted;
    return res.status(201).json(row);
  } catch (err) {
    console.error('create_set error', err);
    return res.status(500).json({ error: String(err && err.message ? err.message : err) });
  }
}
