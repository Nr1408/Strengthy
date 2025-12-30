import { Dumbbell } from 'lucide-react';
import { Exercise } from '@/types/workout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { muscleGroupColors } from '@/data/mockData';

interface ExerciseCardProps {
  exercise: Exercise;
  onClick?: () => void;
}

export function ExerciseCard({ exercise, onClick }: ExerciseCardProps) {
  return (
    <Card
      className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-md"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
            <Dumbbell className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <h3 className="font-heading font-semibold">{exercise.name}</h3>
            <Badge
              variant="secondary"
              className={muscleGroupColors[exercise.muscleGroup]}
            >
              {exercise.muscleGroup}
            </Badge>
            {exercise.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {exercise.description}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
