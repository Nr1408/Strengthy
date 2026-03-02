import type { CardioMode } from "@/types/workout";
// Capacitor Preferences is imported dynamically where needed to avoid
// bundling/runtime issues on some platforms.

// Prefer explicit API base env vars; otherwise fall back to deployed backend.
// `VITE_SUPABASE_URL` is used for auth endpoints, not as global API base.
const _envBase = (import.meta.env.VITE_API_BASE ?? import.meta.env.VITE_API_URL ?? "").toString().trim();
// Normalize common bad values (some build systems may inject the string 'undefined')
// Default to the deployed backend when no VITE_API_BASE is provided so local
// dev automatically uses the live API instead of a non-listening local host.
// Candidates: explicit env, local dev, deployed. Allow manual override via
// localStorage key `USE_LOCAL_API=1` when you want to force local usage.
const DEPLOYED_API = "https://strengthy-backend.onrender.com/api";
const LOCAL_API = "http://localhost:8000/api";
const RUNTIME_API_OVERRIDE_ENABLED =
  (import.meta.env.VITE_ALLOW_RUNTIME_API_OVERRIDE ?? "")
    .toString()
    .trim() === "1";

const SUPABASE_URL_ENV = (import.meta.env.VITE_SUPABASE_URL ?? "").toString().trim();
const SUPABASE_ANON_ENV = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? "").toString().trim();
const SUPABASE_REST_BASE = SUPABASE_URL_ENV
  ? `${SUPABASE_URL_ENV.replace(/\/+$/g, "")}/rest/v1`
  : "";
const HAS_SUPABASE_CONFIG = !!(SUPABASE_URL_ENV && SUPABASE_ANON_ENV);

function decodeJwtPayload(token: string): any | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

function isSupabaseJwtUsable(token: string | null): boolean {
  if (!token) return false;
  const payload = decodeJwtPayload(token);
  if (!payload) return false;

  const exp = typeof payload.exp === "number" ? payload.exp : null;
  const now = Math.floor(Date.now() / 1000);
  if (!exp || exp <= now + 15) return false;

  const supabaseBase = SUPABASE_URL_ENV.replace(/\/+$/g, "");
  const iss = typeof payload.iss === "string" ? payload.iss : "";
  if (!iss || !iss.startsWith(supabaseBase)) return false;

  const aud = payload.aud;
  const hasSupabaseAudience =
    aud === "authenticated" ||
    (Array.isArray(aud) && aud.includes("authenticated"));

  return !!hasSupabaseAudience;
}

function shouldUseSupabaseApi(): boolean {
  return HAS_SUPABASE_CONFIG;
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = 10000,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: init.signal ?? controller.signal });
  } catch (error: any) {
    if (error?.name === "AbortError") {
      throw new Error("Request timed out. Backend may be unavailable.");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function getJwtUserId(): string | null {
  try {
    const token = getToken();
    if (!token) return null;
    const payload = decodeJwtPayload(token);
    if (!payload) return null;
    const id = payload?.sub ?? payload?.user_id ?? payload?.id ?? null;
    return id != null ? String(id) : null;
  } catch {
    return null;
  }
}

async function resolveSupabaseUserId(): Promise<string | null> {
  const local = getJwtUserId();
  if (local) return local;

  const token = getToken();
  if (!token || !SUPABASE_URL_ENV || !SUPABASE_ANON_ENV) return null;

  try {
    const supabaseBase = SUPABASE_URL_ENV.replace(/\/+$/g, "");
    const res = await fetchWithTimeout(`${supabaseBase}/auth/v1/user`, {
      headers: {
        apikey: SUPABASE_ANON_ENV,
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { id?: string | number | null };
    return data?.id != null ? String(data.id) : null;
  } catch {
    return null;
  }
}

function supabaseHeaders(contentTypeJson = false): HeadersInit {
  const headers: Record<string, string> = {
    apikey: SUPABASE_ANON_ENV,
  };
  const token = getToken();
  if (!isSupabaseJwtUsable(token)) {
    try {
      clearToken();
    } catch (e) {}
    throw new Error("Session expired. Please log in again.");
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (contentTypeJson) headers["Content-Type"] = "application/json";
  return headers;
}

function supabaseSelectWorkoutSet() {
  return [
    "id",
    "workout:workout_id",
    "exercise:exercise_id",
    "set_number",
    "reps",
    "half_reps",
    "weight",
    "unit",
    "is_pr",
    "is_abs_weight_pr",
    "is_e1rm_pr",
    "is_volume_pr",
    "is_rep_pr",
    "set_type",
    "rpe",
    "created_at",
  ].join(",");
}

function supabaseSelectCardioSet() {
  return [
    "id",
    "workout:workout_id",
    "exercise:exercise_id",
    "set_number",
    "mode",
    "duration_seconds",
    "distance_meters",
    "floors",
    "level",
    "split_seconds",
    "spm",
    "is_pr",
    "is_distance_pr",
    "is_pace_pr",
    "is_ascent_pr",
    "is_intensity_pr",
    "is_split_pr",
    "created_at",
  ].join(",");
}

function normalizeWorkoutSetRow(row: any): ApiWorkoutSet {
  return {
    id: Number(row?.id),
    workout: Number(row?.workout ?? row?.workout_id),
    exercise: Number(row?.exercise ?? row?.exercise_id),
    set_number: Number(row?.set_number ?? 0),
    reps: Number(row?.reps ?? 0),
    half_reps: row?.half_reps == null ? 0 : Number(row.half_reps),
    weight: row?.weight == null ? null : String(row.weight),
    unit: row?.unit ?? null,
    is_pr: !!row?.is_pr,
    is_abs_weight_pr: !!row?.is_abs_weight_pr,
    is_e1rm_pr: !!row?.is_e1rm_pr,
    is_volume_pr: !!row?.is_volume_pr,
    is_rep_pr: !!row?.is_rep_pr,
    set_type: row?.set_type ?? null,
    rpe: row?.rpe == null ? null : String(row.rpe),
    created_at: row?.created_at ?? new Date().toISOString(),
  };
}

function normalizeCardioSetRow(row: any): ApiCardioSet {
  return {
    id: Number(row?.id),
    workout: Number(row?.workout ?? row?.workout_id),
    exercise: Number(row?.exercise ?? row?.exercise_id),
    set_number: Number(row?.set_number ?? 0),
    mode: (row?.mode ?? "TREADMILL") as ApiCardioMode,
    duration_seconds: row?.duration_seconds == null ? null : Number(row.duration_seconds),
    distance_meters: row?.distance_meters == null ? null : row.distance_meters,
    floors: row?.floors == null ? null : Number(row.floors),
    level: row?.level == null ? null : row.level,
    split_seconds: row?.split_seconds == null ? null : row.split_seconds,
    spm: row?.spm == null ? null : row.spm,
    is_pr: !!row?.is_pr,
    is_distance_pr: !!row?.is_distance_pr,
    is_pace_pr: !!row?.is_pace_pr,
    is_ascent_pr: !!row?.is_ascent_pr,
    is_intensity_pr: !!row?.is_intensity_pr,
    is_split_pr: !!row?.is_split_pr,
    created_at: row?.created_at ?? new Date().toISOString(),
  };
}

async function getSupabaseProfile() {
  const userId = await resolveSupabaseUserId();
  if (!userId || !SUPABASE_REST_BASE) return null;
  const res = await fetchWithTimeout(
    `${SUPABASE_REST_BASE}/profiles?select=*&user_id=eq.${encodeURIComponent(userId)}&limit=1`,
    { headers: supabaseHeaders() },
  );
  if (!res.ok) return null;
  const rows = (await res.json()) as any[];
  return rows?.[0] ?? null;
}

export async function upsertProfile(payload: {
  goals?: string[];
  age?: number | null;
  height?: number | null;
  height_unit?: string | null;
  current_weight?: number | null;
  goal_weight?: number | null;
  experience?: string | null;
  monthly_workouts?: number | null;
}) {
  if (!shouldUseSupabaseApi()) return;
  const userId = await resolveSupabaseUserId();
  if (!userId || !SUPABASE_REST_BASE) return;
  const body = { user_id: userId, ...payload };
  const res = await fetchWithTimeout(`${SUPABASE_REST_BASE}/profiles`, {
    method: "POST",
    headers: {
      ...supabaseHeaders(true),
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Upsert profile failed: ${res.status}`);
  }
}

// mutable resolved base (computed below)
let resolvedBase: string;

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
    // Only honor local override in DEV. In production (including Capacitor APKs),
    // forcing LOCAL_API will break networking on device.
    const wantLocal =
      RUNTIME_API_OVERRIDE_ENABLED &&
      import.meta.env.DEV &&
      typeof window !== "undefined" &&
      localStorage.getItem("USE_LOCAL_API") === "1";
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
  // Start from explicit env or fall back to deployed backend.
  resolvedBase = _envBase && _envBase !== "undefined" ? _envBase : DEPLOYED_API;
}

// In local Vite dev, default to the deployed backend so you can
// run `npm run dev` without a local Django server. If you want
// to force the local API instead, set
//   localStorage.setItem("USE_LOCAL_API", "1")
// in your browser devtools; any other value (or missing key)
// will make dev use the deployed backend.
try {
  if (import.meta.env.DEV && typeof window !== "undefined") {
    const useLocal =
      RUNTIME_API_OVERRIDE_ENABLED && localStorage.getItem("USE_LOCAL_API") === "1";
    resolvedBase = useLocal ? LOCAL_API : DEPLOYED_API;
  }
} catch (e) {}

// For Capacitor/Android native builds, always prefer the deployed API
// base so the APK connects to the public backend instead of any local
// addresses that might be present in VITE_API_BASE.
try {
  if (!import.meta.env.DEV && typeof window !== "undefined") {
    const ua = navigator.userAgent || "";
    if (/capacitor|android|strengthy/i.test(ua)) {
      resolvedBase = DEPLOYED_API;
    }
  }
} catch (e) {}

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

// Runtime override: allow setting a debug API base from localStorage so
// we can point an installed APK to a temporary/test backend without
// rebuilding. Set `localStorage.setItem('API_BASE_OVERRIDE', 'https://host/api')`
// via Chrome remote devtools on the device and reload the WebView.
try {
  if (typeof window !== 'undefined') {
    try {
      const o = localStorage.getItem('API_BASE_OVERRIDE');
      const allowOverride =
        RUNTIME_API_OVERRIDE_ENABLED ||
        localStorage.getItem('ALLOW_API_BASE_OVERRIDE') === '1';
      if (allowOverride && o && typeof o === 'string' && o.trim().length > 0) {
        let candidate = o.trim();
        // normalize trailing slashes
        candidate = candidate.replace(/\/+$/g, '');
        // ensure it includes /api
        if (!/\/api(?:$|\/)/.test(candidate)) candidate = candidate + '/api';
        // override resolvedBase for debugging/testing only
        resolvedBase = candidate;
        try { console.info('API_BASE overridden at runtime ->', resolvedBase); } catch (e) {}
      }
    } catch (e) {
      // ignore localStorage errors
    }
  }
} catch (e) {}

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
  | "quads"
  | "hamstrings"
  | "calves"
  | "forearms"
  | "core"
  | "other"
  | "cardio"
  ;

export interface UiExercise {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  description?: string;
  createdAt: Date;
  custom?: boolean;
}

interface ApiExercise {
  id: number;
  name: string;
  muscle_group: string;
  description: string | null;
  custom?: boolean;
  created_at?: string;
}

export interface UiWorkoutSet {
  id: string;
  workout: string;
  exercise: string;
  setNumber: number;
  reps: number;
  // Number of half-reps (0..5) in addition to `reps`
  halfReps?: number;
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
  half_reps?: number | null;
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

type ApiCardioMode = "TREADMILL" | "BIKE" | "ELLIPTICAL" | "STAIRS" | "ROW";

interface ApiCardioSet {
  id: number;
  workout: number;
  exercise: number;
  set_number: number;
  mode: ApiCardioMode;
  duration_seconds: number | null;
  distance_meters: string | number | null;
  floors: number | null;
  level: string | number | null;
  split_seconds: string | number | null;
  spm: string | number | null;
  is_pr: boolean;
  is_distance_pr?: boolean;
  is_pace_pr?: boolean;
  is_ascent_pr?: boolean;
  is_intensity_pr?: boolean;
  is_split_pr?: boolean;
  created_at: string;
}

export interface UiCardioSet {
  id: string;
  workout: string;
  exercise: string;
  setNumber: number;
  mode: CardioMode;
  durationSeconds?: number;
  distance?: number;
  floors?: number;
  level?: number;
  splitSeconds?: number;
  spm?: number;
  isPR: boolean;
  distancePR?: boolean;
  pacePR?: boolean;
  ascentPR?: boolean;
  intensityPR?: boolean;
  splitPR?: boolean;
  createdAt: Date;
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
  try {
    // Primary key
    let token = localStorage.getItem("token");
    // Backward compatibility: some flows previously used "user:token"
    if (!token) {
      const legacy = localStorage.getItem("user:token");
      if (legacy) {
        token = legacy;
        // Migrate to the canonical key for future reads
        try {
          localStorage.setItem("token", legacy);
        } catch (e) {}
      }
    }
    return token;
  } catch (e) {
    return null;
  }
}

export function setToken(token: string) {
  try {
    localStorage.setItem("token", token);
    // Clean up any legacy key if it exists
    try {
      localStorage.removeItem("user:token");
    } catch (e) {}
  } catch (e) {}
}

export function clearToken() {
  try {
    localStorage.removeItem("token");
    // Also clear legacy key so a sign-out can't resurrect an old session
    localStorage.removeItem("user:token");
  } catch (e) {}
}

// If running in a Capacitor/native environment, mirror token into Capacitor
// Preferences so the token persists across app restarts in native builds.
try {
  if (typeof window !== "undefined") {
    const ua = navigator.userAgent || "";
    const isNative =
  typeof window !== "undefined" &&
  (window as any).Capacitor?.isNativePlatform?.() === true;
;
    if (isNative) {
      // Attempt to sync token/profile from Capacitor Preferences -> localStorage on startup.
      (async () => {
        try {
          let Prefs: any = null;
          try {
            const m = await import('@capacitor/preferences');
            Prefs = m.Preferences || m;
          } catch (e) {
            Prefs = null;
          }
          if (Prefs) {
            // First launch after install: force the auth screen by ensuring
            // we do NOT restore any prior token/session.
            const FIRST_LAUNCH_KEY = "app:hasLaunched";
            try {
              const first = await Prefs.get({ key: FIRST_LAUNCH_KEY });
              if (!first || !first.value) {
                try {
                  await Prefs.set({ key: FIRST_LAUNCH_KEY, value: "1" });
                } catch (e) {}

                // Clear any potentially restored session keys.
                try {
                  await Prefs.remove({ key: "token" });
                } catch (e) {}
                try {
                  await Prefs.remove({ key: "google:credential" });
                } catch (e) {}

                try {
                  clearToken();
                } catch (e) {}
                try {
                  localStorage.removeItem("google:credential");
                } catch (e) {}

                // Do not mirror anything into localStorage on first launch.
                return;
              }
            } catch (e) {
              // If first-launch check fails, continue with best-effort sync.
            }

            const keys = ["token", "user:profile", "user:onboarding", "user:monthlyGoal", "google:credential"];
            for (const k of keys) {
              try {
                const stored = await Prefs.get({ key: k });
                if (stored && typeof stored.value === "string" && stored.value.length > 0) {
                  try {
                    const existing = localStorage.getItem(k);
                    if (!existing) {
                      localStorage.setItem(k, stored.value);
                    }
                  } catch (e) {}
                }
              } catch (e) {
                // ignore per-key errors
              }
            }
          }
        } catch (e) {
          // ignore if Preferences not available at runtime
        }
      })();

      // Wrap setToken/clearToken to also persist to Preferences asynchronously
      const _origSet = setToken;
      setToken = (token: string) => {
        try {
          _origSet(token);
        } catch (e) {}
        (async () => {
          try {
            const m = await import('@capacitor/preferences');
            const Prefs = m.Preferences || m;
            try {
              await Prefs.set({ key: "token", value: token });
            } catch (e) {}
          } catch (e) {
            // ignore dynamic import errors
          }
        })();
      };

      const _origClear = clearToken;
      clearToken = () => {
        try {
          _origClear();
        } catch (e) {}
        (async () => {
          try {
            const m = await import('@capacitor/preferences');
            const Prefs = m.Preferences || m;
            try {
              await Prefs.remove({ key: "token" });
            } catch (e) {}
          } catch (e) {
            // ignore dynamic import errors
          }
        })();
      };
    }
  }
} catch (e) {}

export function authHeaders() {
  const t = getToken();
  if (!t) return {};
  // If token looks like a JWT (three dot-separated parts) use Bearer.
  try {
    const parts = String(t).split('.');
    if (parts.length === 3 && parts[0].length > 0) {
      return { Authorization: `Bearer ${t}` };
    }
  } catch (e) {
    // fall back to legacy header
  }
  return { Authorization: `Token ${t}` };
}

// Forgot password / reset helpers
export async function requestPasswordReset(email: string): Promise<{ detail: string; otp?: string }> {
  const res = await fetch(`${API_BASE}/auth/password-reset/request/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data && (data.detail as string)) || "Failed to request password reset.");
  }

  return (await res.json()) as { detail: string; otp?: string };
}

export async function confirmPasswordReset(email: string, otp: string, newPassword: string): Promise<string> {
  const res = await fetch(`${API_BASE}/auth/password-reset/confirm/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, otp, new_password: newPassword }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data && (data.detail as string)) || "Failed to reset password.");
  }

  return (data && (data.detail as string)) || "Password has been reset.";
}

function mapExercise(api: ApiExercise): UiExercise {
  const raw = String(api.muscle_group || "OTHER").toUpperCase();
  const uiMap: Record<string, MuscleGroup> = {
    CHEST: "chest",
    BACK: "back",
    SHOULDERS: "shoulders",
    LEGS: "quads",
    CORE: "core",
    ARMS: "biceps", // map generic arms to biceps for UI grouping
  };

  // Basic mapping from backend value
  let mg: MuscleGroup | undefined = uiMap[raw];

  // Handle legacy or generic OTHER values coming from the backend.
  if (!mg) {
    // Determine from the exercise name whether this is a cardio machine
    const name = String(api.name || "").toLowerCase();
    const cardioKeywords = [
      "treadmill",
      "bike",
      "stationary",
      "elliptical",
      "stair",
      "stairclimber",
      "stair climber",
      "row",
      "rowing",
      "rower",
    ];
    const isCardio = cardioKeywords.some((k) => name.includes(k));
    if (isCardio) {
      mg = "cardio";
    } else if (name.includes("calf") || /calf/.test(name)) {
      mg = "calves";
    } else {
      // Default per user request: treat unknown/OTHER as calves (not 'other')
      mg = "calves";
    }
  }
  return {
    id: String(api.id),
    name: api.name,
    muscleGroup: mg,
    description: api.description || "",
    createdAt: api.created_at ? new Date(api.created_at) : new Date(),
    custom: !!api.custom,
  };
}

function mapWorkout(api: ApiWorkout): UiWorkout {
  const createdAt = new Date(api.created_at);
  const endedAt = api.ended_at ? new Date(api.ended_at) : null;
  let duration = endedAt ? Math.max(1, Math.round((endedAt.getTime() - createdAt.getTime()) / 60000)) : undefined;
  // Allow a client-side override (stored in localStorage) so user-edited
  // start times are reflected in the UI even if the backend timestamps
  // are server-controlled and not editable.
  try {
    const override = localStorage.getItem(`workout:durationOverride:${api.id}`);
    if (override) {
      const parsed = Number(override);
      if (!isNaN(parsed) && parsed > 0) duration = parsed;
    }
  } catch (e) {
    // ignore localStorage errors
  }
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

  let isPR = api.is_pr;
  let absWeightPR = !!api.is_abs_weight_pr;
  let e1rmPR = !!api.is_e1rm_pr;
  let volumePR = !!api.is_volume_pr;

  // Allow client-side overrides so retro-edited historical workouts don't
  // surface as new PRs in the UI even if the backend flags them.
  try {
    const override = localStorage.getItem(`set:prOverride:${api.id}`);
    if (override === '0') {
      isPR = false;
      absWeightPR = false;
      e1rmPR = false;
      volumePR = false;
    }
  } catch (e) {
    // ignore localStorage errors
  }

  return {
    id: String(api.id),
    workout: String(api.workout),
    exercise: String(api.exercise),
    setNumber: api.set_number,
    reps: api.reps,
    halfReps:
      typeof api.half_reps === "number" && Number.isFinite(api.half_reps)
        ? Math.max(0, Math.min(5, Math.round(api.half_reps)))
        : 0,
    weight: api.weight ? Number(api.weight) : undefined,
    unit: api.unit === "kg" || api.unit === "lbs" ? api.unit : undefined,
    isPR,
    absWeightPR,
    e1rmPR,
    volumePR,
    repPR: !!api.is_rep_pr,
    type: setType,
    rpe: api.rpe != null ? Number(api.rpe) : undefined,
    createdAt: new Date(api.created_at),
  };
}

function mapApiCardioModeToUi(mode: ApiCardioMode | string | null | undefined): CardioMode {
  const m = (mode || "").toString().toUpperCase();
  switch (m as ApiCardioMode) {
    case "TREADMILL":
      return "treadmill";
    case "BIKE":
      return "bike";
    case "ELLIPTICAL":
      return "elliptical";
    case "STAIRS":
      return "stairs";
    case "ROW":
      return "row";
    default:
      return "treadmill";
  }
}

function mapUiCardioModeToApi(mode: CardioMode): ApiCardioMode {
  switch (mode) {
    case "treadmill":
      return "TREADMILL";
    case "bike":
      return "BIKE";
    case "elliptical":
      return "ELLIPTICAL";
    case "stairs":
      return "STAIRS";
    case "row":
      return "ROW";
    default:
      return "TREADMILL";
  }
}

function mapCardioSet(api: ApiCardioSet): UiCardioSet {
  const toNum = (v: unknown): number | undefined => {
    if (v === null || v === undefined) return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };

  const mode = mapApiCardioModeToUi(api.mode);
  const durationSeconds = typeof api.duration_seconds === "number" ? api.duration_seconds : toNum(api.duration_seconds);
  const distanceMeters = toNum(api.distance_meters);
  const floors = api.floors != null ? Number(api.floors) : undefined;
  const level = toNum(api.level);
  const splitSeconds = toNum(api.split_seconds);
  const spm = toNum(api.spm);

  // For stairs, treat floors as the primary distance-like metric in the UI.
  // For other modes, distanceMeters is the primary metric.
  const uiDistance = mode === "stairs" ? floors ?? distanceMeters : distanceMeters;

  // Third stat varies by mode; we expose it via `level`/`splitSeconds`/`spm`
  // and let UI decide which to show.

  return {
    id: String(api.id),
    workout: String(api.workout),
    exercise: String(api.exercise),
    setNumber: api.set_number,
    mode,
    durationSeconds,
    distance: uiDistance,
    floors,
    level,
    splitSeconds,
    spm,
    isPR: api.is_pr,
    distancePR: !!api.is_distance_pr,
    pacePR: !!api.is_pace_pr,
    ascentPR: !!api.is_ascent_pr,
    intensityPR: !!api.is_intensity_pr,
    splitPR: !!api.is_split_pr,
    createdAt: new Date(api.created_at),
  };
}

// Optional Supabase Auth integration. If both VITE_SUPABASE_URL and
// VITE_SUPABASE_ANON_KEY are provided at build/runtime, prefer using
// Supabase GoTrue endpoints for signup/login. Otherwise fall back to the
// legacy Django auth endpoints at `API_BASE`.
const USE_SUPABASE_AUTH =
  !!(SUPABASE_URL_ENV && SUPABASE_ANON_ENV);

export async function login(username: string, password: string) {
  if (USE_SUPABASE_AUTH) {
    const supabaseBase = SUPABASE_URL_ENV.replace(/\/+$/g, "");
    const res = await fetch(`${supabaseBase}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_ENV,
      },
      body: JSON.stringify({ email: username, password }),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      const lower = txt.toLowerCase();
      if (lower.includes("email_not_confirmed") || lower.includes("email not confirmed")) {
        throw new Error(`Login failed: ${res.status} ${txt}`);
      }
      if (
        res.status === 400 ||
        res.status === 401 ||
        lower.includes("invalid login credentials")
      ) {
        throw new Error("Invalid email id or password, please try again");
      }
      throw new Error(`Login failed: ${res.status} ${txt}`);
    }
    const data = await res.json();
    if (data.access_token) setToken(data.access_token);
    return data;
  }

  // Fallback: legacy Django endpoint
  const res = await fetch(`${API_BASE}/auth/login/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const body = await res.text();
    const lower = (body || "").toLowerCase();
    if (
      res.status === 400 ||
      res.status === 401 ||
      lower.includes("unable to log in with provided credentials") ||
      lower.includes("no active account")
    ) {
      throw new Error("Invalid email id or password, please try again");
    }
    throw new Error(`Login failed: ${res.status} ${body}`);
  }
  const data = (await res.json()) as { token: string };
  setToken(data.token);
  return data;
}

export async function register(username: string, password: string) {
  if (USE_SUPABASE_AUTH) {
    const res = await fetch(`${SUPABASE_URL_ENV.replace(/\/+$/g, "")}/auth/v1/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_ENV },
      body: JSON.stringify({ email: username, password }),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Register failed: ${res.status} ${txt}`);
    }
    const data = await res.json();
    // Supabase may return an access_token on signup
    if (data.access_token) setToken(data.access_token);
    return { id: data.user?.id || null, username: data.user?.email || username };
  }

  // Fallback: legacy Django endpoint
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

export async function updateAccount(params: {
  email?: string;
  currentPassword: string;
  newPassword?: string;
}) {
  const payload: any = {
    current_password: params.currentPassword,
  };

  if (params.email) {
    payload.username = params.email;
    payload.email = params.email;
  }
  if (params.newPassword) {
    payload.password = params.newPassword;
  }

  const res = await fetch(`${API_BASE}/auth/account/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    let body = "";
    try {
      body = await res.text();
    } catch {
      // ignore
    }
    throw new Error(`Update account failed: ${res.status}${body ? ` ${body}` : ""}`);
  }

  return (await res.json()) as { username: string; email: string };
}

export async function deleteAccount() {
  const res = await fetch(`${API_BASE}/auth/account/`, {
    method: "DELETE",
    headers: { ...authHeaders() },
  });

  if (!res.ok && res.status !== 204) {
    let body = "";
    try {
      body = await res.text();
    } catch {
      // ignore
    }
    throw new Error(
      `Delete account failed: ${res.status}${body ? ` ${body}` : ""}`
    );
  }
}

export async function loginWithGoogle(idToken: string) {
  if (!SUPABASE_URL_ENV || !SUPABASE_ANON_ENV) {
    throw new Error("Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  }

  const supabaseBase = SUPABASE_URL_ENV.replace(/\/+$/g, "");
  const res = await fetch(`${supabaseBase}/auth/v1/token?grant_type=id_token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_ENV,
    },
    body: JSON.stringify({
      provider: "google",
      id_token: idToken,
    }),
  });
    if (!res.ok) throw new Error(`Google login failed: ${res.status} ${await res.text()}`);
    const data = await res.json();
    const token =
      data?.access_token ||
      data?.session?.access_token ||
      data?.token ||
      null;
    if (token) {
      // Use the same storage mechanism as email/password login
      setToken(token);
    }
    // store profile (so Profile page can read name/email)
    try {
      const profile = {
        name: data.name || data.username || null,
        email: data.email || null,
      };
      if (profile.name || profile.email) {
        try {
          localStorage.setItem("user:profile", JSON.stringify(profile));
        } catch (e) {}
        // If running in a native Capacitor environment, also persist
        // profile into Capacitor Preferences so native apps can read it
        try {
          const ua = typeof navigator !== 'undefined' ? (navigator.userAgent || '') : '';
          const isNative = typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.() === true;
          if (isNative) {
            try {
              const m = await import('@capacitor/preferences');
              const Prefs = m.Preferences || m;
              try { await Prefs.set({ key: 'user:profile', value: JSON.stringify(profile) }); } catch (e) {}
            } catch (e) {}
          }
        } catch (e) {}
      }
    } catch (e) {
      // ignore storage errors
    }
    // After storing token/profile, try to fetch onboarding/profile details
    try {
      const t = getToken();
      if (t) {
        const p = shouldUseSupabaseApi()
          ? await getSupabaseProfile()
          : await (async () => {
              const r = await fetch(`${API_BASE}/profile/`, { headers: { ...authHeaders() } });
              if (!r.ok) return null;
              return await r.json();
            })();
        if (p) {
          try {
            // Persist onboarding-like shape used by the SPA
            const onboarding = {
              goals: p.goals || [],
              age: p.age != null ? String(p.age) : "",
              height: p.height != null ? String(p.height) : "",
              heightUnit: p.height_unit || "cm",
              currentWeight: p.current_weight != null ? String(p.current_weight) : "",
              goalWeight: p.goal_weight != null ? String(p.goal_weight) : "",
              experience: p.experience || "",
              monthlyWorkouts: p.monthly_workouts != null ? String(p.monthly_workouts) : "",
            };
            try { localStorage.setItem("user:onboarding", JSON.stringify(onboarding)); } catch (e) {}
            try {
              if (typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.() === true) {
                try {
                  const m = await import('@capacitor/preferences');
                  const Prefs = m.Preferences || m;
                  try { await Prefs.set({ key: 'user:onboarding', value: JSON.stringify(onboarding) }); } catch (e) {}
                } catch (e) {}
              }
            } catch (e) {}
            if (onboarding.monthlyWorkouts) {
              try { localStorage.setItem('user:monthlyGoal', String(onboarding.monthlyWorkouts)); } catch (e) {}
              try {
                if (typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.() === true) {
                  try {
                    const m = await import('@capacitor/preferences');
                    const Prefs = m.Preferences || m;
                    try { await Prefs.set({ key: 'user:monthlyGoal', value: String(onboarding.monthlyWorkouts) }); } catch (e) {}
                  } catch (e) {}
                }
              } catch (e) {}
            }
          } catch (e) {}
        }
      }
    } catch (e) {}
      // Warm-sync key resources from the server so newly-logged-in clients
      // immediately pull any server-side data (workouts, exercises, sets).
      try {
        // eslint-disable-next-line no-console
        console.debug("loginWithGoogle: warming server sync");
        try { await getExercises(); } catch (e) { /* ignore */ }
        try {
          const workouts = await getWorkouts();
          for (const w of workouts) {
            try { await getSets(w.id); } catch (e) { /* ignore */ }
            try { await getCardioSetsForWorkout(w.id); } catch (e) { /* ignore */ }
          }
        } catch (e) {
          // ignore errors fetching workouts
        }
        try { localStorage.setItem('lastServerSync', String(Date.now())); } catch (e) {}
      } catch (e) {}
    return data;
}

export async function signOut() {
  try {
    clearToken();
  } catch (e) {}

  try {
    localStorage.removeItem("user:profile");
    localStorage.removeItem("user:onboarding");
    localStorage.removeItem("user:monthlyGoal");
    localStorage.removeItem("google:credential");
    localStorage.removeItem("supabase:oauth_result");
    localStorage.removeItem("supabase:oauth_error");
  } catch (e) {}

  try {
    const isNative = typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.() === true;
    if (isNative) {
      try {
        const m = await import('@capacitor/preferences');
        const Prefs = m.Preferences || m;
        try { await Prefs.remove({ key: 'user:profile' }); } catch (e) {}
        try { await Prefs.remove({ key: 'user:onboarding' }); } catch (e) {}
        try { await Prefs.remove({ key: 'user:monthlyGoal' }); } catch (e) {}
        try { await Prefs.remove({ key: 'google:credential' }); } catch (e) {}
      } catch (e) {
        // ignore failures importing Preferences
      }
      // NOTE: We intentionally do NOT call the native GoogleAuth.signOut here.
      // Some Android builds/devices crash inside the native plugin during sign-out.
      // Clearing our app token + stored credentials is sufficient to sign the user
      // out of Strengthy.
    } else {
      // Web: attempt to disable auto-select and clear any stored credential
      try {
        if (typeof window !== 'undefined' && window.google?.accounts?.id?.disableAutoSelect) {
          try { window.google.accounts.id.disableAutoSelect(); } catch (e) {}
        }
        localStorage.removeItem('google:credential');
      } catch (e) {}
    }
  } catch (e) {}
}

export async function getExercises(): Promise<UiExercise[]> {
  try {
    const t = getToken();
    try {
      // eslint-disable-next-line no-console
      console.debug("getExercises auth token present:", !!t, "tokenLen:", t ? String(t).length : 0);
    } catch (e) {}
  } catch (e) {}
  if (shouldUseSupabaseApi()) {
    const res = await fetchWithTimeout(
      `${SUPABASE_REST_BASE}/exercises?select=id,name,muscle_group,description,custom,created_at&order=created_at.desc`,
      { headers: supabaseHeaders() },
    );
    if (!res.ok) throw new Error(`Load exercises failed: ${res.status}`);
    const data = (await res.json()) as ApiExercise[];
    return data.map(mapExercise);
  }

  const res = await fetchWithTimeout(`${API_BASE}/exercises/`, { headers: { ...authHeaders() } });
  if (!res.ok) throw new Error(`Load exercises failed: ${res.status}`);
  const data = (await res.json()) as ApiExercise[];
  return data.map(mapExercise);
}

export async function createExercise(name: string, muscleGroup: MuscleGroup, description = "", options?: { custom?: boolean }) {
  // Map UI muscle groups to backend choices (see Django MUSCLE_GROUP_CHOICES)
  const backendMap: Record<MuscleGroup, string> = {
    chest: "CHEST",
    back: "BACK",
    shoulders: "SHOULDERS",
    biceps: "ARMS",
    triceps: "ARMS",
    quads: "LEGS",
    hamstrings: "LEGS",
    calves: "LEGS",
    forearms: "ARMS",
    core: "CORE",
    cardio: "OTHER",
    other: "OTHER",
  };
  const mg = backendMap[muscleGroup] || "OTHER";

  const payload: any = { name, muscle_group: mg, description };
  if (options && typeof options.custom !== 'undefined') payload.custom = !!options.custom;

  if (shouldUseSupabaseApi()) {
    const userId = await resolveSupabaseUserId();
    if (!userId) throw new Error("Session expired. Please log in again.");
    const res = await fetchWithTimeout(`${SUPABASE_REST_BASE}/exercises`, {
      method: "POST",
      headers: { ...supabaseHeaders(true), Prefer: "return=representation" },
      body: JSON.stringify({
        owner_id: userId,
        name,
        muscle_group: mg,
        description,
        custom: !!options?.custom,
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Create exercise failed: ${res.status}${detail ? ` ${detail}` : ""}`);
    }
    const rows = (await res.json()) as ApiExercise[];
    return mapExercise(rows[0]);
  }

  const res = await fetch(`${API_BASE}/exercises/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    let detail = "";
    try {
      const txt = await res.text();
      detail = txt || "";
      // If the server returned a validation error (e.g. duplicate name),
      // try to recover by reloading the user's exercises and returning
      // an existing exercise with the same name (handles race conditions).
      if (res.status === 400) {
        try {
          const parsed = JSON.parse(txt);
          // If the server returned a serializer validation for `name`,
          // treat it as duplicate and attempt to find the existing record.
          const candidates = await getExercises();
          const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
          const match = candidates.find((c) => norm(c.name) === norm(name));
          if (match) return match;
        } catch (e) {
          // ignore parse errors and fall through to throw
        }
      }
    } catch {}
    throw new Error(`Create exercise failed: ${res.status}${detail ? ` ${detail}` : ""}`);
  }
  const data = (await res.json()) as ApiExercise;
  return mapExercise(data);
}

export async function deleteExercise(id: string) {
  if (shouldUseSupabaseApi()) {
    const res = await fetchWithTimeout(
      `${SUPABASE_REST_BASE}/exercises?id=eq.${encodeURIComponent(id)}`,
      { method: "DELETE", headers: supabaseHeaders() },
    );
    if (!res.ok) throw new Error(`Delete exercise failed: ${res.status}`);
    return;
  }
  const res = await fetch(`${API_BASE}/exercises/${id}/`, { method: "DELETE", headers: { ...authHeaders() } });
  if (!res.ok && res.status !== 204) throw new Error(`Delete exercise failed: ${res.status}`);
}

export async function getWorkouts(): Promise<UiWorkout[]> {
  if (shouldUseSupabaseApi()) {
    const res = await fetchWithTimeout(
      `${SUPABASE_REST_BASE}/workouts?select=id,date,name,notes,created_at,updated_at,ended_at&order=created_at.desc`,
      { headers: supabaseHeaders() },
    );
    if (!res.ok) throw new Error(`Load workouts failed: ${res.status}`);
    const data = (await res.json()) as ApiWorkout[];
    return data.map(mapWorkout);
  }
  const res = await fetchWithTimeout(`${API_BASE}/workouts/`, { headers: { ...authHeaders() } });
  if (!res.ok) throw new Error(`Load workouts failed: ${res.status}`);
  const data = (await res.json()) as ApiWorkout[];
  return data.map(mapWorkout);
}

export async function createWorkout(name: string, notes = "", date?: Date): Promise<UiWorkout> {
  const d = date || new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  // Use the local calendar date (not UTC) so users in
  // positive timezones don't see workouts shifted to
  // the previous day in the logged list.
  const localDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  const payload = {
    name,
    notes,
    date: localDate, // YYYY-MM-DD in local calendar
  };
  try {
    const t = getToken();
    try {
      // eslint-disable-next-line no-console
      console.debug("createWorkout auth token present:", !!t, "tokenLen:", t ? String(t).length : 0);
    } catch (e) {}
  } catch (e) {}
  if (shouldUseSupabaseApi()) {
    const userId = await resolveSupabaseUserId();
    if (!userId) throw new Error("Session expired. Please log in again.");
    const res = await fetchWithTimeout(`${SUPABASE_REST_BASE}/workouts`, {
      method: "POST",
      headers: { ...supabaseHeaders(true), Prefer: "return=representation" },
      body: JSON.stringify({ owner_id: userId, ...payload }),
    });
    if (!res.ok) throw new Error(`Create workout failed: ${res.status}`);
    const rows = (await res.json()) as ApiWorkout[];
    return mapWorkout(rows[0]);
  }

  const res = await fetchWithTimeout(`${API_BASE}/workouts/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Create workout failed: ${res.status}`);
  const data = (await res.json()) as ApiWorkout;
  return mapWorkout(data);
}

export async function finishWorkout(id: string): Promise<UiWorkout> {
  if (shouldUseSupabaseApi()) {
    const res = await fetchWithTimeout(
      `${SUPABASE_REST_BASE}/workouts?id=eq.${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        headers: { ...supabaseHeaders(true), Prefer: "return=representation" },
        body: JSON.stringify({ ended_at: new Date().toISOString() }),
      },
    );
    if (!res.ok) throw new Error(`Finish workout failed: ${res.status}`);
    const rows = (await res.json()) as ApiWorkout[];
    return mapWorkout(rows[0]);
  }
  const res = await fetchWithTimeout(`${API_BASE}/workouts/${id}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ ended_at: new Date().toISOString() }),
  });
  if (!res.ok) throw new Error(`Finish workout failed: ${res.status}`);
  const data = (await res.json()) as ApiWorkout;
  return mapWorkout(data);
}

export async function deleteWorkout(id: string) {
  if (shouldUseSupabaseApi()) {
    const res = await fetchWithTimeout(
      `${SUPABASE_REST_BASE}/workouts?id=eq.${encodeURIComponent(id)}`,
      { method: "DELETE", headers: supabaseHeaders() },
    );
    if (!res.ok) throw new Error(`Delete workout failed: ${res.status}`);
    return;
  }
  const res = await fetch(`${API_BASE}/workouts/${id}/`, { method: "DELETE", headers: { ...authHeaders() } });
  // Treat 404 as a successful no-op delete so the UI stays stable when the
  // workout was already deleted (double tap, stale list, multi-device, etc.).
  if (res.status === 404) return;
  if (!res.ok && res.status !== 204) {
    const body = await (async () => { try { return await res.text(); } catch { return ""; } })();
    const err = new Error(`Delete workout failed: ${res.status} ${body}`);
    // @ts-ignore attach status for callers to inspect
    (err as any).status = res.status;
    // @ts-ignore attach body
    (err as any).body = body;
    throw err;
  }
}

export async function updateWorkout(id: string, data: Partial<{ name: string; notes: string; date: string }>): Promise<UiWorkout> {
  if (shouldUseSupabaseApi()) {
    const res = await fetchWithTimeout(
      `${SUPABASE_REST_BASE}/workouts?id=eq.${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        headers: { ...supabaseHeaders(true), Prefer: "return=representation" },
        body: JSON.stringify(data),
      },
    );
    if (!res.ok) throw new Error(`Update workout failed: ${res.status}`);
    const rows = (await res.json()) as ApiWorkout[];
    return mapWorkout(rows[0]);
  }
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
  if (shouldUseSupabaseApi()) {
    const workoutNum = Number(workoutId);
    if (!Number.isFinite(workoutNum) || workoutNum <= 0) {
      throw new Error(`getSets: invalid workoutId: ${String(workoutId)}`);
    }
    const res = await fetchWithTimeout(
      `${SUPABASE_REST_BASE}/workout_sets?select=${encodeURIComponent(supabaseSelectWorkoutSet())}&workout_id=eq.${workoutNum}&order=set_number.asc`,
      { headers: supabaseHeaders() },
    );
    if (!res.ok) throw new Error(`Load sets failed: ${res.status}`);
    const data = (await res.json()) as any[];
    return data.map((row) => mapWorkoutSet(normalizeWorkoutSetRow(row)));
  }
  const res = await fetchWithTimeout(`${API_BASE}/sets/?workout=${workoutId}`, { headers: { ...authHeaders() } });
  if (!res.ok) throw new Error(`Load sets failed: ${res.status}`);
  const data = (await res.json()) as ApiWorkoutSet[];
  return data.map(mapWorkoutSet);
}

export async function getSetsForExercise(exerciseId: string): Promise<UiWorkoutSet[]> {
  if (shouldUseSupabaseApi()) {
    const exerciseNum = Number(exerciseId);
    if (!Number.isFinite(exerciseNum) || exerciseNum <= 0) {
      throw new Error(`getSetsForExercise: invalid exerciseId: ${String(exerciseId)}`);
    }
    const res = await fetchWithTimeout(
      `${SUPABASE_REST_BASE}/workout_sets?select=${encodeURIComponent(supabaseSelectWorkoutSet())}&exercise_id=eq.${exerciseNum}&order=created_at.desc`,
      { headers: supabaseHeaders() },
    );
    if (!res.ok) throw new Error(`Load sets for exercise failed: ${res.status}`);
    const data = (await res.json()) as any[];
    return data.map((row) => mapWorkoutSet(normalizeWorkoutSetRow(row)));
  }
  const res = await fetchWithTimeout(`${API_BASE}/sets/?exercise=${exerciseId}`, { headers: { ...authHeaders() } });
  if (!res.ok) throw new Error(`Load sets for exercise failed: ${res.status}`);
  const data = (await res.json()) as ApiWorkoutSet[];
  return data.map(mapWorkoutSet);
}

export async function createSet(params: { workoutId: string; exerciseId: string; setNumber?: number; reps: number; halfReps?: number; weight?: number; isPR?: boolean; unit?: 'lbs' | 'kg'; type?: 'W' | 'S' | 'F' | 'D'; rpe?: number }): Promise<UiWorkoutSet> {
  const { workoutId, exerciseId, setNumber, reps, halfReps, weight, unit, type, rpe } = params;
  // Validate reps is a positive integer
  if (typeof reps !== "number" || !Number.isFinite(reps) || !Number.isInteger(reps) || reps <= 0) {
    throw new Error(`createSet: invalid reps value: ${String(reps)}`);
  }
  if (typeof halfReps !== "undefined") {
    const hr = Number(halfReps);
    if (!Number.isFinite(hr) || !Number.isInteger(hr) || hr < 0 || hr > 5) {
      throw new Error(`createSet: invalid halfReps value: ${String(halfReps)}`);
    }
  }
  const workoutNum = Number(workoutId);
  const exerciseNum = Number(exerciseId);
  if (!Number.isFinite(workoutNum) || workoutNum <= 0) {
    throw new Error(`createSet: invalid workoutId: ${String(workoutId)}`);
  }
  if (!Number.isFinite(exerciseNum) || exerciseNum <= 0) {
    throw new Error(`createSet: invalid exerciseId: ${String(exerciseId)}`);
  }

  const createSetViaSupabaseRest = async (): Promise<UiWorkoutSet> => {
    if (!isSupabaseJwtUsable(getToken())) {
      throw new Error("Session expired. Please log in again.");
    }

    const resolveNextSetNumber = async () => {
      const lastRes = await fetchWithTimeout(
        `${SUPABASE_REST_BASE}/workout_sets?select=set_number&workout_id=eq.${workoutNum}&exercise_id=eq.${exerciseNum}&order=set_number.desc&limit=1`,
        { headers: supabaseHeaders() },
      );
      if (lastRes.status === 401) {
        throw new Error("Session expired. Please log in again.");
      }
      if (!lastRes.ok) throw new Error(`Create set failed: ${lastRes.status}`);
      const last = (await lastRes.json()) as Array<{ set_number?: number }>;
      return (last[0]?.set_number ?? 0) + 1;
    };

    let resolvedSetNumber = typeof setNumber === "number" ? setNumber : undefined;
    if (typeof resolvedSetNumber !== "number") {
      resolvedSetNumber = await resolveNextSetNumber();
    }

    const histRes = await fetchWithTimeout(
      `${SUPABASE_REST_BASE}/workout_sets?select=reps,half_reps,weight,unit&exercise_id=eq.${exerciseNum}`,
      { headers: supabaseHeaders() },
    );
    if (histRes.status === 401) {
      throw new Error("Session expired. Please log in again.");
    }
    if (!histRes.ok) {
      throw new Error(`Create set failed: ${histRes.status}`);
    }

    const hist = (await histRes.json()) as Array<{
      reps?: number | string | null;
      half_reps?: number | string | null;
      weight?: number | string | null;
      unit?: string | null;
    }>;

    const toNum = (v: unknown): number | null => {
      if (v === null || typeof v === "undefined") return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };

    const weightToKg = (w: number | null, u?: string | null): number | null => {
      if (w == null) return null;
      if ((u || "").toLowerCase() === "lbs") return w * 0.45359237;
      return w;
    };

    const calcE1rm = (wKg: number, repsTotal: number) => wKg * (1 + repsTotal / 30);

    let maxAbsWeight = -Infinity;
    let maxE1rm = -Infinity;
    let maxVolume = -Infinity;
    let maxReps = -Infinity;

    for (const row of hist) {
      const repsVal = toNum(row.reps) ?? 0;
      const halfRepsVal = toNum(row.half_reps) ?? 0;
      const repsTotal = repsVal + halfRepsVal * 0.5;
      if (repsTotal > maxReps) maxReps = repsTotal;

      const weightVal = toNum(row.weight);
      const weightKg = weightToKg(weightVal, row.unit);
      if (weightKg == null) continue;

      if (weightKg > maxAbsWeight) maxAbsWeight = weightKg;
      const e1 = calcE1rm(weightKg, repsTotal);
      if (e1 > maxE1rm) maxE1rm = e1;
      const vol = weightKg * repsTotal;
      if (vol > maxVolume) maxVolume = vol;
    }

    const currentRepsTotal = reps + (typeof halfReps === "number" ? halfReps : 0) * 0.5;
    const currentWeightKg = weightToKg(typeof weight === "number" ? weight : null, unit || null);
    const hasHistory = hist.length > 0;

    const isAbsWeightPr = hasHistory && currentWeightKg != null && currentWeightKg > maxAbsWeight;
    const isE1rmPr =
      hasHistory && currentWeightKg != null && calcE1rm(currentWeightKg, currentRepsTotal) > maxE1rm;
    const isVolumePr = hasHistory && currentWeightKg != null && currentWeightKg * currentRepsTotal > maxVolume;
    const isRepPr = hasHistory && currentRepsTotal > maxReps;
    const isPr = !!(isAbsWeightPr || isE1rmPr || isVolumePr || isRepPr);

    for (let attempt = 0; attempt < 3; attempt++) {
      const res = await fetchWithTimeout(`${SUPABASE_REST_BASE}/workout_sets`, {
        method: "POST",
        headers: { ...supabaseHeaders(true), Prefer: "return=representation" },
        body: JSON.stringify({
          workout_id: workoutNum,
          exercise_id: exerciseNum,
          set_number: resolvedSetNumber,
          reps,
          half_reps: typeof halfReps === "number" ? halfReps : 0,
          weight: typeof weight === "number" ? weight : null,
          unit: typeof unit !== "undefined" ? unit : null,
          is_pr: isPr,
          is_abs_weight_pr: isAbsWeightPr,
          is_e1rm_pr: isE1rmPr,
          is_volume_pr: isVolumePr,
          is_rep_pr: isRepPr,
          set_type: typeof type !== "undefined" ? type : null,
          rpe: typeof rpe === "number" ? rpe : null,
        }),
      });

      if (res.ok) {
        const rows = (await res.json()) as any[];
        return mapWorkoutSet(normalizeWorkoutSetRow(rows[0]));
      }

      if (res.status === 401) {
        throw new Error("Session expired. Please log in again.");
      }

      const body = await res.text().catch(() => "");
      const isUniqueSetNumberConflict =
        res.status === 409 &&
        (/23505/.test(body) ||
          /workout_sets_workout_id_exercise_id_set_number_key/.test(body));

      if (isUniqueSetNumberConflict && attempt < 2) {
        resolvedSetNumber = await resolveNextSetNumber();
        continue;
      }

      throw new Error(`Create set failed: ${res.status}${body ? ` ${body}` : ""}`);
    }

    throw new Error("Create set failed: unable to resolve set number conflict");
  };

  if (shouldUseSupabaseApi()) {
    return await createSetViaSupabaseRest();
  }

  const payload: any = {
    workout: workoutNum,
    exercise: exerciseNum,
    reps,
    half_reps: typeof halfReps === "number" ? halfReps : 0,
    weight: typeof weight === "number" ? weight : null,
    // is_pr is computed on the server; client flag is ignored
  };
  if (typeof setNumber === "number") payload.set_number = setNumber;
  if (typeof unit !== 'undefined') payload.unit = unit;
  if (typeof type !== 'undefined') payload.set_type = type;
  if (typeof rpe === 'number') payload.rpe = rpe;
  const res = await fetchWithTimeout(`${API_BASE}/sets/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    let body = "";
    try {
      // try to get JSON details if available
      const txt = await res.text();
      body = txt || "";
      try {
        const j = JSON.parse(txt);
        body = JSON.stringify(j);
        // Attach parsed JSON to an Error when thrown so callers can inspect field errors.
        const err = new Error(`Create set failed: ${res.status} ${body}`);
        // @ts-ignore - attach custom property for richer error handling in callers
        (err as any).body = j;
        // @ts-ignore include status too
        (err as any).status = res.status;
        throw err;
      } catch (e) {
        // not JSON
      }
    } catch (e) {}
    // Log payload & response to console to make debugging easier during dev
    try {
      // eslint-disable-next-line no-console
      console.error("createSet failed", { url: `${API_BASE}/sets/`, payload, status: res.status, body });
    } catch (e) {}
    throw new Error(`Create set failed: ${res.status} ${body}`);
  }
  const data = (await res.json()) as ApiWorkoutSet;
  return mapWorkoutSet(data);
}

export async function updateSet(id: string, data: Partial<{ setNumber: number; reps: number; halfReps?: number; weight?: number | null; isPR?: boolean; unit?: 'lbs' | 'kg'; type?: 'W' | 'S' | 'F' | 'D'; rpe?: number }>): Promise<UiWorkoutSet> {
  const payload: any = {};
  if (typeof data.setNumber === 'number') payload.set_number = data.setNumber;
  if (typeof data.reps === 'number') payload.reps = data.reps;
  if (typeof data.halfReps === 'number') payload.half_reps = data.halfReps;
  if (typeof data.weight !== 'undefined') payload.weight = data.weight === null ? null : String(data.weight);
  if (typeof data.unit !== 'undefined') payload.unit = data.unit;
  if (typeof data.type !== 'undefined') payload.set_type = data.type;
  if (typeof data.rpe === 'number') payload.rpe = data.rpe;

  if (shouldUseSupabaseApi()) {
    const currentRes = await fetchWithTimeout(
      `${SUPABASE_REST_BASE}/workout_sets?select=id,exercise_id,reps,half_reps,weight,unit&id=eq.${encodeURIComponent(id)}&limit=1`,
      { headers: supabaseHeaders() },
    );
    if (!currentRes.ok) throw new Error(`Update set failed: ${currentRes.status}`);
    const currentRows = (await currentRes.json()) as Array<{
      exercise_id?: number | string | null;
      reps?: number | string | null;
      half_reps?: number | string | null;
      weight?: number | string | null;
      unit?: string | null;
    }>;
    const current = currentRows[0];

    if (current?.exercise_id != null) {
      const toNum = (v: unknown): number | null => {
        if (v === null || typeof v === "undefined") return null;
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
      };

      const weightToKg = (w: number | null, u?: string | null): number | null => {
        if (w == null) return null;
        if ((u || "").toLowerCase() === "lbs") return w * 0.45359237;
        return w;
      };

      const calcE1rm = (wKg: number, repsTotal: number) => wKg * (1 + repsTotal / 30);

      const nextReps =
        typeof data.reps === "number"
          ? data.reps
          : toNum(current.reps) ?? 0;
      const nextHalfReps =
        typeof data.halfReps === "number"
          ? data.halfReps
          : toNum(current.half_reps) ?? 0;
      const nextWeight =
        typeof data.weight !== "undefined"
          ? data.weight === null
            ? null
            : Number(data.weight)
          : toNum(current.weight);
      const nextUnit =
        typeof data.unit !== "undefined"
          ? data.unit
          : ((current.unit as "lbs" | "kg" | null | undefined) ?? null);

      const histRes = await fetchWithTimeout(
        `${SUPABASE_REST_BASE}/workout_sets?select=reps,half_reps,weight,unit&exercise_id=eq.${Number(current.exercise_id)}&id=neq.${encodeURIComponent(id)}`,
        { headers: supabaseHeaders() },
      );
      if (!histRes.ok) throw new Error(`Update set failed: ${histRes.status}`);
      const hist = (await histRes.json()) as Array<{
        reps?: number | string | null;
        half_reps?: number | string | null;
        weight?: number | string | null;
        unit?: string | null;
      }>;

      let maxAbsWeight = -Infinity;
      let maxE1rm = -Infinity;
      let maxVolume = -Infinity;
      let maxReps = -Infinity;

      for (const row of hist) {
        const repsVal = toNum(row.reps) ?? 0;
        const halfRepsVal = toNum(row.half_reps) ?? 0;
        const repsTotal = repsVal + halfRepsVal * 0.5;
        if (repsTotal > maxReps) maxReps = repsTotal;

        const weightVal = toNum(row.weight);
        const weightKg = weightToKg(weightVal, row.unit);
        if (weightKg == null) continue;

        if (weightKg > maxAbsWeight) maxAbsWeight = weightKg;
        const e1 = calcE1rm(weightKg, repsTotal);
        if (e1 > maxE1rm) maxE1rm = e1;
        const vol = weightKg * repsTotal;
        if (vol > maxVolume) maxVolume = vol;
      }

      const hasHistory = hist.length > 0;
      const currentRepsTotal = nextReps + nextHalfReps * 0.5;
      const currentWeightKg = weightToKg(nextWeight, nextUnit || null);

      const isAbsWeightPr = hasHistory && currentWeightKg != null && currentWeightKg > maxAbsWeight;
      const isE1rmPr =
        hasHistory &&
        currentWeightKg != null &&
        calcE1rm(currentWeightKg, currentRepsTotal) > maxE1rm;
      const isVolumePr =
        hasHistory &&
        currentWeightKg != null &&
        currentWeightKg * currentRepsTotal > maxVolume;
      const isRepPr = hasHistory && currentRepsTotal > maxReps;
      const isPr = !!(isAbsWeightPr || isE1rmPr || isVolumePr || isRepPr);

      payload.is_pr = isPr;
      payload.is_abs_weight_pr = isAbsWeightPr;
      payload.is_e1rm_pr = isE1rmPr;
      payload.is_volume_pr = isVolumePr;
      payload.is_rep_pr = isRepPr;
    }

    const res = await fetchWithTimeout(
      `${SUPABASE_REST_BASE}/workout_sets?id=eq.${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        headers: { ...supabaseHeaders(true), Prefer: "return=representation" },
        body: JSON.stringify(payload),
      },
    );
    if (!res.ok) throw new Error(`Update set failed: ${res.status}`);
    const rows = (await res.json()) as any[];
    return mapWorkoutSet(normalizeWorkoutSetRow(rows[0]));
  }

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
  if (shouldUseSupabaseApi()) {
    const res = await fetchWithTimeout(
      `${SUPABASE_REST_BASE}/workout_sets?id=eq.${encodeURIComponent(id)}`,
      { method: "DELETE", headers: supabaseHeaders() },
    );
    if (!res.ok && res.status !== 204 && res.status !== 404) {
      throw new Error(`Delete set failed: ${res.status}`);
    }
    return;
  }
  const res = await fetch(`${API_BASE}/sets/${id}/`, {
    method: 'DELETE',
    headers: { ...authHeaders() },
  });
  if (!res.ok && res.status !== 204) throw new Error(`Delete set failed: ${res.status}`);
}

export async function deleteCardioSet(id: string) {
  if (shouldUseSupabaseApi()) {
    const res = await fetchWithTimeout(
      `${SUPABASE_REST_BASE}/cardio_sets?id=eq.${encodeURIComponent(id)}`,
      { method: "DELETE", headers: supabaseHeaders() },
    );
    if (!res.ok && res.status !== 204 && res.status !== 404) {
      throw new Error(`Delete cardio set failed: ${res.status}`);
    }
    return;
  }
  const res = await fetch(`${API_BASE}/cardio-sets/${id}/`, {
    method: 'DELETE',
    headers: { ...authHeaders() },
  });
  // Ignore 404s when deleting cardio sets that may have already been removed
  // on the server. Treat 204 (No Content) and 404 (Not Found) as success for
  // idempotent delete semantics in the client save/recreate flow.
  if (!res.ok && res.status !== 204 && res.status !== 404) throw new Error(`Delete cardio set failed: ${res.status}`);
}

export async function getCardioSetsForWorkout(workoutId: string): Promise<UiCardioSet[]> {
  const workoutNum = Number(workoutId);
  if (!Number.isFinite(workoutNum) || workoutNum <= 0) {
    throw new Error(`getCardioSetsForWorkout: invalid workoutId: ${String(workoutId)}`);
  }

  if (shouldUseSupabaseApi()) {
    const res = await fetchWithTimeout(
      `${SUPABASE_REST_BASE}/cardio_sets?select=${encodeURIComponent(supabaseSelectCardioSet())}&workout_id=eq.${workoutNum}&order=set_number.asc`,
      { headers: supabaseHeaders() },
    );
    if (!res.ok) throw new Error(`Load cardio sets failed: ${res.status}`);
    const data = (await res.json()) as any[];
    return data.map((row) => mapCardioSet(normalizeCardioSetRow(row)));
  }

  const res = await fetchWithTimeout(`${API_BASE}/cardio-sets/?workout=${workoutNum}`, {
    headers: { ...authHeaders() },
  });
  if (!res.ok) throw new Error(`Load cardio sets failed: ${res.status}`);
  const data = (await res.json()) as ApiCardioSet[];
  return data.map(mapCardioSet);
}

export async function getCardioSetsForExercise(exerciseId: string): Promise<UiCardioSet[]> {
  const exerciseNum = Number(exerciseId);
  if (!Number.isFinite(exerciseNum) || exerciseNum <= 0) {
    throw new Error(`getCardioSetsForExercise: invalid exerciseId: ${String(exerciseId)}`);
  }

  if (shouldUseSupabaseApi()) {
    const res = await fetchWithTimeout(
      `${SUPABASE_REST_BASE}/cardio_sets?select=${encodeURIComponent(supabaseSelectCardioSet())}&exercise_id=eq.${exerciseNum}&order=created_at.desc`,
      { headers: supabaseHeaders() },
    );
    if (!res.ok) throw new Error(`Load cardio sets for exercise failed: ${res.status}`);
    const data = (await res.json()) as any[];
    return data.map((row) => mapCardioSet(normalizeCardioSetRow(row)));
  }

  const res = await fetchWithTimeout(`${API_BASE}/cardio-sets/?exercise=${exerciseNum}`, {
    headers: { ...authHeaders() },
  });
  if (!res.ok) throw new Error(`Load cardio sets for exercise failed: ${res.status}`);
  const data = (await res.json()) as ApiCardioSet[];
  return data.map(mapCardioSet);
}

export async function createCardioSet(params: {
  workoutId: string;
  exerciseId: string;
  setNumber?: number;
  mode: CardioMode;
  durationSeconds?: number;
  distance?: number;
  floors?: number;
  level?: number;
  splitSeconds?: number;
  spm?: number;
}): Promise<UiCardioSet> {
  const { workoutId, exerciseId, setNumber, mode, durationSeconds, distance, floors, level, splitSeconds, spm } = params;

  const workoutNum = Number(workoutId);
  const exerciseNum = Number(exerciseId);
  if (!Number.isFinite(workoutNum) || workoutNum <= 0) {
    throw new Error(`createCardioSet: invalid workoutId: ${String(workoutId)}`);
  }
  if (!Number.isFinite(exerciseNum) || exerciseNum <= 0) {
    throw new Error(`createCardioSet: invalid exerciseId: ${String(exerciseId)}`);
  }

  const payload: any = {
    mode: mapUiCardioModeToApi(mode),
  };
  if (typeof setNumber === 'number') payload.set_number = setNumber;
  if (typeof durationSeconds === "number") payload.duration_seconds = durationSeconds;
  if (typeof distance === "number") payload.distance_meters = distance;
  if (typeof floors === "number") payload.floors = floors;
  if (typeof level === "number") payload.level = level;
  if (typeof splitSeconds === "number") payload.split_seconds = splitSeconds;
  if (typeof spm === "number") payload.spm = spm;

  if (shouldUseSupabaseApi()) {
    if (typeof payload.set_number !== 'number') {
      const lastRes = await fetchWithTimeout(
        `${SUPABASE_REST_BASE}/cardio_sets?select=set_number&workout_id=eq.${workoutNum}&exercise_id=eq.${exerciseNum}&order=set_number.desc&limit=1`,
        { headers: supabaseHeaders() },
      );
      if (!lastRes.ok) throw new Error(`Create cardio set failed: ${lastRes.status}`);
      const last = (await lastRes.json()) as Array<{ set_number?: number }>;
      const next = (last[0]?.set_number ?? 0) + 1;
      payload.set_number = next;
    }

    const histRes = await fetchWithTimeout(
      `${SUPABASE_REST_BASE}/cardio_sets?select=duration_seconds,distance_meters,floors,level,split_seconds,spm&exercise_id=eq.${exerciseNum}&mode=eq.${encodeURIComponent(payload.mode)}`,
      { headers: supabaseHeaders() },
    );
    if (!histRes.ok) throw new Error(`Create cardio set failed: ${histRes.status}`);
    const hist = (await histRes.json()) as Array<{
      duration_seconds?: number | string | null;
      distance_meters?: number | string | null;
      floors?: number | string | null;
      level?: number | string | null;
      split_seconds?: number | string | null;
      spm?: number | string | null;
    }>;

    const toNum = (v: unknown): number | null => {
      if (v === null || typeof v === "undefined") return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };

    let maxDistance = -Infinity;
    let maxFloors = -Infinity;
    let maxIntensity = -Infinity;
    let maxPace = -Infinity;
    let minSplit = Infinity;

    for (const row of hist) {
      const d = toNum(row.distance_meters);
      if (d != null && d > maxDistance) maxDistance = d;

      const f = toNum(row.floors);
      if (f != null && f > maxFloors) maxFloors = f;

      const intensityCandidates = [toNum(row.level), toNum(row.spm), toNum(row.floors)].filter(
        (n): n is number => n != null,
      );
      if (intensityCandidates.length > 0) {
        const rowIntensity = Math.max(...intensityCandidates);
        if (rowIntensity > maxIntensity) maxIntensity = rowIntensity;
      }

      const duration = toNum(row.duration_seconds);
      const distanceMeters = toNum(row.distance_meters);
      if (duration != null && duration > 0 && distanceMeters != null && distanceMeters > 0) {
        const pace = distanceMeters / duration; // meters per second; higher is better
        if (pace > maxPace) maxPace = pace;
      }

      const split = toNum(row.split_seconds);
      if (split != null && split > 0 && split < minSplit) minSplit = split;
    }

    const hasHistory = hist.length > 0;
    const curDistance = toNum(payload.distance_meters);
    const curFloors = toNum(payload.floors);
    const curIntensityCandidates = [toNum(payload.level), toNum(payload.spm), toNum(payload.floors)].filter(
      (n): n is number => n != null,
    );
    const curIntensity = curIntensityCandidates.length > 0 ? Math.max(...curIntensityCandidates) : null;
    const curDuration = toNum(payload.duration_seconds);
    const curSplit = toNum(payload.split_seconds);
    const curPace =
      curDistance != null && curDuration != null && curDuration > 0
        ? curDistance / curDuration
        : null;

    const isDistancePr = hasHistory && curDistance != null && curDistance > maxDistance;
    const isAscentPr = hasHistory && curFloors != null && curFloors > maxFloors;
    const isIntensityPr = hasHistory && curIntensity != null && curIntensity > maxIntensity;
    const isPacePr = hasHistory && curPace != null && curPace > maxPace;
    const isSplitPr = hasHistory && curSplit != null && curSplit > 0 && curSplit < minSplit;
    const isPr = !!(isDistancePr || isAscentPr || isIntensityPr || isPacePr || isSplitPr);

    const res = await fetchWithTimeout(`${SUPABASE_REST_BASE}/cardio_sets`, {
      method: "POST",
      headers: { ...supabaseHeaders(true), Prefer: "return=representation" },
      body: JSON.stringify({
        workout_id: workoutNum,
        exercise_id: exerciseNum,
        is_pr: isPr,
        is_distance_pr: isDistancePr,
        is_pace_pr: isPacePr,
        is_ascent_pr: isAscentPr,
        is_intensity_pr: isIntensityPr,
        is_split_pr: isSplitPr,
        ...payload,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Create cardio set failed: ${res.status}${body ? ` ${body}` : ""}`);
    }
    const rows = (await res.json()) as any[];
    return mapCardioSet(normalizeCardioSetRow(rows[0]));
  }

  const res = await fetch(`${API_BASE}/cardio-sets/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({
      workout: workoutNum,
      exercise: exerciseNum,
      ...payload,
    }),
  });
  if (!res.ok) {
    let body: any = "";
    try {
      const txt = await res.text();
      body = txt || "";
      try {
        body = JSON.parse(txt);
      } catch (e) {
        // leave as text
      }
    } catch (e) {}

    try {
      // eslint-disable-next-line no-console
      console.error("createCardioSet failed", { url: `${API_BASE}/cardio-sets/`, payload, status: res.status, body });
    } catch (e) {}

    const err = new Error(`Create cardio set failed: ${res.status} ${typeof body === 'string' ? body : JSON.stringify(body)}`);
    // @ts-ignore attach parsed body for callers
    (err as any).body = body;
    throw err;
  }
  const data = (await res.json()) as ApiCardioSet;
  return mapCardioSet(data);
}

export async function updateCardioSet(
  id: string,
  data: Partial<{
    mode: CardioMode;
    durationSeconds: number;
    distance: number;
    floors: number;
    level: number;
    splitSeconds: number;
    spm: number;
  }>
): Promise<UiCardioSet> {
  const payload: any = {};
  if (typeof data.mode !== "undefined") payload.mode = mapUiCardioModeToApi(data.mode);
  if (typeof data.durationSeconds === "number") payload.duration_seconds = data.durationSeconds;
  if (typeof data.distance === "number") payload.distance_meters = data.distance;
  if (typeof data.floors === "number") payload.floors = data.floors;
  if (typeof data.level === "number") payload.level = data.level;
  if (typeof data.splitSeconds === "number") payload.split_seconds = data.splitSeconds;
  if (typeof data.spm === "number") payload.spm = data.spm;

  if (shouldUseSupabaseApi()) {
    const res = await fetchWithTimeout(
      `${SUPABASE_REST_BASE}/cardio_sets?id=eq.${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        headers: { ...supabaseHeaders(true), Prefer: "return=representation" },
        body: JSON.stringify(payload),
      },
    );
    if (!res.ok) throw new Error(`Update cardio set failed: ${res.status}`);
    const rows = (await res.json()) as any[];
    return mapCardioSet(normalizeCardioSetRow(rows[0]));
  }

  const res = await fetch(`${API_BASE}/cardio-sets/${id}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Update cardio set failed: ${res.status}`);
  const api = (await res.json()) as ApiCardioSet;
  return mapCardioSet(api);
}
