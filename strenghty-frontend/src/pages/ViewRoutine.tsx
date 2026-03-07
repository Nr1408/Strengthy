const GRID_TEMPLATE_STRENGTH =
  "minmax(20px, 0.23fr) minmax(50px, 0.65fr) 6px minmax(20px, 0.65fr) minmax(25px, 0.25fr) 32px 30px";

// Match cardio row layout from SetRow: Set | Duration | Distance/Floors | Level/Split | PR | Check
const GRID_TEMPLATE_CARDIO =
  "minmax(20px, 0.2fr) minmax(56px, 0.5fr) minmax(56px, 0.65fr) minmax(28px, 0.25fr) 32px 30px";

// HIIT / bodyweight cardio header layout: Set | Duration | Reps | RPE | PR | Check
const GRID_TEMPLATE_HIIT =
  "minmax(20px, 0.23fr) minmax(60px, 0.65fr) minmax(22px, 0.65fr) minmax(28px, 0.3fr) 32px 30px";

import { useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Trophy, ArrowLeft, AlertTriangle } from "lucide-react";
import { Dialog, DialogPortal, DialogOverlay } from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { AppLayout } from "@/components/layout/AppLayout";
import { SetRow } from "@/components/workout/SetRow";
import { Card, CardContent } from "@/components/ui/card";
import { mockRoutines } from "@/data/mockData";
import { getUnit } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import ExerciseHeader from "@/components/workout/ExerciseHeader";

export default function ViewRoutine() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { routine?: any } };
  const { toast } = useToast();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const getCardioModeForExercise = (exercise: any) => {
    const name = String(exercise?.name || "").toLowerCase();
    if (name.includes("treadmill")) return "treadmill";
    if (name.includes("bike") || name.includes("cycle")) return "bike";
    if (name.includes("elliptical")) return "elliptical";
    if (name.includes("stair") || name.includes("step")) return "stairs";
    if (name.includes("row")) return "row";
    return "treadmill";
  };

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

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-0 -mt-8">
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
          {exercises.map((we: any) => (
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
                {we.exercise.muscleGroup === "cardio" ? (
                  (() => {
                    const name = (we.exercise.name || "").toLowerCase();
                    const isHiit =
                      name.includes("burpee") ||
                      name.includes("mountain") ||
                      name.includes("climb") ||
                      name.includes("jump squat") ||
                      name.includes("plank jack") ||
                      name.includes("skater");

                    return (
                      <div
                        className="mt-3 mb-1.5 px-1 text-[10px] font-medium text-muted-foreground grid items-center gap-1"
                        style={{
                          gridTemplateColumns: isHiit
                            ? GRID_TEMPLATE_HIIT
                            : GRID_TEMPLATE_CARDIO,
                        }}
                      >
                        <>
                          <span className="flex items-center justify-center text-center translate-x-[2px]">
                            SET
                          </span>
                          <span className="flex items-center justify-center text-center">
                            DURATION
                          </span>

                          {isHiit ? (
                            <span className="flex items-center justify-center text-center">
                              REPS
                            </span>
                          ) : (
                            <span className="flex items-center justify-center text-center">
                              {getCardioModeForExercise(we.exercise) ===
                              "stairs"
                                ? "CLIMB"
                                : "DISTANCE"}
                            </span>
                          )}

                          {isHiit ? (
                            <span className="flex items-center justify-center text-center">
                              RPE
                            </span>
                          ) : (
                            <span className="flex items-center justify-center text-center">
                              {(() => {
                                const mode = getCardioModeForExercise(
                                  we.exercise,
                                );
                                if (mode === "treadmill") return "INCLINE";
                                if (mode === "row") return "SPLIT TIME";
                                return "LEVEL";
                              })()}
                            </span>
                          )}

                          <span className="flex items-center justify-center text-center">
                            <Trophy className="h-3.5 w-3.5 -translate-x-[1px]" />
                          </span>

                          <div />
                        </>
                      </div>
                    );
                  })()
                ) : (
                  <div
                    className="mt-3 mb-1.5 px-1 text-[10px] font-medium text-muted-foreground grid items-center gap-1"
                    style={{ gridTemplateColumns: GRID_TEMPLATE_STRENGTH }}
                  >
                    <>
                      <span className="flex items-center justify-center text-center translate-x-[2px]">
                        SET
                      </span>
                      <span className="flex items-center justify-center text-center">
                        WEIGHT
                      </span>
                      <span />
                      <span className="flex items-center justify-center text-center">
                        REPS
                      </span>
                      <span className="flex items-center justify-center text-center">
                        RPE
                      </span>
                      <span className="flex items-center justify-center text-center">
                        <Trophy className="h-3.5 w-3.5 -translate-x-[1px]" />
                      </span>
                      <div />
                    </>
                  </div>
                )}

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
