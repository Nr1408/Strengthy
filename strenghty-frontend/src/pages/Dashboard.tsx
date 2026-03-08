import { useMemo, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Plus,
  Calendar,
  Trophy,
  Dumbbell,
  TrendingUp,
  Flame,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { mockRoutines } from "@/data/mockData";
import { AppLayout } from "@/components/layout/AppLayout";
import { WorkoutCard } from "@/components/workout/WorkoutCard";
import { StatsCard } from "@/components/workout/StatsCard";
import { useQuery } from "@tanstack/react-query";
import { getSets, getWorkouts, getCardioSetsForWorkout } from "@/lib/api";
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

export default function Dashboard() {
  const { data: workouts = [], isLoading } = useQuery({
    queryKey: ["workouts"],
    queryFn: getWorkouts,
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
  }>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("user:nextSuggestedRoutine");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.id) setNextSuggested(parsed);
      }
    } catch (e) {
      setNextSuggested(null);
    }
  }, []);

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

  // Metrics
  const thisWeekCount = workoutsThisWeek.length;
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
    if (nextSuggested?.id) {
      const rt = mockRoutines.find((r) => r.id === nextSuggested.id);
      if (rt) return rt;
    }
    return mockRoutines[0] ?? null;
  }, [nextSuggested]);

  const todayRoutineName = todayRoutine?.name ?? "Your workout";

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

    const justHitTarget =
      workoutsThisWeek.length > 0 && workoutsThisWeek.length === weeklyTarget;

    rescheduleAllNotifications({
      scheduledDays,
      routineNames,
      workoutsThisWeek: workoutsThisWeek.length,
      weeklyTarget,
      currentStreak: weeklyStreak,
      justCompletedWeeklyTarget: justHitTarget,
      reminderHour: 8,
    });
  }, [completedWorkouts.length, weeklyTarget, weeklyStreak]);

  return (
    <AppLayout>
      <div className="space-y-8">
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
                  <h1 className="font-heading text-3xl font-bold text-white">
                    {greeting}, {name} !
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
        {nextSuggested &&
          (() => {
            const rt = mockRoutines.find((r) => r.id === nextSuggested.id);
            // Clean the label — strip "Next: " prefix if present
            const routineName =
              rt?.name || nextSuggested.label.replace(/^Next:\s*/i, "");
            const exerciseCount = rt?.exercises?.length ?? 0;

            return (
              <div className="rounded-2xl bg-gradient-to-r from-orange-500/10 to-orange-600/5 border border-orange-500/20 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-orange-400/70 mb-2">
                  Next Up
                </p>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-white text-base truncate">
                      {routineName}
                    </p>
                    {exerciseCount > 0 && (
                      <p className="text-xs text-zinc-400 mt-0.5">
                        {exerciseCount} exercises · Recommended after your first
                        workout
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        try {
                          if (rt) {
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
                          if (rt)
                            navigate(`/routines/${rt.id}/view`, {
                              state: { routine: rt },
                            });
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
                      weeklyTarget - workoutsThisWeek.length,
                    );
                    return remaining > 0 ? (
                      <p className="text-sm text-zinc-400">
                        {remaining} more workout{remaining > 1 ? "s" : ""} to
                        hit your target this week
                      </p>
                    ) : (
                      <p className="text-sm text-zinc-400">
                        Target hit! Keep the streak going next week 🎯
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
                      if (!scheduledDays.includes(dayOfWeek)) return "rest";
                      if (isDone) return "done";
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
                workoutsThisWeek.length < weeklyTarget && (
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
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
            Quick Actions
          </h2>
          <div className="rounded-2xl bg-card border border-border p-5">
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
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
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-500/15 text-orange-400 text-sm font-semibold border border-orange-500/25 hover:bg-orange-500/25 transition-colors"
              >
                <Plus className="h-4 w-4" /> Empty Workout
              </button>
              <button
                type="button"
                onClick={() => navigate("/routines")}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-800 text-white text-sm font-semibold border border-white/10 hover:border-white/25 transition-colors"
              >
                Start from Routine
              </button>
              <button
                type="button"
                onClick={() => navigate("/exercises")}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-800 text-white text-sm font-semibold border border-white/10 hover:border-white/25 transition-colors"
              >
                Manage Exercises
              </button>
            </div>
          </div>
        </section>
      </div>

      <WorkoutInProgressDialog
        open={showInProgressDialog}
        onOpenChange={setShowInProgressDialog}
        onResume={() => navigate("/workouts/new")}
      />
    </AppLayout>
  );
}
