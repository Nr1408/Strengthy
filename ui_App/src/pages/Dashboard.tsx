import { Link } from "react-router-dom";
import { Plus, Calendar, Trophy, Dumbbell, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/layout/AppLayout";
import { WorkoutCard } from "@/components/workout/WorkoutCard";
import { StatsCard } from "@/components/workout/StatsCard";
import { mockWorkouts } from "@/data/mockData";

export default function Dashboard() {
  const totalWorkouts = mockWorkouts.length;
  const totalPRs = mockWorkouts.reduce(
    (acc, w) =>
      acc +
      w.exercises.reduce((a, e) => a + e.sets.filter((s) => s.isPR).length, 0),
    0
  );
  const totalSets = mockWorkouts.reduce(
    (acc, w) => acc + w.exercises.reduce((a, e) => a + e.sets.length, 0),
    0
  );

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-heading text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">
              Track your progress and recent workouts
            </p>
          </div>
          <Link to="/workouts/new">
            <Button>
              <Plus className="h-4 w-4" />
              New Workout
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            label="This Week"
            value={`${totalWorkouts} workouts`}
            icon={<Calendar className="h-5 w-5" />}
            trend={{ value: 12, isPositive: true }}
          />
          <StatsCard
            label="Personal Records"
            value={totalPRs}
            icon={<Trophy className="h-5 w-5" />}
            trend={{ value: 3, isPositive: true }}
          />
          <StatsCard
            label="Total Sets"
            value={totalSets}
            icon={<Dumbbell className="h-5 w-5" />}
          />
          <StatsCard
            label="Avg. Duration"
            value="63 min"
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
              <Button variant="ghost" size="sm" textColor="white">
                View All
              </Button>
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {mockWorkouts.slice(0, 3).map((workout) => (
              <WorkoutCard key={workout.id} workout={workout} />
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
            <Link to="/workouts/new">
              <Button variant="outline">
                <Plus className="h-4 w-4" textColor="white" />
                Empty Workout
              </Button>
            </Link>
            <Link to="/routines">
              <Button variant="outline" textColor="white">
                Start from Routine
              </Button>
            </Link>
            <Link to="/exercises">
              <Button variant="outline" textColor="white">
                Manage Exercises
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
