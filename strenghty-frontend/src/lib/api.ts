// Prefer explicit env vars; fall back to local dev URL
// Prefer explicit env vars; fall back to the local backend IP used in this dev setup.
const _envBase = (import.meta.env.VITE_API_BASE ?? import.meta.env.VITE_API_URL ?? "").toString().trim();
// Normalize common bad values (some build systems may inject the string 'undefined')
// Default to the deployed backend when no VITE_API_BASE is provided so local
// dev automatically uses the live API instead of a non-listening local host.
// Candidates: explicit env, local dev, deployed. Allow manual override via
// localStorage key `USE_LOCAL_API=1` when you want to force local usage.
const DEPLOYED_API = "https://strengthy-backend.onrender.com/api";
const LOCAL_API = "http://127.0.0.1:8000/api";

// Support multiple entries in VITE_API_BASE separated by comma. This allows
// specifying both a local and deployed backend, e.g.
// VITE_API_BASE=http://127.0.0.1:8000/api,https://strengthy-backend.onrender.com/api
// Runtime selection rules:
// - If the env provided multiple candidates, and we're in DEV or
//   localStorage `USE_LOCAL_API` is set to "1", prefer a candidate that
//   looks local (localhost/127.0.0.1 or 192.168.*). Otherwise pick the
//   first candidate.
function pickFromCandidates(list: string[]): string {
  // normalize
  const trimmed = list.map((s) => s.trim()).filter(Boolean);
  if (trimmed.length === 0) return DEPLOYED_API;

  try {
    const wantLocal = typeof window !== "undefined" && (localStorage.getItem("USE_LOCAL_API") === "1");
    if (import.meta.env.DEV || wantLocal) {
      for (const c of trimmed) {
        try {
          const u = new URL(c);
          if (u.hostname === "localhost" || u.hostname === "127.0.0.1" || /^192\.168\./.test(u.hostname)) {
            return c;
          }
        } catch (e) {
          // ignore parse errors
        }
      }
    }
  } catch (e) {}

  return trimmed[0];
}

if (_envBase && _envBase !== "undefined" && /[,;|]/.test(_envBase)) {
  const parts = _envBase.split(/[,;|]/);
  resolvedBase = pickFromCandidates(parts);
} else {
  resolvedBase = _envBase && _envBase !== "undefined" ? _envBase : DEPLOYED_API;
  // If no explicit env provided and we're in DEV, prefer local by default.
  try {
    const wantLocal = typeof window !== "undefined" && (localStorage.getItem("USE_LOCAL_API") === "1");
    if (!(_envBase && _envBase !== "undefined") && (import.meta.env.DEV || wantLocal)) {
      resolvedBase = LOCAL_API;
    }
  } catch (e) {}
}

// If a dev frontend host/port leaked into API_BASE (vite dev server like :8080 or :8081),
// prefer the backend port 8000 on the same host. This prevents requests from being sent
// to the Vite server which will return 404 for API routes.
try {
  const urlObj = new URL(resolvedBase);
  // if the port looks like a Vite dev port, replace with 8000
  if (/^80?8\d$/.test(urlObj.port)) {
    urlObj.port = "8000";
    resolvedBase = urlObj.toString().replace(/\/$/, "");
  }
} catch (e) {
  // ignore URL parse errors and keep resolvedBase as-is
}

// Defensive: ensure the API base actually points at the API namespace
// (some deploys or envs may provide just the host without the '/api' path)
try {
  // strip trailing slashes, then append '/api' if missing
  resolvedBase = resolvedBase.replace(/\/+$/g, "");
  if (!/\/api(?:$|\/)/.test(resolvedBase)) {
    resolvedBase = resolvedBase + "/api";
  }
} catch (e) {
  // ignore errors and keep resolvedBase
}

// Helpful runtime logs to debug incorrect API_BASE during development
try {
  // eslint-disable-next-line no-console
  console.info("API_BASE:", resolvedBase);
  // eslint-disable-next-line no-console
  console.info("LOCATION:", typeof window !== 'undefined' ? window.location.origin : 'n/a');
} catch (e) {}

export const API_BASE = resolvedBase;

// Helpful runtime log to debug incorrect API_BASE during development
try {
  // eslint-disable-next-line no-console
  console.info("API_BASE:", API_BASE);
} catch (e) {}

export type MuscleGroup =
  | "chest"
  | "back"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "legs"
  | "core"
  | "cardio"
  | "full-body";

export interface UiExercise {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  description?: string;
  createdAt: Date;
}

interface ApiExercise {
  id: number;
  name: string;
  muscle_group: string;
  description: string | null;
}

export interface UiWorkoutSet {
  id: string;
  workout: string;
  exercise: string;
  setNumber: number;
  reps: number;
  weight?: number;
  unit?: 'lbs' | 'kg';
  isPR: boolean;
  // Detailed PR types
  absWeightPR?: boolean;
  e1rmPR?: boolean;
  volumePR?: boolean;
  repPR?: boolean;
  type?: 'W' | 'S' | 'F' | 'D';
  rpe?: number;
  createdAt: Date;
}

interface ApiWorkoutSet {
  id: number;
  workout: number;
  exercise: number;
  set_number: number;
  reps: number;
  weight: string | null;
  unit?: string | null;
  is_pr: boolean;
  is_abs_weight_pr?: boolean;
  is_e1rm_pr?: boolean;
  is_volume_pr?: boolean;
  is_rep_pr?: boolean;
  set_type?: string | null;
  rpe?: string | null;
  created_at: string;
}

export interface UiWorkout {
  id: string;
  name: string;
  date: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  endedAt?: Date | null;
  // For UI card compatibility; can be populated separately
  exercises: Array<{ id: string; exercise: UiExercise; sets: Array<{ id: string; reps: number; weight?: number; isPR: boolean }>; }>;
  duration?: number;
}

interface ApiWorkout {
  id: number;
  date: string; // YYYY-MM-DD
  name: string;
  notes: string;
  created_at: string;
  updated_at: string;
  ended_at: string | null;
}

export function getToken() {
  return localStorage.getItem("token");
}

export function setToken(token: string) {
  localStorage.setItem("token", token);
}

export function clearToken() {
  localStorage.removeItem("token");
}

export function authHeaders() {
  const t = getToken();
  return t ? { Authorization: `Token ${t}` } : {};
}

function mapExercise(api: ApiExercise): UiExercise {
  const raw = String(api.muscle_group || "OTHER").toUpperCase();
  const uiMap: Record<string, MuscleGroup> = {
    CHEST: "chest",
    BACK: "back",
    SHOULDERS: "shoulders",
    LEGS: "legs",
    CORE: "core",
    ARMS: "biceps", // map generic arms to biceps for UI grouping
    OTHER: "full-body",
  };
  const mg = uiMap[raw] || "full-body";
  return {
    id: String(api.id),
    name: api.name,
    muscleGroup: mg,
    description: api.description || "",
    createdAt: new Date(),
  };
}

function mapWorkout(api: ApiWorkout): UiWorkout {
  const createdAt = new Date(api.created_at);
  const endedAt = api.ended_at ? new Date(api.ended_at) : null;
  const duration = endedAt ? Math.max(1, Math.round((endedAt.getTime() - createdAt.getTime()) / 60000)) : undefined;
  return {
    id: String(api.id),
    name: api.name,
    date: new Date(`${api.date}T00:00:00`),
    notes: api.notes || "",
    createdAt,
    updatedAt: new Date(api.updated_at),
    endedAt,
    exercises: [],
    duration,
  };
}

function mapWorkoutSet(api: ApiWorkoutSet): UiWorkoutSet {
  const setType = (api.set_type || undefined) as 'W' | 'S' | 'F' | 'D' | undefined;
  return {
    id: String(api.id),
    workout: String(api.workout),
    exercise: String(api.exercise),
    setNumber: api.set_number,
    reps: api.reps,
    weight: api.weight ? Number(api.weight) : undefined,
    unit: api.unit || undefined,
    isPR: api.is_pr,
    absWeightPR: !!api.is_abs_weight_pr,
    e1rmPR: !!api.is_e1rm_pr,
    volumePR: !!api.is_volume_pr,
    repPR: !!api.is_rep_pr,
    type: setType,
    rpe: api.rpe != null ? Number(api.rpe) : undefined,
    createdAt: new Date(api.created_at),
  };
}

export async function login(username: string, password: string) {
  const res = await fetch(`${API_BASE}/auth/login/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Login failed: ${res.status} ${body}`);
  }
  const data = (await res.json()) as { token: string };
  setToken(data.token);
  return data;
}

export async function register(username: string, password: string) {
  const res = await fetch(`${API_BASE}/auth/register/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Register failed: ${res.status} ${body}`);
  }
  return (await res.json()) as { id: number; username: string };
}

export async function getExercises(): Promise<UiExercise[]> {
  const res = await fetch(`${API_BASE}/exercises/`, { headers: { ...authHeaders() } });
  if (!res.ok) throw new Error(`Load exercises failed: ${res.status}`);
  const data = (await res.json()) as ApiExercise[];
  return data.map(mapExercise);
}

export async function createExercise(name: string, muscleGroup: MuscleGroup, description = "") {
  // Map UI muscle groups to backend choices (see Django MUSCLE_GROUP_CHOICES)
  const backendMap: Record<MuscleGroup, string> = {
    chest: "CHEST",
    back: "BACK",
    shoulders: "SHOULDERS",
    biceps: "ARMS",
    triceps: "ARMS",
    legs: "LEGS",
    core: "CORE",
    cardio: "OTHER",
    "full-body": "OTHER",
  };
  const mg = backendMap[muscleGroup] || "OTHER";

  const res = await fetch(`${API_BASE}/exercises/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ name, muscle_group: mg, description }),
  });
  if (!res.ok) {
    let detail = "";
    try {
      detail = await res.text();
    } catch {}
    throw new Error(`Create exercise failed: ${res.status}${detail ? ` ${detail}` : ""}`);
  }
  const data = (await res.json()) as ApiExercise;
  return mapExercise(data);
}

export async function deleteExercise(id: string) {
  const res = await fetch(`${API_BASE}/exercises/${id}/`, { method: "DELETE", headers: { ...authHeaders() } });
  if (!res.ok && res.status !== 204) throw new Error(`Delete exercise failed: ${res.status}`);
}

export async function getWorkouts(): Promise<UiWorkout[]> {
  const res = await fetch(`${API_BASE}/workouts/`, { headers: { ...authHeaders() } });
  if (!res.ok) throw new Error(`Load workouts failed: ${res.status}`);
  const data = (await res.json()) as ApiWorkout[];
  return data.map(mapWorkout);
}

export async function createWorkout(name: string, notes = "", date?: Date): Promise<UiWorkout> {
  const payload = {
    name,
    notes,
    date: (date || new Date()).toISOString().slice(0, 10), // YYYY-MM-DD
  };
  const res = await fetch(`${API_BASE}/workouts/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Create workout failed: ${res.status}`);
  const data = (await res.json()) as ApiWorkout;
  return mapWorkout(data);
}

export async function finishWorkout(id: string): Promise<UiWorkout> {
  const res = await fetch(`${API_BASE}/workouts/${id}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ ended_at: new Date().toISOString() }),
  });
  if (!res.ok) throw new Error(`Finish workout failed: ${res.status}`);
  const data = (await res.json()) as ApiWorkout;
  return mapWorkout(data);
}

export async function deleteWorkout(id: string) {
  const res = await fetch(`${API_BASE}/workouts/${id}/`, { method: "DELETE", headers: { ...authHeaders() } });
  if (!res.ok && res.status !== 204) throw new Error(`Delete workout failed: ${res.status}`);
}

export async function updateWorkout(id: string, data: Partial<{ name: string; notes: string; date: string }>): Promise<UiWorkout> {
  const res = await fetch(`${API_BASE}/workouts/${id}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Update workout failed: ${res.status}`);
  const api = (await res.json()) as ApiWorkout;
  return mapWorkout(api);
}

export async function getSets(workoutId: string): Promise<UiWorkoutSet[]> {
  const res = await fetch(`${API_BASE}/sets/?workout=${workoutId}`, { headers: { ...authHeaders() } });
  if (!res.ok) throw new Error(`Load sets failed: ${res.status}`);
  const data = (await res.json()) as ApiWorkoutSet[];
  return data.map(mapWorkoutSet);
}

export async function createSet(params: { workoutId: string; exerciseId: string; setNumber?: number; reps: number; weight?: number; isPR?: boolean; unit?: 'lbs' | 'kg'; type?: 'W' | 'S' | 'F' | 'D'; rpe?: number }): Promise<UiWorkoutSet> {
  const { workoutId, exerciseId, setNumber, reps, weight, isPR, unit, type, rpe } = params;
  const payload: any = {
    workout: Number(workoutId),
    exercise: Number(exerciseId),
    reps,
    weight: typeof weight === "number" ? weight : null,
    // is_pr is computed on the server; client flag is ignored
  };
  if (typeof setNumber === "number") payload.set_number = setNumber;
  if (typeof unit !== 'undefined') payload.unit = unit;
  if (typeof type !== 'undefined') payload.set_type = type;
  if (typeof rpe === 'number') payload.rpe = rpe;
  const res = await fetch(`${API_BASE}/sets/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    let body = "";
    try {
      body = await res.text();
    } catch (e) {}
    throw new Error(`Create set failed: ${res.status} ${body}`);
  }
  const data = (await res.json()) as ApiWorkoutSet;
  return mapWorkoutSet(data);
}

export async function updateSet(id: string, data: Partial<{ setNumber: number; reps: number; weight?: number | null; isPR?: boolean; unit?: 'lbs' | 'kg'; type?: 'W' | 'S' | 'F' | 'D'; rpe?: number }>): Promise<UiWorkoutSet> {
  const payload: any = {};
  if (typeof data.setNumber === 'number') payload.set_number = data.setNumber;
  if (typeof data.reps === 'number') payload.reps = data.reps;
  if (typeof data.weight !== 'undefined') payload.weight = data.weight === null ? null : String(data.weight);
  if (typeof data.unit !== 'undefined') payload.unit = data.unit;
  if (typeof data.type !== 'undefined') payload.set_type = data.type;
  if (typeof data.rpe === 'number') payload.rpe = data.rpe;

  const res = await fetch(`${API_BASE}/sets/${id}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Update set failed: ${res.status}`);
  const api = await res.json();
  return mapWorkoutSet(api as ApiWorkoutSet);
}

export async function deleteSet(id: string) {
  const res = await fetch(`${API_BASE}/sets/${id}/`, {
    method: 'DELETE',
    headers: { ...authHeaders() },
  });
  if (!res.ok && res.status !== 204) throw new Error(`Delete set failed: ${res.status}`);
}
