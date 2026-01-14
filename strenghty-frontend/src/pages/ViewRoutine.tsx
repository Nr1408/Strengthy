const GRID_TEMPLATE =
  "minmax(20px, 0.4fr) minmax(65px, 0.8fr) 6px minmax(25px, 0.4fr) minmax(30px, 0.4fr) 32px 30px";

// Match cardio row layout from SetRow: Set | Duration | Distance/Floors | Level/Split | PR | Check
const GRID_TEMPLATE_CARDIO =
  "minmax(20px, 0.4fr) minmax(60px, 0.6fr) minmax(60px, 0.8fr) minmax(30px, 0.25fr) 32px 30px";

import { useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Trophy, ArrowLeft } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { SetRow } from "@/components/workout/SetRow";
import { Card, CardContent } from "@/components/ui/card";
import { mockRoutines } from "@/data/mockData";
import { getUnit } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

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
              onClick={() => navigate(`/workouts/new`, { state: { routine } })}
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
            <Card key={we.id}>
              <CardContent className="px-1 py-4 sm:p-4 overflow-hidden">
                <div className="mb-3">
                  <h3 className="font-heading text-lg font-semibold text-white">
                    {we.exercise.name}
                  </h3>
                  <div className="text-sm text-muted-foreground">
                    {we.exercise.muscleGroup === "other"
                      ? "calves"
                      : we.exercise.muscleGroup}
                  </div>
                </div>

                {/* Sets Header */}
                {we.exercise.muscleGroup === "cardio" ? (
                  <div
                    className="mb-2 px-2 text-[10px] font-medium text-muted-foreground grid items-center gap-2"
                    style={{ gridTemplateColumns: GRID_TEMPLATE_CARDIO }}
                  >
                    <>
                      <span className="flex justify-center">SET</span>
                      <span className="flex justify-center">DURATION</span>

                      <span className="flex justify-center">
                        {we.exercise.name.toLowerCase().includes("stair")
                          ? "FLOORS"
                          : "DISTANCE"}
                      </span>

                      <span className="flex justify-center">
                        {we.exercise.name.toLowerCase().includes("treadmill")
                          ? "INCLINE"
                          : we.exercise.name.toLowerCase().includes("row")
                          ? "SPLIT"
                          : "LEVEL"}
                      </span>

                      <span className="flex justify-center">
                        <Trophy className="h-3.5 w-3.5" />
                      </span>

                      <div />
                    </>
                  </div>
                ) : (
                  <div
                    className="mb-2 px-2 text-[10px] font-medium text-muted-foreground grid items-center gap-2"
                    style={{ gridTemplateColumns: GRID_TEMPLATE }}
                  >
                    <>
                      <span className="flex justify-center">SET</span>
                      <span className="flex justify-center">WEIGHT</span>
                      <span />
                      <span className="flex justify-center">REPS</span>
                      <span className="flex justify-center">RPE</span>
                      <span className="flex justify-center">
                        <Trophy className="h-3.5 w-3.5" />
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
      {showDeleteConfirm && (
        <div className="fixed left-1/2 top-1/3 z-[9999] -translate-x-1/2 w-[min(520px,90%)]">
          <div className="rounded-lg border border-border bg-neutral-900 p-6 shadow-lg">
            <div className="mb-4 text-center text-lg font-semibold text-white">
              Delete Routine?
            </div>
            <div className="text-sm text-muted-foreground mb-4 text-center">
              Are you sure you want to delete this routine? This cannot be
              undone.
            </div>
            <div className="flex items-center justify-center gap-6">
              <button
                className="px-4 py-2 rounded bg-red-600 text-white"
                onClick={() => {
                  try {
                    if (routine?.id) {
                      const raw = localStorage.getItem("user:routines");
                      if (raw) {
                        const parsed = JSON.parse(raw) as any[];
                        const next = Array.isArray(parsed)
                          ? parsed.filter(
                              (r) => String(r.id) !== String(routine.id)
                            )
                          : [];
                        localStorage.setItem(
                          "user:routines",
                          JSON.stringify(next)
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
                className="px-4 py-2 rounded border border-border text-white bg-transparent"
                onClick={() => setShowDeleteConfirm(false)}
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
