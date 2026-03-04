import { useMemo } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import MuscleTag from "@/components/workout/MuscleTag";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getExerciseIconFile } from "@/lib/exerciseIcons";
import { getExercises, getSetsForExercise, getWorkouts } from "@/lib/api";
import { ExerciseHistoryContent } from "./ExerciseHistory";

const secondaryByPrimary: Record<string, string[]> = {
  quads: ["Glutes", "Hamstrings"],
  hamstrings: ["Glutes", "Quads"],
  glutes: ["Hamstrings", "Quads"],
  chest: ["Shoulders", "Triceps"],
  back: ["Biceps", "Rear Delts"],
  shoulders: ["Triceps", "Upper Chest"],
  biceps: ["Forearms", "Back"],
  triceps: ["Shoulders", "Chest"],
  calves: ["Hamstrings", "Quads"],
  forearms: ["Biceps", "Back"],
  core: ["Glutes", "Lower Back"],
  cardio: ["Core", "Legs"],
};

function labelizeMuscle(muscle?: string | null) {
  const value = String(muscle || "").trim();
  if (!value) return "-";
  return value
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default function ExerciseInfo() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation() as any;

  const stateExerciseName = location?.state?.exerciseName as string | undefined;
  const stateMuscleGroup = location?.state?.muscleGroup as string | undefined;

  const { data: exercises = [] } = useQuery({
    queryKey: ["exercises"],
    queryFn: getExercises,
  });

  const exerciseFromList = useMemo(() => {
    if (!id) return null;
    return (exercises || []).find((ex: any) => String(ex.id) === String(id)) || null;
  }, [exercises, id]);

  const exerciseName =
    stateExerciseName || exerciseFromList?.name || `Exercise ${String(id || "")}`;
  const primaryMuscle =
    stateMuscleGroup || exerciseFromList?.muscleGroup || "other";

  const secondaryMuscles = secondaryByPrimary[String(primaryMuscle).toLowerCase()] || ["-", "-"];

  const { data: records } = useQuery({
    queryKey: ["exercise-info-records", id],
    queryFn: async () => {
      if (!id) {
        return {
          heaviestWeight: "-",
          bestSet: "-",
          totalWorkouts: 0,
        };
      }

      const [sets, workouts] = await Promise.all([
        getSetsForExercise(String(id)),
        getWorkouts(),
      ]);

      const completedWorkoutIds = new Set(
        (workouts || []).filter((w: any) => !!w?.endedAt).map((w: any) => String(w.id)),
      );

      const completedSets = (sets || []).filter((set: any) =>
        completedWorkoutIds.has(String(set.workout)),
      );

      const totalWorkouts = new Set(
        completedSets.map((set: any) => String(set.workout)),
      ).size;

      let heaviest: { value: number; unit: string } | null = null;
      let best: { score: number; text: string } | null = null;

      completedSets.forEach((set: any) => {
        const weight = Number(set?.weight || 0);
        const reps = Number(set?.reps || 0);
        const halfReps = Number(set?.halfReps || 0);
        const unit = String(set?.unit || "kg");
        const totalReps = reps + halfReps * 0.5;

        if (Number.isFinite(weight) && weight > 0) {
          if (!heaviest || weight > heaviest.value) {
            heaviest = { value: weight, unit };
          }

          const e1rm = weight * (1 + totalReps / 30);
          if (Number.isFinite(e1rm) && (!best || e1rm > best.score)) {
            const repText = halfReps > 0 ? `${reps}.${halfReps * 5}` : `${reps}`;
            best = {
              score: e1rm,
              text: `${weight}${unit} × ${repText}`,
            };
          }
        }
      });

      return {
        heaviestWeight: heaviest ? `${heaviest.value}${heaviest.unit}` : "-",
        bestSet: best ? best.text : "-",
        totalWorkouts,
      };
    },
    enabled: !!id,
  });

  return (
    <AppLayout>
      <div className="space-y-5 -mt-4">
        <div className="mt-0.5">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="h-9 w-9 flex items-center justify-center rounded-full text-white bg-neutral-900/50 border border-neutral-800/60 shadow-sm hover:bg-neutral-900/70"
          >
            ◀
          </button>
        </div>

        <Card className="w-full rounded-2xl overflow-hidden">
          <CardContent className="px-4 py-5 sm:p-6 space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Exercise Name</p>
              <h1 className="text-2xl font-semibold text-white mt-1">{exerciseName}</h1>
            </div>

            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                Primary: <span className="text-white">{labelizeMuscle(primaryMuscle)}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Secondary: <span className="text-white">{secondaryMuscles.join(", ")}</span>
              </p>
              {primaryMuscle && <MuscleTag muscle={primaryMuscle as any} />}
            </div>

            <div className="h-32 rounded-xl border border-white/10 bg-zinc-900/80 flex items-center justify-center">
              <img
                src={`/icons/${getExerciseIconFile(exerciseName, primaryMuscle || "")}`}
                alt={exerciseName}
                className="h-20 w-20 object-contain"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="w-full rounded-2xl overflow-hidden">
          <CardContent className="px-4 py-5 sm:p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Your Records</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl border border-white/10 bg-zinc-900/70 p-4">
                <p className="text-xs text-muted-foreground">Heaviest Weight</p>
                <p className="mt-1 text-lg font-semibold text-white">{records?.heaviestWeight ?? "-"}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-zinc-900/70 p-4">
                <p className="text-xs text-muted-foreground">Best Set</p>
                <p className="mt-1 text-lg font-semibold text-white">{records?.bestSet ?? "-"}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-zinc-900/70 p-4">
                <p className="text-xs text-muted-foreground">Total Workouts</p>
                <p className="mt-1 text-lg font-semibold text-white">{records?.totalWorkouts ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="border-t border-border pt-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Exercise History</h2>
            <Button variant="outline" size="sm" onClick={() => navigate("/workouts/new")}>Log workout</Button>
          </div>
          <ExerciseHistoryContent showBackButton={false} showExerciseHeader={false} className="mt-0" />
        </div>
      </div>
    </AppLayout>
  );
}
