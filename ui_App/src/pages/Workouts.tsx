import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { AppLayout } from '@/components/layout/AppLayout';
import { WorkoutCard } from '@/components/workout/WorkoutCard';
import { mockWorkouts } from '@/data/mockData';

export default function Workouts() {
  const [workouts] = useState(mockWorkouts);

  // Group workouts by date
  const groupedWorkouts = workouts.reduce((groups, workout) => {
    const dateKey = format(workout.date, 'yyyy-MM-dd');
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(workout);
    return groups;
  }, {} as Record<string, typeof workouts>);

  const sortedDates = Object.keys(groupedWorkouts).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-heading text-3xl font-bold">Workouts</h1>
            <p className="text-muted-foreground">
              {workouts.length} workout{workouts.length !== 1 ? 's' : ''} logged
            </p>
          </div>
          <Link to="/workouts/new">
            <Button>
              <Plus className="h-4 w-4" />
              New Workout
            </Button>
          </Link>
        </div>

        {/* Workout List */}
        {sortedDates.length > 0 ? (
          <div className="space-y-8">
            {sortedDates.map((dateKey) => {
              const date = new Date(dateKey);
              const isToday = format(new Date(), 'yyyy-MM-dd') === dateKey;
              const isYesterday =
                format(new Date(Date.now() - 86400000), 'yyyy-MM-dd') === dateKey;

              let dateLabel = format(date, 'EEEE, MMMM d');
              if (isToday) dateLabel = 'Today';
              if (isYesterday) dateLabel = 'Yesterday';

              return (
                <div key={dateKey}>
                  <div className="mb-4 flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span className="text-sm font-medium">{dateLabel}</span>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {groupedWorkouts[dateKey].map((workout) => (
                      <WorkoutCard key={workout.id} workout={workout} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Calendar className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="mt-4 font-heading font-semibold">No workouts yet</h3>
            <p className="text-sm text-muted-foreground">
              Start your first workout to see it here
            </p>
            <Link to="/workouts/new" className="mt-4">
              <Button>
                <Plus className="h-4 w-4" />
                Start Workout
              </Button>
            </Link>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
