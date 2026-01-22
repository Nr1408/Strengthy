import React, { useMemo } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import MuscleTag from "@/components/workout/MuscleTag";
import { getExerciseIconFile } from "@/lib/exerciseIcons";
import { useQuery } from "@tanstack/react-query";
import { getSetsForExercise, getWorkouts } from "@/lib/api";
import { format } from "date-fns";
import { SetRow } from "@/components/workout/SetRow";
import { Trophy } from "lucide-react";

const GRID_TEMPLATE =
  "minmax(25px, 0.25fr) minmax(65px, 0.7fr) 6px minmax(25px, 0.65fr) minmax(30px, 0.35fr) 28px";

const GRID_TEMPLATE_CARDIO =
  "minmax(20px, 0.4fr) minmax(60px, 0.6fr) minmax(60px, 0.8fr) minmax(30px, 0.25fr) 28px";

export default function ExerciseHistory() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation() as any;
  const exerciseName = location?.state?.exerciseName as string | undefined;
  const muscleGroup = location?.state?.muscleGroup as string | undefined;

  const isNumericId = id != null && /^[0-9]+$/.test(String(id));

  const { data: serverSets = [], isLoading } = useQuery({
    queryKey: ["exerciseSets", id],
    queryFn: () => (id ? getSetsForExercise(String(id)) : Promise.resolve([])),
    enabled: isNumericId,
  });

  const { data: workouts = [] } = useQuery({
    queryKey: ["workouts"],
    queryFn: getWorkouts,
  });

  const localHistory = useMemo(() => {
    if (!exerciseName) return [] as any[];
    const out: any[] = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;
        if (!key.startsWith("workout:state:")) continue;
        try {
          const raw = localStorage.getItem(key);
          if (!raw) continue;
          const parsed = JSON.parse(raw);
          const wName = parsed.workoutName || key.replace("workout:state:", "");
          const startTime = parsed.startTime || null;
          const exercises = parsed.exercises || [];
          exercises.forEach((ex: any) => {
            if (!ex || !ex.exercise) return;
            if (
              String(ex.exercise.name || "").toLowerCase() ===
              exerciseName.toLowerCase()
            ) {
              out.push({
                workoutId: key.replace("workout:state:", ""),
                workoutName: wName,
                date: startTime,
                sets: ex.sets || [],
              });
            }
          });
        } catch (e) {}
      }
    } catch (e) {}
    return out;
  }, [exerciseName]);

  const grouped = useMemo(() => {
    // Prefer serverSets if available
    if (serverSets && serverSets.length > 0) {
      // serverSets items include workout id and set details
      const m = new Map<string, any>();
      serverSets.forEach((s: any) => {
        const wid = String(
          s.workout || s.workout_id || s.workoutId || "unknown",
        );
        if (!m.has(wid)) m.set(wid, []);
        m.get(wid).push(s);
      });
      const arr = Array.from(m.entries()).map(([wid, sets]) => {
        const workout = workouts.find((w: any) => String(w.id) === wid);
        return {
          workoutId: wid,
          workoutName: workout ? workout.name : `Workout ${wid}`,
          date:
            workout && workout.createdAt
              ? workout.createdAt
              : workout && workout.date
                ? workout.date
                : undefined,
          sets,
        };
      });
      // sort by date desc when available
      arr.sort((a: any, b: any) => {
        const ad = a.date ? new Date(a.date).getTime() : 0;
        const bd = b.date ? new Date(b.date).getTime() : 0;
        return bd - ad;
      });
      return arr;
    }

    // fallback to localHistory
    const arr = localHistory.slice().map((h) => ({
      workoutId: h.workoutId,
      workoutName: h.workoutName,
      date: h.date,
      sets: h.sets,
    }));
    arr.sort((a: any, b: any) => {
      const ad = a.date ? new Date(a.date).getTime() : 0;
      const bd = b.date ? new Date(b.date).getTime() : 0;
      return bd - ad;
    });
    return arr;
  }, [serverSets, workouts, localHistory]);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="h-9 w-9 flex items-center justify-center rounded-full text-white bg-neutral-900/50 border border-neutral-800/60 shadow-sm hover:bg-neutral-900/70"
          >
            ◀
          </button>
        </div>

        <div>
          <div className="flex items-start gap-4">
            <div className="h-16 w-16 flex items-center justify-center rounded-md bg-zinc-800 border border-white/10">
              <img
                src={`/icons/${getExerciseIconFile(exerciseName || "", muscleGroup || "")}`}
                alt={exerciseName}
                className="h-12 w-12 object-contain"
              />
            </div>
            <div>
              <h1 className="font-heading text-lg font-semibold text-white leading-tight">
                {exerciseName || `Exercise ${id}`}
              </h1>
              {muscleGroup && <MuscleTag muscle={muscleGroup} />}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {grouped.length === 0 ? (
            <Card>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  No history found.
                </div>
              </CardContent>
            </Card>
          ) : (
            grouped.map((g) => (
              <Card key={`h-${g.workoutId}`}>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <div>
                        <button
                          type="button"
                          onClick={() =>
                            navigate(`/workouts/${g.workoutId}/view`)
                          }
                          className="pt-2 text-lg font-semibold text-white text-left hover:underline"
                        >
                          {g.workoutName}
                        </button>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {g.date
                          ? format(new Date(g.date), "dd LLL yyyy, HH:mm")
                          : "-"}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div
                      className="mb-1.5 px-2 text-[10px] font-medium text-muted-foreground grid items-center gap-2"
                      style={{
                        gridTemplateColumns:
                          g.sets && g.sets.length > 0 && g.sets[0].cardioMode
                            ? GRID_TEMPLATE_CARDIO
                            : GRID_TEMPLATE,
                      }}
                    >
                      {g.sets && g.sets[0] && g.sets[0].cardioMode ? (
                        <>
                          <span className="flex justify-center">SET</span>
                          <span className="flex justify-center">DURATION</span>
                          <span className="flex justify-center">DISTANCE</span>
                          <span className="flex justify-center">LEVEL</span>
                          <span className="flex justify-center">PR</span>
                        </>
                      ) : (
                        <>
                          <span className="flex justify-center">SET</span>
                          <span className="flex justify-center">WEIGHT</span>
                          <span />
                          <span className="flex justify-center">REPS</span>
                          <span className="flex justify-center">RPE</span>
                          <span className="flex justify-center">
                            <Trophy className="h-3.5 w-3.5" />
                          </span>
                        </>
                      )}
                    </div>

                    <div className="space-y-2">
                      {g.sets.map((s: any, idx: number) => (
                        <SetRow
                          key={`${g.workoutId}-${idx}`}
                          set={s}
                          exerciseName={exerciseName || ""}
                          unit={s.unit || "kg"}
                          setNumber={s.setNumber ?? idx + 1}
                          onUpdate={() => {}}
                          onUnitChange={() => {}}
                          onComplete={() => {}}
                          readOnly
                          showComplete={false}
                        />
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </AppLayout>
  );
}
