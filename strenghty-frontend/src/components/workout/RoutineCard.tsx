import { FolderOpen, Play } from "lucide-react";
import type { Routine } from "@/types/workout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface RoutineCardProps {
  routine: Routine;
  onStart?: () => void;
  onClick?: () => void;
}

export function RoutineCard({ routine, onStart, onClick }: RoutineCardProps) {
  const totalSets = routine.exercises.reduce(
    (acc, ex) => acc + ex.targetSets,
    0,
  );

  return (
    <Card
      className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-md rounded-2xl overflow-hidden"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <FolderOpen className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-1">
              <h3 className="font-heading font-semibold">{routine.name}</h3>
              {routine.description && (
                <p className="text-sm text-muted-foreground line-clamp-1">
                  {routine.description}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onStart?.();
              }}
            >
              <Play className="h-4 w-4" />
              Start
            </Button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {routine.exercises.slice(0, 4).map((ex) => (
            <Badge key={ex.id} variant="secondary" className="text-xs">
              {ex.exercise.name}
            </Badge>
          ))}
          {routine.exercises.length > 4 && (
            <Badge variant="secondary" className="text-xs">
              +{routine.exercises.length - 4} more
            </Badge>
          )}
        </div>

        <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
          <span>{routine.exercises.length} exercises</span>
          <span>{totalSets} sets</span>
        </div>
      </CardContent>
    </Card>
  );
}
