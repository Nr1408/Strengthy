import type { CardioMode } from "@/types/workout";
// Capacitor Preferences is imported dynamically where needed to avoid
// bundling/runtime issues on some platforms.

// Prefer explicit env vars; fall back to local dev URL
// Prefer explicit env vars; fall back to the local backend IP used in this dev setup.
const _envBase = (import.meta.env.VITE_API_BASE ?? import.meta.env.VITE_API_URL ?? "").toString().trim();
// Normalize common bad values (some build systems may inject the string 'undefined')
// Default to the deployed backend when no VITE_API_BASE is provided so local
// dev automatically uses the live API instead of a non-listening local host.
// Candidates: explicit env, local dev, deployed. Allow manual override via
// localStorage key `USE_LOCAL_API=1` when you want to force local usage.
const DEPLOYED_API = "https://strengthy-backend.onrender.com/api";
const LOCAL_API = "http://localhost:8000/api";

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
    const wantLocal = import.meta.env.DEV && typeof window !== "undefined" && (localStorage.getItem("USE_LOCAL_API") === "1");
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
    const useLocal = localStorage.getItem("USE_LOCAL_API") === "1";
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
      if (o && typeof o === 'string' && o.trim().length > 0) {
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
  return t ? { Authorization: `Token ${t}` } : {};
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
    unit: api.unit || undefined,
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
  const res = await fetch(`${API_BASE}/auth/google/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credential: idToken }),
  });
    if (!res.ok) throw new Error(`Google login failed: ${res.status} ${await res.text()}`);
    const data = await res.json();
    if (data.token) {
      // Use the same storage mechanism as email/password login
      setToken(data.token);
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
        const r = await fetch(`${API_BASE}/profile/`, { headers: { ...authHeaders() } });
        if (r.ok) {
          const p = await r.json();
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
  const res = await fetch(`${API_BASE}/exercises/`, { headers: { ...authHeaders() } });
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
  };
  const mg = backendMap[muscleGroup] || "OTHER";

  const payload: any = { name, muscle_group: mg, description };
  if (options && typeof options.custom !== 'undefined') payload.custom = !!options.custom;

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

export async function getSetsForExercise(exerciseId: string): Promise<UiWorkoutSet[]> {
  const res = await fetch(`${API_BASE}/sets/?exercise=${exerciseId}`, { headers: { ...authHeaders() } });
  if (!res.ok) throw new Error(`Load sets for exercise failed: ${res.status}`);
  const data = (await res.json()) as ApiWorkoutSet[];
  return data.map(mapWorkoutSet);
}

export async function createSet(params: { workoutId: string; exerciseId: string; setNumber?: number; reps: number; halfReps?: number; weight?: number; isPR?: boolean; unit?: 'lbs' | 'kg'; type?: 'W' | 'S' | 'F' | 'D'; rpe?: number }): Promise<UiWorkoutSet> {
  const { workoutId, exerciseId, setNumber, reps, halfReps, weight, isPR, unit, type, rpe } = params;
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
  const res = await fetch(`${API_BASE}/sets/`, {
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

export async function deleteCardioSet(id: string) {
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
  const res = await fetch(`${API_BASE}/cardio-sets/?workout=${workoutNum}`, {
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
  const res = await fetch(`${API_BASE}/cardio-sets/?exercise=${exerciseNum}`, {
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
    workout: workoutNum,
    exercise: exerciseNum,
    mode: mapUiCardioModeToApi(mode),
  };
  if (typeof setNumber === 'number') payload.set_number = setNumber;
  if (typeof durationSeconds === "number") payload.duration_seconds = durationSeconds;
  if (typeof distance === "number") payload.distance_meters = distance;
  if (typeof floors === "number") payload.floors = floors;
  if (typeof level === "number") payload.level = level;
  if (typeof splitSeconds === "number") payload.split_seconds = splitSeconds;
  if (typeof spm === "number") payload.spm = spm;

  const res = await fetch(`${API_BASE}/cardio-sets/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
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

  const res = await fetch(`${API_BASE}/cardio-sets/${id}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Update cardio set failed: ${res.status}`);
  const api = (await res.json()) as ApiCardioSet;
  return mapCardioSet(api);
}
