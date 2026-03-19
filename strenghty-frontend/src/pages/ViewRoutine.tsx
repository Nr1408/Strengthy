import { useMemo, useState, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Trophy, ArrowLeft, AlertTriangle } from "lucide-react";
import { Dialog, DialogPortal, DialogOverlay } from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { AppLayout } from "@/components/layout/AppLayout";
import { SetRow } from "@/components/workout/SetRow";
import { SetsHeader, getCardioMode } from "@/components/workout/SetsHeader";
import { Card, CardContent } from "@/components/ui/card";
import { mockRoutines } from "@/data/mockData";
import { getSetsForExercise } from "@/lib/api";
import { getUnit } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import ExerciseHeader from "@/components/workout/ExerciseHeader";

export default function ViewRoutine() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { routine?: any } };
  const { toast } = useToast();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const routine =
    location.state?.routine ||
    mockRoutines.find((r) => String(r.id) === String(id));

  const isUserRoutine = useMemo(() => {
    if (!routine) return false;
    try {
      const raw = localStorage.getItem("user:routines");
      if (!raw) return false;
      const parsed = JSON.parse(raw) as any[];
      if (!Array.isArray(parsed)) return false;
      return parsed.some((r) => String(r.id) === String(routine.id));
    } catch {
      return false;
    }
  }, [routine]);

  const exercises = useMemo(() => {
    if (!routine) return [];
    return routine.exercises.map((re: any) => ({
      id: re.id,
      exercise: re.exercise,
      sets: Array.from({ length: re.targetSets }).map(() => {
        const isCardio = re.exercise?.muscleGroup === "cardio";

        return {
          id: `local-${crypto.randomUUID()}`,
          reps: 0,
          weight: 0,
          unit: getUnit(),
          isPR: false,
          completed: false,
          type: "S",

          rpe: undefined,

          ...(isCardio && {
            cardioMode: "run",
            cardioDurationSeconds: 0,
            cardioDistance: 0,
            cardioStat: 0,
          }),
        };
      }),
    }));
  }, [routine]);

  const [viewExercises, setViewExercises] = useState(() => exercises);

  useEffect(() => setViewExercises(exercises), [exercises]);

  // If this is a user routine, fetch the user's most recent sets for each
  // exercise and attach suggestions to the local sets so they render greyed.
  useEffect(() => {
    if (!isUserRoutine || !routine) return;
    (async () => {
      try {
        const updated = await Promise.all(
          exercises.map(async (ex) => {
            try {
              const prior = await getSetsForExercise(String(ex.exercise.id));
              if (prior && prior.length > 0) {
                const recent = prior[0];
                const suggestedWeight =
                  typeof recent.weight === "number" && recent.weight > 0
                    ? recent.weight
                    : undefined;
                const suggestedReps =
                  typeof recent.reps === "number" && recent.reps > 0
                    ? recent.reps
                    : undefined;
                if (
                  suggestedWeight ||
                  suggestedReps ||
                  typeof recent.rpe === "number" ||
                  (recent.halfReps || 0) > 0
                ) {
                  const suggestedRpe =
                    typeof recent.rpe === "number" ? recent.rpe : undefined;
                  const suggestedHalf =
                    typeof recent.halfReps === "number" && recent.halfReps > 0
                      ? recent.halfReps
                      : undefined;
                  return {
                    ...ex,
                    sets: ex.sets.map((s: any) => ({
                      ...s,
                      _suggestedWeight: suggestedWeight,
                      _suggestedReps: suggestedReps,
                      _suggestedRpe: suggestedRpe,
                      _suggestedHalfReps: suggestedHalf,
                    })),
                  };
                }
              }
            } catch (e) {}
            return ex;
          }),
        );
        setViewExercises(updated);
      } catch (e) {}
    })();
  }, [isUserRoutine, routine]);

  return (
    <AppLayout>
      <div className="space-y-6 -mt-8">
        <div className="flex items-center justify-between mb-0 mt-0">
          <div className="pl-0">
            <button
              type="button"
              onClick={() => {
                try {
                  navigate(-1);
                } catch (e) {
                  navigate("/routines");
                }
              }}
              aria-label="Back"
              className="h-9 w-9 flex items-center justify-center rounded-full text-white bg-neutral-900/50 border border-neutral-800/60 shadow-sm hover:bg-neutral-900/70"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          </div>

          <div className="pr-0" />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-3xl font-bold text-white">
              {routine?.name || "Routine"}
            </h1>
            <p className="text-muted-foreground">
              {routine?.exercises?.length ?? 0} exercises
            </p>
          </div>
          <div className="h-10.5 text-sm flex gap-2">
            <Button
              onClick={() =>
                navigate(`/workouts/new`, {
                  state: {
                    routine,
                    originPath: `/routines/${routine?.id}/view`,
                    originState: { routine },
                  },
                })
              }
            >
              Start
            </Button>
            {isUserRoutine && (
              <Button
                variant="destructive"
                className="h-10.5 px-3 text-sm"
                onClick={() => setShowDeleteConfirm(true)}
              >
                Delete
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {viewExercises.map((we: any) => (
            <Card key={we.id} className="rounded-2xl overflow-hidden">
              <CardContent className="px-1 py-4 sm:p-4 overflow-hidden">
                <div className="mb-3">
                  {(() => {
                    const normalizedGroup =
                      we.exercise.muscleGroup === "other" &&
                      we.exercise.name.toLowerCase().includes("calf")
                        ? "calves"
                        : we.exercise.muscleGroup;
                    return (
                      <ExerciseHeader
                        exerciseName={we.exercise.name}
                        muscleGroup={normalizedGroup}
                        onClick={() => {
                          try {
                            const exId = String(we.exercise.id);
                            navigate(`/exercises/${exId}/info`, {
                              state: {
                                exerciseName: we.exercise.name,
                                muscleGroup: normalizedGroup,
                              },
                            });
                          } catch (e) {}
                        }}
                      />
                    );
                  })()}
                </div>

                {/* Sets Header */}
                <SetsHeader
                  muscleGroup={we.exercise.muscleGroup}
                  exerciseName={we.exercise.name}
                />

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
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogPortal>
          <DialogOverlay className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-none [backdrop-filter:none]" />
          <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-[10000] -translate-x-1/2 -translate-y-1/2 w-[420px] max-w-[92vw] rounded-[18px] border border-white/10 bg-neutral-900/95 p-7 shadow-2xl">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-destructive/15 text-destructive">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <DialogPrimitive.Title className="mb-3 text-center text-lg font-semibold text-white">
              Delete Routine?
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="text-sm text-muted-foreground mb-6 text-center">
              Are you sure you want to delete this routine? This cannot be
              undone.
            </DialogPrimitive.Description>
            <div className="flex items-center justify-center gap-3">
              <button
                className="px-5 py-2.5 rounded-lg bg-red-600 text-white shadow-md shadow-red-600/20 hover:bg-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/60"
                onClick={() => {
                  try {
                    if (routine?.id) {
                      const raw = localStorage.getItem("user:routines");
                      if (raw) {
                        const parsed = JSON.parse(raw) as any[];
                        const next = Array.isArray(parsed)
                          ? parsed.filter(
                              (r) => String(r.id) !== String(routine.id),
                            )
                          : [];
                        localStorage.setItem(
                          "user:routines",
                          JSON.stringify(next),
                        );
                      }
                    }
                    toast({ title: "Routine deleted" });
                    navigate("/routines");
                  } catch (err) {
                    toast({
                      title: "Delete failed",
                      description: String(err),
                      variant: "destructive",
                    });
                  } finally {
                    setShowDeleteConfirm(false);
                  }
                }}
              >
                Delete
              </button>
              <button
                className="px-5 py-2.5 rounded-lg border border-white/10 text-white/90 bg-transparent hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </button>
            </div>
          </DialogPrimitive.Content>
        </DialogPortal>
      </Dialog>
    </AppLayout>
  );
}
