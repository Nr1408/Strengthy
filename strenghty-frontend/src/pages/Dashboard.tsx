import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Calendar, Trophy, Dumbbell, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/layout/AppLayout";
import { WorkoutCard } from "@/components/workout/WorkoutCard";
import { StatsCard } from "@/components/workout/StatsCard";
import { useQuery } from "@tanstack/react-query";
import { getSets, getWorkouts } from "@/lib/api";
import type { UiWorkoutSet, UiWorkout } from "@/lib/api";
import { startOfWeek, endOfWeek, isWithinInterval } from "date-fns";

export default function Dashboard() {
  const { data: workouts = [], isLoading } = useQuery({
    queryKey: ["workouts"],
    queryFn: getWorkouts,
  });

  // Only consider workouts with an end time as completed/logged
  const completedWorkouts = useMemo(
    () => workouts.filter((w) => w.endedAt),
    [workouts]
  );

  // Recent workouts (latest 3 by createdAt desc)
  const recentWorkouts = useMemo(() => {
    return [...completedWorkouts]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 3);
  }, [completedWorkouts]);

  const navigate = useNavigate();

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
        })
      ),
    [completedWorkouts, thisWeekRange]
  );
  const workoutsLastWeek = useMemo(
    () =>
      completedWorkouts.filter((w) =>
        isWithinInterval(w.date, {
          start: lastWeekRange.start,
          end: lastWeekRange.end,
        })
      ),
    [completedWorkouts, lastWeekRange]
  );
  const workoutsPrevWeek = useMemo(
    () =>
      completedWorkouts.filter((w) =>
        isWithinInterval(w.date, {
          start: prevWeekRange.start,
          end: prevWeekRange.end,
        })
      ),
    [completedWorkouts, prevWeekRange]
  );

  // Fetch sets for last week and previous week to compute PRs and total sets
  const { data: setsByWorkoutLastWeek = {} } = useQuery({
    queryKey: ["setsByWorkout", workoutsLastWeek.map((w) => w.id)],
    queryFn: async () => {
      const entries = await Promise.all(
        workoutsLastWeek.map(async (w) => [w.id, await getSets(w.id)] as const)
      );
      return Object.fromEntries(entries) as Record<string, UiWorkoutSet[]>;
    },
    enabled: workoutsLastWeek.length > 0,
  });

  const { data: setsByWorkoutThisWeek = {} } = useQuery({
    queryKey: ["setsByWorkoutThis", workoutsThisWeek.map((w) => w.id)],
    queryFn: async () => {
      const entries = await Promise.all(
        workoutsThisWeek.map(async (w) => [w.id, await getSets(w.id)] as const)
      );
      return Object.fromEntries(entries) as Record<string, UiWorkoutSet[]>;
    },
    enabled: workoutsThisWeek.length > 0,
  });

  const { data: setsByWorkoutPrevWeek = {} } = useQuery({
    queryKey: ["setsByWorkoutPrev", workoutsPrevWeek.map((w) => w.id)],
    queryFn: async () => {
      const entries = await Promise.all(
        workoutsPrevWeek.map(async (w) => [w.id, await getSets(w.id)] as const)
      );
      return Object.fromEntries(entries) as Record<string, UiWorkoutSet[]>;
    },
    enabled: workoutsPrevWeek.length > 0,
  });

  // Metrics
  const thisWeekCount = workoutsThisWeek.length;
  const prsThisWeek =
    workoutsThisWeek.length === 0
      ? 0
      : Object.values(setsByWorkoutThisWeek)
          .flat()
          .filter((s) => s.isPR).length;
  const prsLastWeek =
    workoutsLastWeek.length === 0
      ? 0
      : Object.values(setsByWorkoutLastWeek)
          .flat()
          .filter((s) => s.isPR).length;
  const prTrendPercent = (() => {
    if (prsLastWeek === 0) return prsThisWeek > 0 ? 100 : 0;
    return Math.round(((prsThisWeek - prsLastWeek) / prsLastWeek) * 100);
  })();
  const prTrendPositive = prsThisWeek >= prsLastWeek;

  const setsThisWeek =
    workoutsThisWeek.length === 0
      ? 0
      : Object.values(setsByWorkoutThisWeek).reduce(
          (acc, sets) => acc + sets.length,
          0
        );
  const setsLastWeek =
    workoutsLastWeek.length === 0
      ? 0
      : Object.values(setsByWorkoutLastWeek).reduce(
          (acc, sets) => acc + sets.length,
          0
        );
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

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-heading text-3xl font-bold text-white">
              Dashboard
            </h1>
            <p className="text-muted-foreground">
              Track your progress and recent workouts
            </p>
          </div>
          <Button
            onClick={() => {
              try {
                const inProg = localStorage.getItem("workout:inProgress");
                if (inProg) {
                  // show toast via browser alert if toast hook not available
                  alert(
                    "You already have a workout in progress. Resume or discard it before starting another."
                  );
                  navigate("/workouts/new");
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
        </div>

        {/* Quick Actions */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="font-heading text-lg font-semibold text-white">
            Quick Actions
          </h2>
          <p className="text-sm text-muted-foreground">
            Jump right into your workout
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button
              variant="outline"
              className="text-white"
              onClick={() => {
                try {
                  const inProg = localStorage.getItem("workout:inProgress");
                  if (inProg) {
                    alert(
                      "You already have a workout in progress. Resume or discard it before starting another."
                    );
                    navigate("/workouts/new");
                    return;
                  }
                } catch {}
                navigate("/workouts/new", { state: { forceNew: true } });
              }}
            >
              <Plus className="h-4 w-4" />
              Empty Workout
            </Button>
            <Link to="/routines">
              <Button variant="outline" className="text-white">
                Start from Routine
              </Button>
            </Link>
            <Link to="/exercises">
              <Button variant="outline" className="text-white">
                Manage Exercises
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
