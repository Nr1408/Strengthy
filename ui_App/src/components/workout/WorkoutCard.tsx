import { format } from 'date-fns';
import { Clock, Trophy, ChevronRight } from 'lucide-react';
import { Workout } from '@/types/workout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface WorkoutCardProps {
  workout: Workout;
  onClick?: () => void;
}

export function WorkoutCard({ workout, onClick }: WorkoutCardProps) {
  const totalSets = workout.exercises.reduce((acc, ex) => acc + ex.sets.length, 0);
  const totalPRs = workout.exercises.reduce(
    (acc, ex) => acc + ex.sets.filter((s) => s.isPR).length,
    0
  );

  return (
    <Card
      className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-md"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h3 className="font-heading font-semibold">{workout.name}</h3>
            <p className="text-sm text-muted-foreground">
              {format(workout.date, 'EEEE, MMM d')}
            </p>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {workout.exercises.slice(0, 3).map((ex) => (
            <Badge key={ex.id} variant="secondary" className="text-xs">
              {ex.exercise.name}
            </Badge>
          ))}
          {workout.exercises.length > 3 && (
            <Badge variant="secondary" className="text-xs">
              +{workout.exercises.length - 3} more
            </Badge>
          )}
        </div>

        <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
          <span>{workout.exercises.length} exercises</span>
          <span>{totalSets} sets</span>
          {workout.duration && (
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {workout.duration}m
            </span>
          )}
          {totalPRs > 0 && (
            <span className="flex items-center gap-1 text-yellow-500">
              <Trophy className="h-3.5 w-3.5" />
              {totalPRs} PR{totalPRs > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
