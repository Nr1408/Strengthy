const GRID_TEMPLATE =
  "minmax(30px, 0.7fr) minmax(40px, 1.2fr) minmax(40px, 1fr) 10px minmax(40px, 1.2fr) minmax(42px, 1fr) 35px 32px";

import { useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Trophy } from "lucide-react";
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

  const isCustomRoutine = !!routine && String(routine.id).startsWith("my-");

  const exercises = useMemo(() => {
    if (!routine) return [];
    return routine.exercises.map((re: any) => ({
      id: re.id,
      exercise: re.exercise,
      sets: Array.from({ length: re.targetSets }).map(() => ({
        id: `local-${crypto.randomUUID()}`,
        reps: 0,
        weight: 0,
        unit: getUnit(),
        isPR: false,
        completed: false,
        type: "S",
        rpe: undefined,
      })),
    }));
  }, [routine]);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-3xl font-bold text-white">
              {routine?.name || "Routine"}
            </h1>
            <p className="text-muted-foreground">
              {routine?.exercises?.length ?? 0} exercises
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/routines")}>
              Back
            </Button>
            <Button
              onClick={() => navigate(`/workouts/new`, { state: { routine } })}
            >
              Start
            </Button>
            {isCustomRoutine && (
              <Button
                variant="destructive"
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
              <CardContent className="px-1.5 py-4 sm:p-4">
                <div className="mb-3">
                  <h3 className="font-heading text-lg font-semibold text-white">
                    {we.exercise.name}
                  </h3>
                  <div className="text-sm text-muted-foreground">
                    {we.exercise.muscleGroup}
                  </div>
                </div>

                {/* Sets Header */}
                {/* Sets Header */}
                <div
                  className="mb-2 px-2 text-[10px] font-medium text-muted-foreground grid items-center gap-2" // Matches SetRow gap and padding
                  style={{
                    gridTemplateColumns: GRID_TEMPLATE,
                  }}
                >
                  <span className="text-center">SET</span>
                  <span className="text-center">WEIGHT</span>
                  <span className="text-center">UNIT</span>
                  <div /> {/* Column 4: spacer for '×' */}
                  <span className="text-center">REPS</span>
                  <span className="text-center">RPE</span>
                  <span className="text-center">
                    <Trophy className="mx-auto h-3.5 w-3.5" />
                  </span>
                  <div /> {/* Column 8: spacer for Checkmark */}
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
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      {showDeleteConfirm && (
        <div className="fixed left-1/2 top-1/3 z-60 -translate-x-1/2 w-[min(520px,90%)]">
          <div className="rounded-lg border border-border bg-neutral-900/95 p-6 shadow-lg">
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
