import { useMemo, useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Plus,
  Calendar,
  Trophy,
  Dumbbell,
  TrendingUp,
  Flame,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { mockRoutines } from "@/data/mockData";
import { recommendFirstWorkout, recommendNextRoutine } from "@/lib/onboarding";
import { AppLayout } from "@/components/layout/AppLayout";
import HideNextUpDialog from "@/components/layout/HideNextUpDialog";
import { WorkoutCard } from "@/components/workout/WorkoutCard";
import { StatsCard } from "@/components/workout/StatsCard";
import { useQuery } from "@tanstack/react-query";
import {
  getSets,
  getWorkouts,
  getCardioSetsForWorkout,
  fetchAndPersistProfile,
  getExercises,
} from "@/lib/api";
import type { UiWorkoutSet, UiWorkout } from "@/lib/api";
import { countPrTypesFromSet } from "@/lib/utils";
import {
  startOfWeek,
  endOfWeek,
  isWithinInterval,
  addDays,
  isSameDay,
  startOfToday,
} from "date-fns";
import WorkoutInProgressDialog from "@/components/layout/WorkoutInProgressDialog";
import { rescheduleAllNotifications } from "@/lib/notifications";

import { getToken } from "@/lib/api";

export default function Dashboard() {
  // Trap back navigation on dashboard if authenticated
  useEffect(() => {
    if (getToken()) {
      try {
        // If the user landed here from an external OAuth provider (Google/Supabase),
        // `document.referrer` will include the provider host. Replace the current
        // history entry to remove that external page so Back won't return there.
        const ref = String(document.referrer || "").toLowerCase();
        const isFromOAuth =
          ref.includes("accounts.google.com") ||
          ref.includes("supabase.co") ||
          ref.includes("googleusercontent.com");

        const clean = `${window.location.pathname}${window.location.search}`;
        if (isFromOAuth) {
          try {
            window.history.replaceState({}, document.title, clean);
          } catch {}
        }

        // Push an internal entry to make a stable in-app back target.
        try {
          window.history.pushState({}, document.title, window.location.href);
        } catch {}
      } catch {
        // ignore
      }

      const trap = () => {
        if (getToken()) {
          try {
            window.history.pushState({}, document.title, window.location.href);
          } catch {}
        }
      };
      window.addEventListener("popstate", trap);
      return () => window.removeEventListener("popstate", trap);
    }
  }, []);
  const { data: workouts = [], isLoading } = useQuery({
    queryKey: ["workouts"],
    queryFn: getWorkouts,
  });

  const { data: exercises = [] } = useQuery({
    queryKey: ["exercises"],
    queryFn: getExercises,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Only consider workouts with an end time as completed/logged
  const completedWorkouts = useMemo(
    () => workouts.filter((w) => w.endedAt),
    [workouts],
  );

  // Recent workouts (latest 3 by createdAt desc)
  const recentWorkouts = useMemo(() => {
    return [...completedWorkouts]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 3);
  }, [completedWorkouts]);

  const navigate = useNavigate();
  const [showInProgressDialog, setShowInProgressDialog] = useState(false);

  const [nextSuggested, setNextSuggested] = useState<null | {
    id: string;
    label: string;
  }>(() => {
    try {
      const raw = localStorage.getItem("user:nextSuggestedRoutine");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.id) return parsed;
      }
    } catch {}
    return null;
  });

  // Toggle to force re-evaluation when onboarding/profile is pulled from server
  const [profileFetchToggle, setProfileFetchToggle] = useState(0);

  const prevCompletedCountRef = useRef<number | null>(null);
  // nextSuggested is initialized from localStorage to avoid races
  // with the rotation effect that writes fresh suggestions.
  const [nextUpHidden, setNextUpHidden] = useState(() => {
    try {
      return localStorage.getItem("user:hideNextUp") === "true";
    } catch {
      return false;
    }
  });
  const [showHideDialog, setShowHideDialog] = useState(false);
  const [sessionDismissed, setSessionDismissed] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("user:nextSuggestedRoutine");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.id) setNextSuggested(parsed);
      }
    } catch {}
  }, []);

  // Listen for onboarding/profile saves that recompute Next Up in other tabs/components
  useEffect(() => {
    const onNextUpUpdated = () => {
      try {
        const raw = localStorage.getItem("user:nextSuggestedRoutine");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.id) setNextSuggested(parsed);
        }
      } catch {}
    };
    window.addEventListener("strengthy:nextUpUpdated", onNextUpUpdated);
    return () =>
      window.removeEventListener("strengthy:nextUpUpdated", onNextUpUpdated);
  }, []);

  useEffect(() => {
    // If user has no completed workouts and onboarding is missing, try
    // fetching their profile/onboarding from the server so the Blueprint
    // banner can be shown after a re-login.
    (async () => {
      try {
        if (completedWorkouts.length === 0) {
          const onboardingRaw = localStorage.getItem("user:onboarding");
          if (!onboardingRaw) {
            const ok = await fetchAndPersistProfile();
            if (ok) setProfileFetchToggle((n) => n + 1);
          }
        }
      } catch (e) {
        // ignore
      }
    })();
  }, [completedWorkouts.length]);

  // After a workout is completed, rotate the "Next Up" suggestion
  useEffect(() => {
    // Only rotate on actual new completion, not on initial mount/refresh
    if (prevCompletedCountRef.current === null) {
      prevCompletedCountRef.current = completedWorkouts.length;
      return;
    }
    if (completedWorkouts.length <= prevCompletedCountRef.current) {
      prevCompletedCountRef.current = completedWorkouts.length;
      return;
    }
    prevCompletedCountRef.current = completedWorkouts.length;

    if (completedWorkouts.length === 0) return;

    try {
      const last = [...completedWorkouts].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
      )[0];
      if (!last) return;
      if (!last) return;

      // Find which routine was just completed
      let lastRoutineId: string | null = null;
      try {
        const stateRaw = localStorage.getItem(`workout:state:${last.id}`);
        if (stateRaw) {
          const parsed = JSON.parse(stateRaw as string);
          if (parsed?.routineId) lastRoutineId = parsed.routineId;
        }
      } catch {}
      try {
        if (!lastRoutineId) {
          const raw = localStorage.getItem("user:nextSuggestedRoutine");
          if (raw) {
            const parsed = JSON.parse(raw as string);
            if (parsed?.id) lastRoutineId = parsed.id;
          }
        }
      } catch {}

      // Fallback: check the generic in-progress slot which may have been
      // populated when starting from the blueprint or restoring state.
      try {
        if (!lastRoutineId) {
          const inProg = localStorage.getItem("workout:inProgress");
          if (inProg) {
            const p = JSON.parse(inProg as string);
            if (p?.routineId) lastRoutineId = p.routineId;
          }
        }
      } catch {}

      // Final fallback: derive from the onboarding blueprint (first workout)
      try {
        if (!lastRoutineId) {
          const onboardingRaw = localStorage.getItem("user:onboarding");
          if (onboardingRaw) {
            const bp = recommendFirstWorkout(JSON.parse(onboardingRaw));
            if (bp?.routine?.id) lastRoutineId = bp.routine.id;
          }
        }
      } catch {}

      if (!lastRoutineId) return;

      // Collect last 3 routine IDs to avoid immediate repeats
      const recentIds: string[] = [];
      try {
        completedWorkouts
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          .slice(0, 3)
          .forEach((w) => {
            try {
              const raw = localStorage.getItem(`workout:state:${w.id}`);
              if (raw) {
                const p = JSON.parse(raw);
                if (p?.routineId) recentIds.push(p.routineId);
              }
            } catch {}
          });
      } catch {}

      const suggested = recommendNextRoutine(lastRoutineId, recentIds);
      if (suggested?.routine && suggested.routine.id !== lastRoutineId) {
        const next = { id: suggested.routine.id, label: suggested.label };
        try {
          localStorage.setItem(
            "user:nextSuggestedRoutine",
            JSON.stringify(next),
          );
        } catch {}
        setNextSuggested(next);
      }
    } catch {}
  }, [completedWorkouts.length]);

  // Date ranges
  const thisWeekRange = useMemo(() => {
    const start = startOfWeek(new Date(), { weekStartsOn: 1 });
    const end = endOfWeek(new Date(), { weekStartsOn: 1 });
    return { start, end };
  }, []);

  const lastWeekRange = useMemo(() => {
    const end = startOfWeek(new Date(), { weekStartsOn: 1 });
    const start = new Date(end);
    start.setDate(start.getDate() - 7);
    return { start, end: new Date(end.getTime() - 1) };
  }, []);

  const prevWeekRange = useMemo(() => {
    const end = startOfWeek(new Date(), { weekStartsOn: 1 });
    const prevEnd = new Date(end);
    prevEnd.setDate(prevEnd.getDate() - 7);
    const prevStart = new Date(prevEnd);
    prevStart.setDate(prevStart.getDate() - 7);
    return { start: prevStart, end: new Date(prevEnd.getTime() - 1) };
  }, []);

  const workoutsThisWeek = useMemo(
    () =>
      completedWorkouts.filter((w) =>
        isWithinInterval(w.date, {
          start: thisWeekRange.start,
          end: thisWeekRange.end,
        }),
      ),
    [completedWorkouts, thisWeekRange],
  );
  const workoutsLastWeek = useMemo(
    () =>
      completedWorkouts.filter((w) =>
        isWithinInterval(w.date, {
          start: lastWeekRange.start,
          end: lastWeekRange.end,
        }),
      ),
    [completedWorkouts, lastWeekRange],
  );
  const workoutsPrevWeek = useMemo(
    () =>
      completedWorkouts.filter((w) =>
        isWithinInterval(w.date, {
          start: prevWeekRange.start,
          end: prevWeekRange.end,
        }),
      ),
    [completedWorkouts, prevWeekRange],
  );

  // Fetch sets for last week and previous week to compute PRs and total sets
  const { data: setsByWorkoutLastWeek = {} } = useQuery({
    queryKey: ["setsByWorkout", workoutsLastWeek.map((w) => w.id)],
    queryFn: async () => {
      const entries = await Promise.all(
        workoutsLastWeek.map(async (w) => [w.id, await getSets(w.id)] as const),
      );
      return Object.fromEntries(entries) as Record<string, UiWorkoutSet[]>;
    },
    enabled: workoutsLastWeek.length > 0,
  });

  const { data: setsByWorkoutThisWeek = {} } = useQuery({
    queryKey: ["setsByWorkoutThis", workoutsThisWeek.map((w) => w.id)],
    queryFn: async () => {
      const entries = await Promise.all(
        workoutsThisWeek.map(async (w) => [w.id, await getSets(w.id)] as const),
      );
      return Object.fromEntries(entries) as Record<string, UiWorkoutSet[]>;
    },
    enabled: workoutsThisWeek.length > 0,
  });

  const { data: cardioSetsByWorkoutThisWeek = {} } = useQuery({
    queryKey: ["cardioSetsByWorkoutThis", workoutsThisWeek.map((w) => w.id)],
    queryFn: async () => {
      const entries = await Promise.all(
        workoutsThisWeek.map(
          async (w) => [w.id, await getCardioSetsForWorkout(w.id)] as const,
        ),
      );
      return Object.fromEntries(entries) as Record<string, any[]>;
    },
    enabled: workoutsThisWeek.length > 0,
  });

  const { data: setsByWorkoutPrevWeek = {} } = useQuery({
    queryKey: ["setsByWorkoutPrev", workoutsPrevWeek.map((w) => w.id)],
    queryFn: async () => {
      const entries = await Promise.all(
        workoutsPrevWeek.map(async (w) => [w.id, await getSets(w.id)] as const),
      );
      return Object.fromEntries(entries) as Record<string, UiWorkoutSet[]>;
    },
    enabled: workoutsPrevWeek.length > 0,
  });

  const { data: cardioSetsByWorkoutPrevWeek = {} } = useQuery({
    queryKey: ["cardioSetsByWorkoutPrev", workoutsPrevWeek.map((w) => w.id)],
    queryFn: async () => {
      const entries = await Promise.all(
        workoutsPrevWeek.map(
          async (w) => [w.id, await getCardioSetsForWorkout(w.id)] as const,
        ),
      );
      return Object.fromEntries(entries) as Record<string, any[]>;
    },
    enabled: workoutsPrevWeek.length > 0,
  });

  const { data: cardioSetsByWorkoutLastWeek = {} } = useQuery({
    queryKey: ["cardioSetsByWorkout", workoutsLastWeek.map((w) => w.id)],
    queryFn: async () => {
      const entries = await Promise.all(
        workoutsLastWeek.map(
          async (w) => [w.id, await getCardioSetsForWorkout(w.id)] as const,
        ),
      );
      return Object.fromEntries(entries) as Record<string, any[]>;
    },
    enabled: workoutsLastWeek.length > 0,
  });

  const { data: allTimeSetsByWorkout = {} } = useQuery({
    queryKey: [
      "setsByWorkoutAllTime",
      completedWorkouts.map((w) => w.id).sort(),
    ],
    queryFn: async () => {
      const entries = await Promise.all(
        completedWorkouts.map(
          async (w) => [w.id, await getSets(w.id)] as const,
        ),
      );
      return Object.fromEntries(entries) as Record<string, UiWorkoutSet[]>;
    },
    enabled: completedWorkouts.length > 0,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: allTimeCardioSetsByWorkout = {} } = useQuery({
    queryKey: [
      "cardioSetsByWorkoutAllTime",
      completedWorkouts.map((w) => w.id).sort(),
    ],
    queryFn: async () => {
      const entries = await Promise.all(
        completedWorkouts.map(
          async (w) => [w.id, await getCardioSetsForWorkout(w.id)] as const,
        ),
      );
      return Object.fromEntries(entries) as Record<string, any[]>;
    },
    enabled: completedWorkouts.length > 0,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Metrics
  const thisWeekCount = workoutsThisWeek.length;
  // Count distinct days with at least one workout this week
  const workoutsThisWeekDistinctDays = useMemo(() => {
    try {
      const set = new Set<string>();
      workoutsThisWeek.forEach((w) => {
        try {
          set.add(new Date(w.date).toDateString());
        } catch (e) {}
      });
      return set.size;
    } catch {
      return 0;
    }
  }, [workoutsThisWeek]);
  const prsThisWeek = (() => {
    if (workoutsThisWeek.length === 0) return 0;
    const strength = Object.values(setsByWorkoutThisWeek).flat();
    const cardio = Object.values(cardioSetsByWorkoutThisWeek).flat();
    return [...strength, ...cardio].reduce(
      (sum, s) => sum + countPrTypesFromSet(s),
      0,
    );
  })();

  const prsLastWeek = (() => {
    if (workoutsLastWeek.length === 0) return 0;
    const strength = Object.values(setsByWorkoutLastWeek).flat();
    const cardio = Object.values(cardioSetsByWorkoutLastWeek).flat();
    return [...strength, ...cardio].reduce(
      (sum, s) => sum + countPrTypesFromSet(s),
      0,
    );
  })();
  const prTrendPercent = (() => {
    if (prsLastWeek === 0) return prsThisWeek > 0 ? 100 : 0;
    return Math.round(((prsThisWeek - prsLastWeek) / prsLastWeek) * 100);
  })();
  const prTrendPositive = prsThisWeek >= prsLastWeek;

  const setsThisWeek = (() => {
    if (workoutsThisWeek.length === 0) return 0;
    const strengthCount = Object.values(setsByWorkoutThisWeek).reduce(
      (acc, sets) => acc + sets.length,
      0,
    );
    const cardioCount = Object.values(cardioSetsByWorkoutThisWeek).reduce(
      (acc, sets) => acc + sets.length,
      0,
    );
    return strengthCount + cardioCount;
  })();

  const setsLastWeek = (() => {
    if (workoutsLastWeek.length === 0) return 0;
    const strengthCount = Object.values(setsByWorkoutLastWeek).reduce(
      (acc, sets) => acc + sets.length,
      0,
    );
    const cardioCount = Object.values(cardioSetsByWorkoutLastWeek).reduce(
      (acc, sets) => acc + sets.length,
      0,
    );
    return strengthCount + cardioCount;
  })();
  const setsTrendPercent = (() => {
    if (setsLastWeek === 0) return setsThisWeek > 0 ? 100 : 0;
    return Math.round(((setsThisWeek - setsLastWeek) / setsLastWeek) * 100);
  })();
  const setsTrendPositive = setsThisWeek >= setsLastWeek;

  const avgDuration = useMemo(() => {
    const durations = completedWorkouts
      .map((w) => w.duration)
      .filter((d): d is number => typeof d === "number");
    if (durations.length === 0) return 0;
    return Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
  }, [completedWorkouts]);

  const personalRecords = useMemo(() => {
    type RecordItem = {
      exerciseId: string;
      exerciseName: string;
      value: string;
      detail: string;
      prType: string;
      prTypes: { label: string; value: string }[];
      score: number;
      createdAt: number;
      workoutId: string;
    };

    const nameByExerciseId = new Map<string, string>(
      (exercises as Array<{ id: string | number; name: string }>).map((ex) => [
        String(ex.id),
        ex.name,
      ]),
    );

    const allSets = [
      ...Object.entries(allTimeSetsByWorkout).flatMap(([wid, sets]) =>
        sets.map((s) => ({ ...s, _workoutId: wid })),
      ),
      ...Object.entries(allTimeCardioSetsByWorkout).flatMap(([wid, sets]) =>
        sets.map((s: any) => ({ ...s, _workoutId: wid })),
      ),
    ];

    const buildTopPerExercise = (requirePrFlag: boolean): RecordItem[] => {
      const bestByExercise = new Map<string, RecordItem>();

      allSets.forEach((set) => {
        const hasTypedPr = !!(
          set.absWeightPR ||
          set.e1rmPR ||
          set.volumePR ||
          set.repPR ||
          set.distancePR ||
          set.pacePR ||
          set.ascentPR ||
          set.intensityPR ||
          set.splitPR
        );
        if (requirePrFlag && !set.isPR && !hasTypedPr) return;

        const weight = typeof set.weight === "number" ? set.weight : 0;
        const reps = typeof set.reps === "number" ? set.reps : 0;
        const distance =
          typeof (set as any).distance === "number" ? (set as any).distance : 0;
        const duration =
          typeof (set as any).durationSeconds === "number"
            ? (set as any).durationSeconds
            : 0;
        if (weight <= 0 && reps <= 0 && distance <= 0 && duration <= 0) return;

        const exerciseId = String(set.exercise);
        const exerciseName =
          nameByExerciseId.get(exerciseId) || `Exercise ${exerciseId}`;
        const prType = set.absWeightPR
          ? "Heaviest Weight"
          : set.e1rmPR
            ? "Best 1RM"
            : set.volumePR
              ? "Best Set Volume"
              : set.distancePR
                ? "Distance PR"
                : set.pacePR
                  ? "Pace PR"
                  : set.ascentPR
                    ? "Ascent PR"
                    : set.intensityPR
                      ? "Intensity PR"
                      : set.splitPR
                        ? "Split PR"
                        : "PR";

        const value =
          weight > 0
            ? `${weight} ${set.unit || "kg"}`
            : distance > 0
              ? `${(distance / 1000).toFixed(2)} km`
              : duration > 0
                ? `${Math.round(duration / 60)} min`
                : `${reps} rep${reps === 1 ? "" : "s"}`;
        const detail =
          weight > 0
            ? `${reps} rep${reps === 1 ? "" : "s"}`
            : duration > 0
              ? `${Math.round(duration / 60)} min`
              : "Cardio";
        const prTypes: { label: string; value: string }[] = [];
        if (set.absWeightPR) {
          prTypes.push({
            label: "Heaviest Weight",
            value: weight > 0 ? `${weight} ${set.unit || "kg"}` : "-",
          });
        }
        if (set.e1rmPR) {
          const e1rm = weight > 0 ? (weight * (1 + reps / 30)).toFixed(1) : "-";
          prTypes.push({
            label: "Best 1RM",
            value: weight > 0 ? `${e1rm} ${set.unit || "kg"}` : "-",
          });
        }
        if (set.volumePR) {
          const vol = weight > 0 ? (weight * reps).toFixed(1) : "-";
          prTypes.push({
            label: "Best Set Volume",
            value: weight > 0 ? `${vol} ${set.unit || "kg"}` : "-",
          });
        }
        if (
          prTypes.length === 0 &&
          (set.isPR ||
            set.distancePR ||
            set.pacePR ||
            set.ascentPR ||
            set.intensityPR ||
            set.splitPR)
        ) {
          prTypes.push({ label: "PR", value });
        }

        const createdAt =
          set.createdAt instanceof Date ? set.createdAt.getTime() : 0;

        const candidate: RecordItem = {
          exerciseId,
          exerciseName,
          value,
          detail,
          prType,
          prTypes,
          score: createdAt,
          createdAt,
          workoutId: (set as any)._workoutId || "",
        };

        const current = bestByExercise.get(exerciseId);
        if (!current || candidate.createdAt > current.createdAt) {
          bestByExercise.set(exerciseId, candidate);
        }
      });

      return Array.from(bestByExercise.values());
    };

    const withPrFlag = buildTopPerExercise(true);

    // Sort by most recent first — acts as a "Recent PRs" feed
    return withPrFlag.sort((a, b) => b.createdAt - a.createdAt).slice(0, 5);
  }, [allTimeSetsByWorkout, allTimeCardioSetsByWorkout, exercises]);

  // Weekly plan
  const monthlyGoal = useMemo(() => {
    try {
      const raw = localStorage.getItem("user:monthlyGoal");
      const onboardingRaw = localStorage.getItem("user:onboarding");

      let parsed = parseInt(raw || "0");

      if (!parsed || isNaN(parsed)) {
        if (onboardingRaw) {
          const onboarding = JSON.parse(onboardingRaw);
          parsed = parseInt(onboarding?.monthlyWorkouts || "0");
        }
      }

      return isNaN(parsed) || parsed < 4 ? 12 : parsed;
    } catch {
      return 12;
    }
  }, []);
  const weeklyTarget = Math.min(7, Math.max(2, Math.floor(monthlyGoal / 4)));
  const daySchedules: Record<number, number[]> = {
    2: [1, 4],
    3: [1, 3, 5],
    4: [1, 2, 4, 5],
    5: [1, 2, 3, 5, 6],
    6: [1, 2, 3, 4, 5, 6],
    7: [0, 1, 2, 3, 4, 5, 6],
  };
  const scheduledDays = daySchedules[weeklyTarget] ?? daySchedules[3];
  const todayDayOfWeek = new Date().getDay();
  const todayIsScheduled = scheduledDays.includes(todayDayOfWeek);
  const todayDone = completedWorkouts.some((w) =>
    isSameDay(w.date, new Date()),
  );

  const todayRoutine = useMemo(() => {
    // If no workouts completed yet, use the onboarding "Blueprint"
    if (completedWorkouts.length === 0) {
      try {
        const onboardingRaw = localStorage.getItem("user:onboarding");
        if (onboardingRaw) {
          const onboardingData = JSON.parse(onboardingRaw);
          const blueprint = recommendFirstWorkout(onboardingData);
          return blueprint.routine;
        }
      } catch (e) {
        // fall through to nextSuggested or default
        console.error("Failed to load blueprint", e);
      }
    }

    // If there is at least one completed workout, prefer the saved next suggestion
    if (nextSuggested?.id) {
      const rt = mockRoutines.find((r) => r.id === nextSuggested.id);
      if (rt) return rt;
    }

    return mockRoutines[0] ?? null;
  }, [nextSuggested, completedWorkouts.length]);

  const todayRoutineName = todayRoutine?.name ?? "Your workout";

  // Banner data: show onboarding blueprint when user has no completed workouts,
  // otherwise show the persisted 'nextSuggested' routine.
  const bannerData = useMemo(() => {
    try {
      if (completedWorkouts.length === 0) {
        const onboardingRaw = localStorage.getItem("user:onboarding");
        if (onboardingRaw) {
          const onboardingData = JSON.parse(onboardingRaw);
          const bp = recommendFirstWorkout(onboardingData);
          return {
            routine: bp.routine,
            label: bp.label,
            title: "Your Blueprint",
          };
        }
        return null;
      }

      if (nextSuggested?.id) {
        const rt = mockRoutines.find((r) => r.id === nextSuggested.id) ?? null;
        return { routine: rt, label: nextSuggested.label, title: "Next Up" };
      }
      return null;
    } catch (e) {
      return null;
    }
  }, [completedWorkouts.length, nextSuggested]);

  const weeklyStreak = useMemo(() => {
    const wTarget = Math.min(7, Math.max(2, Math.floor(monthlyGoal / 4)));
    let streak = 0;
    let weekOffset = 1;
    while (true) {
      const weekStart = startOfWeek(
        new Date(Date.now() - weekOffset * 7 * 24 * 60 * 60 * 1000),
        { weekStartsOn: 1 },
      );
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      const workoutsInWeek = completedWorkouts.filter((w) =>
        isWithinInterval(w.date, { start: weekStart, end: weekEnd }),
      );
      if (workoutsInWeek.length >= wTarget) {
        streak++;
        weekOffset++;
      } else {
        break;
      }
    }
    return streak;
  }, [completedWorkouts, monthlyGoal]);

  useEffect(() => {
    if (completedWorkouts.length === 0) return;

    // Build routine name map for each scheduled day
    const routineNames: Record<number, string> = {};
    scheduledDays.forEach((day, idx) => {
      const routine = mockRoutines[idx % mockRoutines.length];
      routineNames[day] = routine?.name ?? "Workout";
    });

    // Ensure today's notification uses the same routine shown in "Next Up"/banner
    try {
      if (todayIsScheduled && todayRoutineName) {
        routineNames[todayDayOfWeek] = todayRoutineName;
      }
    } catch {}

    const justHitTarget =
      workoutsThisWeekDistinctDays > 0 &&
      workoutsThisWeekDistinctDays === weeklyTarget;

    rescheduleAllNotifications({
      scheduledDays,
      routineNames,
      workoutsThisWeek: workoutsThisWeekDistinctDays,
      weeklyTarget,
      currentStreak: weeklyStreak,
      justCompletedWeeklyTarget: justHitTarget,
      reminderHour: 8,
    });
  }, [completedWorkouts.length, weeklyTarget, weeklyStreak]);

  const relativeTime = (ts: number) => {
    if (!ts) return null;
    const diff = Date.now() - ts;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    return `${Math.floor(days / 30)}mo ago`;
  };

  const [expandedPR, setExpandedPR] = useState<string | null>(null);

  return (
    <AppLayout noPaddingTop>
      <div className="space-y-8 pt-2">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {(() => {
              const hour = new Date().getHours();
              const greeting =
                hour < 12
                  ? "Good morning"
                  : hour < 17
                    ? "Good afternoon"
                    : "Good evening";
              let name = "Athlete";
              try {
                const raw = localStorage.getItem("user:profile");
                if (raw) {
                  const parsed = JSON.parse(raw);
                  const first = (parsed.name || "").split(" ")[0];
                  if (first) name = first;
                }
              } catch {}
              return (
                <>
                  <h1 className="font-heading text-3xl font-bold text-white leading-tight">
                    {greeting},{" "}
                    <span
                      className="inline-block max-w-[55vw] truncate align-bottom"
                      title={name}
                    >
                      {name}!
                    </span>
                  </h1>
                  <p className="text-muted-foreground mt-1">
                    Track your progress and recent workouts
                  </p>
                </>
              );
            })()}
          </div>
          <Button
            onClick={() => {
              try {
                const inProg = localStorage.getItem("workout:inProgress");
                if (inProg) {
                  setShowInProgressDialog(true);
                  return;
                }
              } catch {}
              navigate("/workouts/new", { state: { forceNew: true } });
            }}
          >
            <Plus className="h-4 w-4" />
            New Workout
          </Button>
        </div>

        {/* Stats */}
        {/* Next Up (post-first-workout) */}
        {/* Banner: show onboarding blueprint when no completed workouts, otherwise show Next Up */}
        {bannerData &&
          !nextUpHidden &&
          !sessionDismissed &&
          (() => {
            const rt = bannerData.routine;
            const routineName =
              rt?.name || bannerData.label.replace(/^Next:\s*/i, "");
            const exerciseCount = rt?.exercises?.length ?? 0;

            return (
              <div className="rounded-2xl bg-gradient-to-r from-orange-500/10 to-orange-600/5 border border-orange-500/20 p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-orange-400/70">
                    {bannerData.title}
                  </p>
                  {completedWorkouts.length >= 3 && (
                    <button
                      type="button"
                      onClick={() => setShowHideDialog(true)}
                      className="text-zinc-600 hover:text-zinc-400 transition-colors"
                      title="Hide suggestions"
                      aria-label="Hide suggestions"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-white text-base truncate">
                      {routineName}
                    </p>
                    {exerciseCount > 0 && (
                      <p className="text-xs text-zinc-400 mt-0.5">
                        {exerciseCount} exercises
                        {completedWorkouts.length === 0
                          ? " · Recommended for your Blueprint"
                          : completedWorkouts.length === 1
                            ? " · Recommended after your first workout"
                            : " · Based on your last workout"}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        try {
                          if (rt) {
                            if (completedWorkouts.length === 0) {
                              // starting from blueprint: don't remove nextSuggested
                              navigate("/workouts/new", {
                                state: { routine: rt, forceNew: true },
                              });
                              return;
                            }
                            // for Next Up, clear persisted suggestion and start
                            localStorage.removeItem(
                              "user:nextSuggestedRoutine",
                            );
                            setNextSuggested(null);
                            navigate("/workouts/new", {
                              state: { routine: rt, forceNew: true },
                            });
                          }
                        } catch (e) {}
                      }}
                      className="px-3 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold transition-colors"
                    >
                      Start
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        try {
                          if (rt) {
                            const firstDone = !!localStorage.getItem(
                              "user:firstWorkoutCompleted",
                            );
                            navigate(`/routines/${rt.id}/view`, {
                              state: {
                                routine: rt,
                                fromOnboarding: !firstDone,
                              },
                            });
                          }
                        } catch (e) {}
                      }}
                      className="px-3 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] border border-white/10 text-white text-sm font-semibold transition-colors"
                    >
                      Preview
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}

        {/* Weekly Plan */}
        {completedWorkouts.length > 0 && (
          <section className="w-full">
            <div className="rounded-2xl bg-card border border-border p-4 max-w-2xl">
              {/* Weekly plan header */}
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Weekly Plan
                </p>
                <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">
                  {weeklyTarget}x / week
                </span>
              </div>
              {/* Streak banner */}
              {weeklyStreak > 0 ? (
                <div className="flex items-center gap-2 mb-4 pb-4 border-b border-white/[0.06]">
                  <div className="h-8 w-8 rounded-lg bg-orange-500/15 flex items-center justify-center">
                    <Flame className="h-4 w-4 text-orange-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {weeklyStreak} week streak 🔥
                    </p>
                    <p className="text-xs text-zinc-400">
                      Hit your target {weeklyStreak} week
                      {weeklyStreak > 1 ? "s" : ""} in a row
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 mb-4 pb-4 border-b border-white/[0.06]">
                  <div className="h-8 w-8 rounded-lg bg-zinc-800 flex items-center justify-center">
                    <Flame className="h-4 w-4 text-zinc-500" />
                  </div>
                  {(() => {
                    const remaining = Math.max(
                      0,
                      weeklyTarget - workoutsThisWeekDistinctDays,
                    );
                    // Days remaining in the current Mon-Sun week (week ends Sunday)
                    const daysRemaining =
                      new Date().getDay() === 0 ? 0 : 7 - new Date().getDay();
                    const tooLate = remaining > 0 && remaining > daysRemaining;

                    return remaining === 0 ? (
                      <p className="text-sm text-zinc-400">
                        Target hit! Keep the streak going next week 🎯
                      </p>
                    ) : tooLate ? (
                      <p className="text-sm text-zinc-400">
                        {workoutsThisWeekDistinctDays}/{weeklyTarget} this week
                        · Fresh start Monday 💪
                      </p>
                    ) : (
                      <p className="text-sm text-zinc-400">
                        {remaining} more workout{remaining > 1 ? "s" : ""} to
                        hit your target this week
                      </p>
                    );
                  })()}
                </div>
              )}

              {/* Day pills */}
              <div className="flex justify-between items-center gap-1 px-1">
                {(["M", "T", "W", "T", "F", "S", "S"] as const).map(
                  (letter, idx) => {
                    const dayOfWeek = idx + 1 === 7 ? 0 : idx + 1;
                    const pillDate = addDays(thisWeekRange.start, idx);
                    const isToday = dayOfWeek === todayDayOfWeek;
                    const isDone = completedWorkouts.some((w) => {
                      const wDate = new Date(w.date);
                      return wDate.toDateString() === pillDate.toDateString();
                    });
                    const isPast = pillDate < startOfToday();

                    const status = (() => {
                      if (isDone) return "done"; // always show done if worked out, regardless of schedule
                      if (!scheduledDays.includes(dayOfWeek)) return "rest";
                      if (isToday) return "today";
                      if (isPast) return "missed";
                      return "upcoming";
                    })();

                    const pillBg = {
                      done: "bg-orange-500 text-white",
                      today:
                        "bg-orange-500/20 border border-orange-500/50 text-orange-400",
                      missed: "bg-zinc-800 text-zinc-500",
                      upcoming: "bg-zinc-800/50 text-zinc-400",
                      rest: "text-zinc-700",
                    }[status];

                    return (
                      <div
                        key={idx}
                        className={`flex flex-col items-center gap-1 w-9 h-12 justify-center rounded-xl ${pillBg}`}
                      >
                        <span
                          className={`text-xs font-medium${
                            status === "missed" ? " line-through" : ""
                          }`}
                        >
                          {letter}
                        </span>
                        <div className="h-3 flex items-center justify-center">
                          {status === "done" && (
                            <span className="text-[10px] leading-none">✓</span>
                          )}
                          {status === "today" && (
                            <div className="h-1.5 w-1.5 rounded-full bg-orange-400" />
                          )}
                        </div>
                      </div>
                    );
                  },
                )}
              </div>

              {/* Today's workout CTA */}
              {todayIsScheduled && !todayDone && todayRoutine && (
                <div className="mt-4 pt-4 border-t border-white/[0.06] flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-zinc-400">Today's workout</p>
                    <p className="text-sm font-semibold text-white">
                      {todayRoutineName}
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      navigate("/workouts/new", {
                        state: { routine: todayRoutine, forceNew: true },
                      })
                    }
                    className="px-3 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold transition-colors shrink-0"
                  >
                    Start
                  </button>
                </div>
              )}

              {/* Rest day */}
              {!scheduledDays.includes(todayDayOfWeek) &&
                workoutsThisWeekDistinctDays < weeklyTarget && (
                  <p className="mt-3 text-center text-xs text-zinc-500">
                    Rest day — recovery is part of the plan
                  </p>
                )}
            </div>
          </section>
        )}

        <section className="space-y-3">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatsCard
              label="This Week"
              value={isLoading ? "--" : `${thisWeekCount} workouts`}
              icon={<Calendar className="h-5 w-5" />}
              trend={undefined}
            />
            <StatsCard
              label="Personal Records"
              value={isLoading ? "--" : prsThisWeek}
              icon={<Trophy className="h-5 w-5" />}
              trend={{ value: prTrendPercent, isPositive: prTrendPositive }}
            />
            <StatsCard
              label="Total Sets"
              value={isLoading ? "--" : setsThisWeek}
              icon={<Dumbbell className="h-5 w-5" />}
              trend={{ value: setsTrendPercent, isPositive: setsTrendPositive }}
            />
            <StatsCard
              label="Avg. Duration"
              value={isLoading ? "--" : `${avgDuration} min`}
              icon={<TrendingUp className="h-5 w-5" />}
            />
          </div>
        </section>

        {/* Recent Workouts */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-heading text-xl font-semibold text-white">
              Recent Workouts
            </h2>
            <Link to="/workouts">
              <Button variant="ghost" size="sm" className="text-white">
                View All
              </Button>
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {recentWorkouts.map((workout) => (
              <WorkoutCard
                key={workout.id}
                workout={workout as unknown as UiWorkout}
                onClick={() => navigate(`/workouts/${workout.id}/view`)}
              />
            ))}
          </div>
          {recentWorkouts.length === 0 && !isLoading && (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 py-16 text-center">
              <div className="h-12 w-12 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
                <Dumbbell className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-white font-semibold">No workouts yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Start your first workout to see it here
              </p>
              <Button
                className="mt-4"
                onClick={() =>
                  navigate("/workouts/new", { state: { forceNew: true } })
                }
              >
                <Plus className="h-4 w-4 mr-1" /> Start Workout
              </Button>
            </div>
          )}
        </div>

        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="font-heading text-xl font-semibold text-white">
              Recent PRs
            </h2>
            <Link
              to="/workouts"
              className="text-xs text-muted-foreground hover:text-white transition-colors"
            >
              View history
            </Link>
          </div>

          {personalRecords.length > 0 ? (
            <div className="space-y-3">
              {personalRecords.map((record) => {
                const isExpanded = expandedPR === record.exerciseId;
                const prCount = record.prTypes.length;
                const time = relativeTime(record.createdAt);
                return (
                  <div
                    key={record.exerciseId}
                    className="rounded-2xl bg-card border border-border overflow-hidden"
                  >
                    <div className="flex items-center">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedPR(isExpanded ? null : record.exerciseId)
                        }
                        className="min-w-0 flex-1 flex items-center justify-between bg-transparent px-4 py-3.5 text-left focus-visible:outline-none active:bg-transparent [-webkit-tap-highlight-color:transparent]"
                      >
                        <div className="min-w-0 flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-yellow-500/10">
                            <Trophy className="h-3.5 w-3.5 text-yellow-500" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-white leading-tight">
                              {record.exerciseName}
                            </p>
                            <p className="text-xs text-zinc-500 mt-0.5">
                              {prCount === 1
                                ? record.prType
                                : record.prTypes[0].label}
                              {time && (
                                <>
                                  {" "}
                                  · <span>{time}</span>
                                </>
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="shrink-0 ml-2 sm:ml-4 flex items-center gap-1.5 sm:gap-2">
                          {prCount > 1 && (
                            <span className="hidden sm:inline-flex text-[10px] font-bold text-orange-400 bg-orange-500/15 border border-orange-500/20 rounded-full px-2 py-0.5">
                              {prCount} PRs
                            </span>
                          )}
                          <span className="font-heading text-sm sm:text-base font-bold text-white whitespace-nowrap">
                            {record.value}
                          </span>
                        </div>
                      </button>
                      {record.workoutId && (
                        <button
                          type="button"
                          onClick={() =>
                            navigate(`/workouts/${record.workoutId}/view`)
                          }
                          className="shrink-0 pr-3 sm:pr-4 pl-1 py-3.5 text-zinc-400 hover:text-zinc-200 focus-visible:outline-none active:bg-transparent [-webkit-tap-highlight-color:transparent]"
                          title="View workout"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                            <polyline points="15 3 21 3 21 9" />
                            <line x1="10" y1="14" x2="21" y2="3" />
                          </svg>
                        </button>
                      )}
                    </div>

                    {isExpanded && (
                      <div className="px-4 pb-3 pt-0">
                        <div className="space-y-2">
                          {record.prTypes.map((pt) => (
                            <div
                              key={pt.label}
                              className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2"
                            >
                              <span className="text-xs text-zinc-500">
                                {pt.label}
                              </span>
                              <span className="text-xs font-semibold text-white">
                                {pt.value}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl bg-card border border-border px-5 py-8 text-center">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800">
                <Trophy className="h-4 w-4 text-zinc-500" />
              </div>
              <p className="text-sm font-semibold text-white">No PRs yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Hit a PR in a workout and it'll show up here.
              </p>
            </div>
          )}
        </section>
      </div>

      <WorkoutInProgressDialog
        open={showInProgressDialog}
        onOpenChange={setShowInProgressDialog}
        onResume={() => navigate("/workouts/new")}
      />
      <HideNextUpDialog
        open={showHideDialog}
        onKeep={() => setShowHideDialog(false)}
        onSessionDismiss={() => {
          setShowHideDialog(false);
          setSessionDismissed(true);
        }}
        onTurnOff={() => {
          try {
            localStorage.setItem("user:hideNextUp", "true");
          } catch {}
          setNextUpHidden(true);
          setShowHideDialog(false);
        }}
      />
    </AppLayout>
  );
}
