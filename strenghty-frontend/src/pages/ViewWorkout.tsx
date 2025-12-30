const GRID_TEMPLATE =
  "minmax(30px, 0.7fr) minmax(40px, 1.2fr) minmax(40px, 1fr) 10px minmax(40px, 1.2fr) minmax(42px, 1fr) 35px 32px";
import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Trophy } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { SetRow } from "@/components/workout/SetRow";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getWorkouts, getSets, getExercises, deleteWorkout } from "@/lib/api";
import { getUnit } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

function HeaderCell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-3 w-full items-center justify-center text-center text-[10px] sm:text-xs leading-none">
      {children}
    </div>
  );
}

export default function ViewWorkout() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: (workoutId: string) => deleteWorkout(workoutId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workouts"] });
      toast({ title: "Workout deleted" });
      navigate("/workouts");
    },
    onError: (err: any) => {
      toast({
        title: "Delete failed",
        description: String(err),
        variant: "destructive",
      });
    },
  });

  const { data: workouts = [] } = useQuery({
    queryKey: ["workouts"],
    queryFn: getWorkouts,
  });

  const { data: sets = [] } = useQuery({
    queryKey: ["sets", id],
    queryFn: () => (id ? getSets(id) : Promise.resolve([])),
    enabled: !!id,
  });

  const { data: exercises = [] } = useQuery({
    queryKey: ["exercises"],
    queryFn: getExercises,
  });

  const workout = workouts.find((w) => w.id === id);

  const grouped = useMemo(() => {
    const m = new Map<string, any[]>();
    sets.forEach((s: any) => {
      if (!m.has(s.exercise)) m.set(s.exercise, []);
      m.get(s.exercise).push(s);
    });
    return Array.from(m.entries()).map(([exerciseId, setsArr]) => {
      const ex = exercises.find((e: any) => e.id === exerciseId) || {
        id: exerciseId,
        name: `Exercise ${exerciseId}`,
        muscleGroup: "full-body",
        createdAt: new Date(),
      };
      const sorted = setsArr
        .slice()
        .sort((a: any, b: any) => a.setNumber - b.setNumber);
      const mapped = sorted.map((s: any) => ({
        id: String(s.id),
        reps: s.reps,
        weight: typeof s.weight === "number" ? s.weight : 0,
        unit: s.unit || getUnit(),
        isPR: !!s.isPR,
        completed: true,
        absWeightPR: !!s.absWeightPR,
        e1rmPR: !!s.e1rmPR,
        volumePR: !!s.volumePR,
        type: s.type || "S",
        rpe: typeof s.rpe === "number" ? s.rpe : undefined,
      }));
      return {
        id: exerciseId,
        exercise: ex,
        sets: mapped,
      };
    });
  }, [sets, exercises]);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-3xl font-bold text-white">
              {workout?.name || "Workout"}
            </h1>
            <p className="text-muted-foreground">
              {workout?.duration ? `${workout.duration} min` : "Logged workout"}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="text-white"
              onClick={() => navigate("/workouts")}
            >
              Back
            </Button>
            <Button onClick={() => navigate(`/workouts/${id}/edit`)}>
              Edit
            </Button>
            <Button
              variant="destructive"
              onClick={() => setShowDiscardConfirm(true)}
            >
              Delete
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          {grouped.map((we) => (
            <Card key={we.id} className="w-full">
              <CardContent className="px-1.5 py-3 sm:p-4">
                <div className="mb-3">
                  <h3 className="font-heading text-lg font-semibold text-white">
                    {we.exercise.name}
                  </h3>
                  <div className="text-sm text-muted-foreground">
                    {we.exercise.muscleGroup}
                  </div>
                </div>

                <div className="relative w-full overflow-hidden">
                  <div className="w-full">
                    <div
                      className="grid w-full items-center gap-2 px-2 text-[10px] sm:text-xs font-medium text-muted-foreground" // Added px-2 to match SetRow
                      style={{ gridTemplateColumns: GRID_TEMPLATE }}
                    >
                      <HeaderCell>SET</HeaderCell>
                      <HeaderCell>WEIGHT</HeaderCell>
                      <HeaderCell>UNIT</HeaderCell>
                      <div />
                      <HeaderCell>REPS</HeaderCell>
                      <HeaderCell>RPE</HeaderCell>
                      <HeaderCell>
                        <Trophy className="h-3.5 w-3.5" />
                      </HeaderCell>
                      <div /> {/* Placeholder for the Checkmark column */}
                      <div /> {/* Extra placeholder to match 8 columns */}
                    </div>
                    <div className="space-y-2">
                      {we.sets.map((s: any, idx: number) => (
                        <SetRow
                          key={s.id}
                          set={s}
                          exerciseName={we.exercise.name}
                          unit={s.unit}
                          setNumber={idx + 1}
                          onUpdate={() => {}}
                          onUnitChange={() => {}}
                          onComplete={() => {}}
                          readOnly
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      {showDiscardConfirm && (
        <div className="fixed left-1/2 top-1/3 z-60 -translate-x-1/2 w-[min(520px,90%)]">
          <div className="rounded-lg border border-border bg-neutral-900/95 p-6 shadow-lg">
            <div className="mb-4 text-center text-lg font-semibold text-white">
              Delete Workout?
            </div>
            <div className="text-sm text-muted-foreground mb-4 text-center">
              Are you sure you want to delete this workout? This cannot be
              undone.
            </div>
            <div className="flex items-center justify-center gap-6">
              <button
                className="px-4 py-2 rounded bg-red-600 text-white"
                onClick={() => {
                  if (id) deleteMutation.mutate(id);
                  setShowDiscardConfirm(false);
                }}
                disabled={deleteMutation.isLoading}
              >
                {deleteMutation.isLoading ? "Deleting..." : "Delete"}
              </button>
              <button
                className="px-4 py-2 rounded border border-border text-white bg-transparent"
                onClick={() => setShowDiscardConfirm(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
