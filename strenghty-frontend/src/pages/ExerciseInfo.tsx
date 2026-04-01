import { useMemo, useState, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SetRow } from "@/components/workout/SetRow";
import { titleCase } from "@/lib/utils";
import { getExerciseIconFile } from "@/lib/exerciseIcons";
import libraryExercises from "@/data/libraryExercises";
import { format } from "date-fns";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Trophy, PlusCircle } from "lucide-react";
import {
  getExercises,
  getSetsForExercise,
  getWorkouts,
  type MuscleGroup,
} from "@/lib/api";

const SECONDARY_BY_PRIMARY: Record<MuscleGroup, string[]> = {
  chest: ["Shoulders", "Triceps"],
  back: ["Biceps", "Rear Delts"],
  shoulders: ["Triceps", "Upper Chest"],
  biceps: ["Forearms", "Brachialis"],
  triceps: ["Shoulders", "Chest"],
  quads: ["Glutes", "Hamstrings"],
  hamstrings: ["Glutes", "Lower Back"],
  calves: ["Tibialis", "Soleus"],
  forearms: ["Biceps", "Grip"],
  core: ["Obliques", "Lower Back"],
  cardio: ["Core", "Lower Body"],
  other: ["Support Muscles"],
};

const GRID_STRENGTH =
  "minmax(20px, 0.25fr) minmax(60px, 0.7fr) 6px minmax(22px, 0.65fr) minmax(28px, 0.35fr) 32px";
const GRID_CARDIO =
  "minmax(18px, 0.35fr) minmax(56px, 0.6fr) minmax(56px, 0.8fr) minmax(28px, 0.25fr) 32px";
const GRID_HIIT =
  "minmax(20px, 0.25fr) minmax(60px, 0.7fr) minmax(48px, 0.7fr) minmax(32px, 0.5fr) 32px";

const isHiit = (n: string) => {
  const v = (n || "").toLowerCase();
  return [
    "hiit",
    "burpee",
    "mountain",
    "climb",
    "jump squat",
    "plank jack",
    "skater",
    "jumping jack",
    "high knee",
  ].some((k) => v.includes(k));
};

const colorMap: Record<string, string> = {
  chest: "bg-red-500/20 border-red-500/40 text-red-400",
  back: "bg-blue-500/20 border-blue-500/40 text-blue-400",
  shoulders: "bg-purple-600/20 border-purple-600/40 text-purple-500",
  biceps: "bg-green-500/20 border-green-500/40 text-green-400",
  triceps: "bg-yellow-500/20 border-yellow-500/40 text-yellow-400",
  forearms: "bg-emerald-500/20 border-emerald-500/40 text-emerald-400",
  quads: "bg-orange-500/20 border-orange-500/40 text-orange-400",
  hamstrings: "bg-violet-500/20 border-violet-500/40 text-violet-400",
  glutes: "bg-rose-500/20 border-rose-500/40 text-rose-400",
  calves: "bg-amber-500/20 border-amber-500/40 text-amber-400",
  core: "bg-pink-500/20 border-pink-500/40 text-pink-400",
  cardio: "bg-cyan-500/20 border-cyan-500/40 text-cyan-400",
  other: "bg-slate-500/20 border-slate-500/40 text-slate-400",
};
const pill =
  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide transition-all";

export default function ExerciseInfo() {
  const { id } = useParams();
  const location = useLocation() as any;
  const navigate = useNavigate();

  const openedFromExercises = location?.state?.fromExercises === true;
  const returnShowLibrary = location?.state?.returnShowLibrary === true;
  const openedFromPicker = location?.state?.fromPicker === true;
  const returnRoute = (location as any)?.state?.returnRoute as
    | string
    | undefined;
  const exerciseToReplace = (location as any)?.state?.exerciseToReplace;
  const routineFromState = (location as any)?.state?.routine;
  const fromNewRoutineFromState = (location as any)?.state?.fromNewRoutine;
  const nameFromState =
    (location?.state?.exerciseName as string | undefined) || "";
  const muscleFromState =
    (location?.state?.muscleGroup as MuscleGroup | undefined) || "other";

  const { data: exercises = [] } = useQuery({
    queryKey: ["exercises"],
    queryFn: getExercises,
  });

  const resolvedId = useMemo(() => {
    if (!id) return "";
    const rid = String(id);
    const byId = exercises.find((e) => String(e.id) === rid);
    if (byId) return String(byId.id);
    if (nameFromState) {
      const byName = exercises.find(
        (e) => e.name.toLowerCase() === nameFromState.toLowerCase(),
      );
      if (byName) return String(byName.id);
    }
    return rid;
  }, [id, exercises, nameFromState]);

  const selectedExercise = useMemo(() => {
    const byId = exercises.find(
      (e) => String(e.id) === String(resolvedId || id),
    );
    if (byId) {
      const lib = libraryExercises.find(
        (l) => l.name.toLowerCase() === byId.name.toLowerCase(),
      );
      return {
        ...byId,
        equipment: byId.equipment ?? lib?.equipment,
        muscleGroup: lib?.muscleGroup ?? byId.muscleGroup,
      };
    }
    const lib = libraryExercises.find(
      (e) => String(e.id) === String(resolvedId || id),
    );
    if (lib) return lib;
    const byName = libraryExercises.find(
      (e) =>
        e.name.toLowerCase() === nameFromState.toLowerCase() ||
        e.name.toLowerCase() === String(id || "").toLowerCase(),
    );
    if (byName) return byName;
    return {
      id: String(id || ""),
      name: nameFromState || `Exercise ${id}`,
      muscleGroup: muscleFromState,
      equipment: undefined,
      createdAt: new Date(),
    };
  }, [exercises, id, resolvedId, nameFromState, muscleFromState]);

  const { data: sets = [] } = useQuery({
    queryKey: ["exercise-sets", resolvedId],
    queryFn: () => getSetsForExercise(String(resolvedId)),
    enabled: !!resolvedId && /^\d+$/.test(resolvedId),
  });

  const { data: cardioSets = [] } = useQuery({
    queryKey: ["exercise-cardio-sets", resolvedId],
    queryFn: async () => {
      try {
        const { getCardioSetsForExercise } = await import("@/lib/api");
        return getCardioSetsForExercise(String(resolvedId));
      } catch (e) {
        return [] as any[];
      }
    },
    enabled:
      !!resolvedId &&
      /^\d+$/.test(resolvedId) &&
      (((selectedExercise?.muscleGroup || "") as string).toLowerCase() ===
        "cardio" ||
        isHiit(selectedExercise?.name || "") ||
        isHiit(nameFromState)),
  });

  const { data: workouts = [] } = useQuery({
    queryKey: ["workouts"],
    queryFn: getWorkouts,
  });

  const [graphMetric, setGraphMetric] = useState<
    "heaviest" | "orm" | "volume" | "duration" | "distance" | "stat" | "reps"
  >("heaviest");
  const [timeRange, setTimeRange] = useState<"1W" | "1M" | "3M" | "ALL">("ALL");

  const completedIds = useMemo(
    () =>
      new Set(
        workouts.filter((w: any) => !!w?.endedAt).map((w: any) => String(w.id)),
      ),
    [workouts],
  );

  const isHiitExercise = isHiit(selectedExercise?.name || "");
  const primaryMuscle = isHiitExercise
    ? "cardio"
    : selectedExercise.muscleGroup || "other";

  const loggedSets = useMemo(() => {
    const strengthFiltered = (sets || []).filter((s: any) =>
      completedIds.has(String(s.workout || s.workoutId || s.workout_id || "")),
    );
    const cardioMapped = (cardioSets || [])
      .filter((s: any) =>
        completedIds.has(
          String(s.workout || s.workoutId || s.workout_id || ""),
        ),
      )
      .map((s: any) => ({
        ...s,
        cardioMode: s.mode,
        cardioDurationSeconds: s.durationSeconds,
        cardioDistance:
          s.mode === "stairs"
            ? s.distance
            : (Number(s.distance ?? 0) || 0) / 1000,
        cardioStat: s.splitSeconds ?? s.level,
      }));
    // Cardio exercises (including HIIT) saved to cardio_sets — show cardioMapped
    if (
      ((selectedExercise?.muscleGroup || "") as string).toLowerCase() ===
        "cardio" ||
      isHiitExercise
    )
      return cardioMapped;
    return strengthFiltered;
  }, [sets, cardioSets, completedIds, selectedExercise, isHiitExercise]);

  const records = useMemo(() => {
    let hw = 0,
      hu = "kg",
      bs = "-",
      e1 = 0;
    (loggedSets || []).forEach((s: any) => {
      const w = Number(s.weight || 0);
      const r = isHiitExercise
        ? typeof s.floors === "number" && s.floors > 0
          ? s.floors
          : Number(s.reps || 0)
        : Number(s.reps || 0);
      if (w > hw) {
        hw = w;
        hu = String(s.unit || "kg");
      }
      if (
        r > 0 &&
        (bs === "-" || r > Number(String(bs).split(" reps")[0] || 0))
      )
        bs = `${r} reps @ ${w || 0}`;
      if (w > 0 && r > 0) {
        const e = w * (1 + r / 30);
        if (e > e1) e1 = e;
      }
    });
    const tw = new Set(
      (loggedSets || []).map((s: any) =>
        String(s.workout || s.workoutId || s.workout_id || ""),
      ),
    ).size;
    return {
      heaviestWeight: hw,
      heaviestUnit: hu,
      bestSet: bs,
      estimated1RM: e1,
      totalWorkouts: tw,
    };
  }, [loggedSets]);

  const groupedHistory = useMemo(() => {
    const map = new Map<
      string,
      {
        workoutId: string;
        workoutName: string;
        date: Date | undefined;
        sets: any[];
      }
    >();
    (loggedSets || []).forEach((s: any) => {
      const wid = String(s.workout || s.workoutId || s.workout_id || "");
      if (!wid) return;
      const w = workouts.find((x: any) => String(x.id) === wid);
      const d = w?.date
        ? new Date(w.date)
        : w?.createdAt
          ? new Date(w.createdAt)
          : undefined;
      if (!map.has(wid))
        map.set(wid, {
          workoutId: wid,
          workoutName: w?.name || `Workout ${wid}`,
          date: d,
          sets: [],
        });
      map.get(wid)?.sets.push(s);
    });
    return Array.from(map.values()).sort(
      (a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0),
    );
  }, [loggedSets, workouts]);

  const lastPerformed = useMemo(
    () =>
      groupedHistory.length > 0 && groupedHistory[0].date
        ? new Date(groupedHistory[0].date)
        : null,
    [groupedHistory],
  );

  const secondaryMuscles = SECONDARY_BY_PRIMARY[
    isHiit(selectedExercise?.name || "")
      ? "cardio"
      : selectedExercise.muscleGroup || "other"
  ] || ["Support Muscles"];

  const progressionPoints = useMemo(() => {
    const dm = new Map<string, { date: Date; value: number }>();
    groupedHistory
      .slice()
      .reverse()
      .forEach((g) => {
        let mv = 0;
        (g.sets || []).forEach((s: any) => {
          const w = Number(s.weight || 0),
            r = Number(s.reps || 0);

          // Cardio handling: accept multiple field names and normalize units
          if (s.cardioMode) {
            // Duration: prefer explicit seconds fields, fallback to split_seconds or duration
            let durSeconds =
              Number(
                s.cardioDurationSeconds ||
                  s.split_seconds ||
                  s.duration_seconds ||
                  0,
              ) || 0;
            // If no seconds fields but `duration` exists as a small number, assume minutes
            if (!durSeconds && s.duration) {
              const dRaw = Number(s.duration || 0);
              if (dRaw > 0) {
                durSeconds = dRaw > 1000 ? dRaw : dRaw * 60;
              }
            }

            // Distance: accept meters or km fields and normalize to kilometers for the chart
            const metersFromMeters =
              Number(s.distance_meters || s.distance_m || 0) || 0;
            const rawDistance =
              Number(s.distance || s.cardioDistance || 0) || 0;
            let distKm = 0;
            if (metersFromMeters > 0) distKm = metersFromMeters / 1000;
            else if (rawDistance > 0) {
              // If value looks like meters (>1000), convert to km
              distKm = rawDistance > 1000 ? rawDistance / 1000 : rawDistance;
            }

            const stat = Number(s.cardioStat || 0);
            // HIIT (bodyweight) tends to use reps + duration
            if (isHiitExercise || s.isHiit) {
              const hiitReps =
                typeof s.floors === "number" && s.floors > 0 ? s.floors : r;
              mv = Math.max(mv, graphMetric === "reps" ? hiitReps : durSeconds);
            } else if (graphMetric === "duration") {
              mv = Math.max(mv, durSeconds);
            } else if (graphMetric === "distance") {
              mv = Math.max(mv, distKm);
            } else if (graphMetric === "stat") {
              // Use cardioStat when present, otherwise try to compute pace (sec per km)
              if (stat > 0) mv = Math.max(mv, stat);
              else if (durSeconds > 0 && distKm > 0) {
                mv = Math.max(mv, durSeconds / distKm);
              }
            }
            return;
          }

          // HIIT strength sets: graph reps or duration directly
          if (isHiitExercise) {
            if (graphMetric === "reps" && r > 0) mv = Math.max(mv, r);
            else if (graphMetric === "duration") {
              const dur = Number(
                s.cardioDurationSeconds || s.duration_seconds || 0,
              );
              if (dur > 0) mv = Math.max(mv, dur);
            }
            return;
          }

          // Strength handling (existing behavior)
          if (graphMetric === "heaviest") {
            if (w > mv) mv = w;
            return;
          }
          if (graphMetric === "orm") {
            if (w > 0 && r > 0) {
              const e = w * (1 + r / 30);
              if (e > mv) mv = e;
            }
            return;
          }
          if (graphMetric === "volume") {
            if (w > 0 && r > 0) mv += w * r;
          }
        });
        const pd = g.date ? new Date(g.date) : null;
        if (!pd || isNaN(pd.getTime())) return;
        const v = Number(mv);
        if (!isFinite(v) || v <= 0) return;
        const key = format(pd, "yyyy-MM-dd");
        const ex = dm.get(key);
        if (!ex) {
          dm.set(key, { date: new Date(key), value: v });
          return;
        }
        if (graphMetric === "volume") ex.value += v;
        else ex.value = Math.max(ex.value, v);
      });
    return Array.from(dm.values()).sort(
      (a, b) => (a.date?.getTime() ?? 0) - (b.date?.getTime() ?? 0),
    );
  }, [groupedHistory, graphMetric]);

  const filteredPoints = useMemo(() => {
    if (timeRange === "ALL") return progressionPoints;
    const now = Date.now();
    const cut =
      timeRange === "1W"
        ? now - 7 * 86400000
        : timeRange === "1M"
          ? now - 30 * 86400000
          : now - 90 * 86400000;
    return progressionPoints.filter(
      (p) => p.date && new Date(p.date).getTime() >= cut,
    );
  }, [progressionPoints, timeRange]);

  const latest =
    filteredPoints.length > 0
      ? filteredPoints[filteredPoints.length - 1]
      : null;

  const fmtCompact = (v: number) =>
    v >= 1000
      ? `${(v / 1000).toFixed(1).replace(".0", "")}k`
      : `${Math.round(v)}`;

  const fmtVal = (v: number) =>
    graphMetric === "volume" || graphMetric === "distance"
      ? fmtCompact(v)
      : graphMetric === "duration" || graphMetric === "stat"
        ? (() => {
            const total = Math.round(v);
            const h = Math.floor(total / 3600);
            const m = Math.floor((total % 3600) / 60)
              .toString()
              .padStart(2, "0");
            const s = (total % 60).toString().padStart(2, "0");
            return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
          })()
        : String(Math.round(v));

  const metricLabel = (m: typeof graphMetric) => {
    if (m === "heaviest") return "Heaviest";
    if (m === "orm") return "Est. 1RM";
    if (m === "volume") return "Volume";
    if (m === "duration") return "Duration";
    if (m === "distance") return "Distance";
    if (m === "stat") return "Pace";
    if (m === "reps") return "Reps";
    return "Value";
  };

  // If this is a cardio or HIIT exercise, default to appropriate metric
  useEffect(() => {
    try {
      if (isHiitExercise) {
        if (!["duration", "reps"].includes(graphMetric)) {
          setGraphMetric("reps");
        }
      } else if (
        (selectedExercise?.muscleGroup || "").toLowerCase() === "cardio"
      ) {
        if (!["duration", "distance", "stat"].includes(graphMetric)) {
          setGraphMetric("duration");
        }
      }
    } catch (e) {
      // ignore
    }
  }, [selectedExercise, isHiitExercise]);

  const metricOptions = useMemo(() => {
    if (isHiitExercise) return ["duration", "reps"] as const;
    if ((selectedExercise?.muscleGroup || "").toLowerCase() === "cardio") {
      return ["duration", "distance", "stat"] as const;
    }
    return ["heaviest", "orm", "volume"] as const;
  }, [selectedExercise, isHiitExercise]);

  const chartData = useMemo(
    () =>
      filteredPoints.map((p) => ({
        date: p.date ? format(new Date(p.date), "MMM d") : "-",
        value: p.value,
      })),
    [filteredPoints],
  );

  // Shared Y-axis domain calculation
  const yDomain = useMemo((): [number | ((v: number) => number), string] => {
    return [
      (dataMin: number) => {
        const maxVal =
          filteredPoints.length > 0
            ? Math.max(...filteredPoints.map((p) => p.value))
            : dataMin;
        return Math.max(0, dataMin - (maxVal - dataMin) * 0.15);
      },
      "auto",
    ];
  }, [filteredPoints]);

  const handleBack = () => {
    if (openedFromPicker) {
      navigate(returnRoute || (-1 as any), {
        state: {
          reopenExerciseDialog: true,
          exerciseToReplace: exerciseToReplace || null,
          routine: routineFromState ?? undefined,
          fromNewRoutine: fromNewRoutineFromState ?? undefined,
        },
      });
      return;
    }
    if (openedFromExercises) {
      navigate("/exercises", { state: { showLibrary: returnShowLibrary } });
      return;
    }
    // Opened from workout exercise card — returnRoute is set, pass routine state back
    if (returnRoute) {
      navigate(returnRoute, {
        state: {
          routine: routineFromState ?? undefined,
          fromNewRoutine: fromNewRoutineFromState ?? undefined,
        },
      });
      return;
    }
    navigate(-1);
  };

  return (
    <AppLayout>
      <div className="space-y-6 mt-1 px-1 sm:px-0 max-w-3xl mx-auto">
        {/* Back / Add */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={handleBack}
            className="h-9 w-9 flex items-center justify-center rounded-full text-white bg-neutral-900/50 border border-neutral-800/60 shadow-sm hover:bg-neutral-900/70"
          >
            ◀
          </button>
          {openedFromPicker && (
            <Button
              variant="ghost"
              className="text-white"
              onClick={() =>
                navigate(returnRoute || (-1 as any), {
                  state: {
                    addExerciseFromInfo: true,
                    exercisePayload: {
                      id: String(selectedExercise.id),
                      name: selectedExercise.name,
                      muscleGroup: selectedExercise.muscleGroup,
                      equipment: (selectedExercise as any).equipment,
                      logType: (selectedExercise as any).logType,
                    },
                    exerciseToReplace: exerciseToReplace || null,
                    routine: routineFromState ?? undefined,
                    fromNewRoutine: fromNewRoutineFromState ?? undefined,
                  },
                })
              }
            >
              <PlusCircle className="h-5 w-5 mr-2" /> Add
            </Button>
          )}
        </div>

        {/* Exercise info */}
        <Card className="rounded-2xl overflow-hidden">
          <CardContent className="px-[18px] py-5">
            <h2 className="text-2xl font-bold text-white">
              {selectedExercise.name}
            </h2>
            <div className="mt-2 flex items-center gap-2">
              {selectedExercise.equipment &&
              selectedExercise.equipment !== "all" ? (
                <span className="inline-flex items-center rounded-full border border-orange-500/40 bg-orange-500/15 px-3 py-1 text-xs font-semibold text-orange-400 uppercase tracking-wide">
                  {selectedExercise.equipment}
                </span>
              ) : null}
            </div>
            <div className="mt-4">
              <div className="h-[100px] w-[100px] rounded-md bg-zinc-800 border border-white/10 p-2 flex items-center justify-center">
                <img
                  src={`/icons/${getExerciseIconFile(selectedExercise.name, selectedExercise.muscleGroup || "", (selectedExercise as any).custom)}`}
                  alt={selectedExercise.name}
                  className="h-full w-full object-contain"
                />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-sm text-muted-foreground block">
                Primary
              </span>
              <div className="mt-1 flex flex-wrap gap-2">
                <span
                  className={`${pill} ${colorMap[primaryMuscle] || colorMap.other}`}
                >
                  {titleCase(String(selectedExercise.muscleGroup || "other"))}
                </span>
              </div>
            </div>
            <div className="mt-2.5">
              <span className="text-sm text-muted-foreground block">
                Secondary
              </span>
              <div className="mt-1 flex flex-wrap gap-2">
                {secondaryMuscles.map((m) => (
                  <span
                    key={m}
                    className={`${pill} ${colorMap[(m || "").toLowerCase()] || colorMap.other}`}
                  >
                    {m}
                  </span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Records */}
        <Card className="rounded-2xl overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-white">Your Records</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 px-[18px] py-5">
            {(primaryMuscle === "cardio"
              ? [
                  {
                    label: "Total Workouts",
                    value: String(records.totalWorkouts),
                  },
                  {
                    label: "Last Performed",
                    value: lastPerformed ? format(lastPerformed, "MMM d") : "-",
                  },
                ]
              : [
                  {
                    label: "Heaviest Weight",
                    value: `${records.heaviestWeight || 0} ${records.heaviestUnit}`,
                  },
                  { label: "Best Set", value: records.bestSet },
                  {
                    label: "Estimated 1RM",
                    value: `${Math.round(records.estimated1RM || 0)} ${records.heaviestUnit}`,
                  },
                  {
                    label: "Total Workouts",
                    value: String(records.totalWorkouts),
                  },
                  {
                    label: "Last Performed",
                    value: lastPerformed ? format(lastPerformed, "MMM d") : "-",
                  },
                ]
            ).map(({ label, value }) => (
              <div
                key={label}
                className="rounded-xl border border-white/10 bg-zinc-900/60 px-4 py-[14px] space-y-2"
              >
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-lg font-semibold text-white">{value}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Progress Graph */}
        <Card className="rounded-2xl overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-white">Progress Graph</CardTitle>
          </CardHeader>
          <CardContent className="px-2 pt-2 pb-3">
            {progressionPoints.length >= 2 ? (
              <div className="mt-2 rounded-xl border border-white/5 bg-zinc-900/60 px-1 pt-2 pb-1">
                <div className="mb-3 px-2 text-sm text-muted-foreground">
                  {latest
                    ? `${metricLabel(graphMetric) === "Volume" ? "Latest Volume" : "Latest"}: ${fmtVal(
                        latest.value,
                      )}${graphMetric === "distance" ? " km" : graphMetric === "stat" ? " / km" : graphMetric === "duration" || isHiitExercise ? "" : " kg"} • ${latest.date ? format(new Date(latest.date), "MMM d") : "-"}`
                    : "Latest: -"}
                </div>
                <div className="mb-3 px-2 flex gap-1.5">
                  {(["1W", "1M", "3M", "ALL"] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setTimeRange(r)}
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold border transition-colors ${timeRange === r ? "border-white/20 bg-zinc-700 text-white" : "border-white/10 bg-transparent text-muted-foreground"}`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
                <div className="mb-4 px-2 flex flex-wrap gap-2">
                  {metricOptions.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setGraphMetric(m as any)}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${graphMetric === m ? "border-orange-500/40 bg-orange-500/15 text-orange-400" : "border-white/10 bg-zinc-800/50 text-muted-foreground hover:text-white"}`}
                    >
                      {m === "heaviest"
                        ? "Heaviest Weight"
                        : m === "orm"
                          ? "1RM"
                          : m === "volume"
                            ? "Volume"
                            : m === "duration"
                              ? "Duration"
                              : m === "distance"
                                ? "Distance"
                                : m === "stat"
                                  ? "Pace"
                                  : m === "reps"
                                    ? "Reps"
                                    : String(m)}
                    </button>
                  ))}
                </div>
                {filteredPoints.length < 2 ? (
                  <div className="flex min-h-[80px] items-center justify-center rounded-xl border border-white/5 bg-zinc-800/40 text-sm text-muted-foreground px-4 py-6 text-center">
                    No data in this range — try a wider window.
                  </div>
                ) : (
                  /* Fixed Y-axis + scrollable chart body */
                  <div className="flex w-full" style={{ height: 200 }}>
                    {/* Fixed Y-axis panel — never scrolls */}
                    <div
                      style={{
                        width: graphMetric === "stat" ? 68 : 56,
                        flexShrink: 0,
                        height: "100%",
                      }}
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={chartData}
                          margin={{ top: 8, right: 0, left: 0, bottom: 10 }}
                        >
                          <YAxis
                            tick={{ fill: "#71717a", fontSize: 11 }}
                            tickLine={false}
                            axisLine={false}
                            width={graphMetric === "stat" ? 72 : 56}
                            tickFormatter={(v) =>
                              v <= 0
                                ? ""
                                : graphMetric === "volume"
                                  ? `${fmtCompact(v)}kg`
                                  : graphMetric === "distance"
                                    ? `${fmtCompact(v)}km`
                                    : graphMetric === "stat"
                                      ? `${fmtVal(v)}/km`
                                      : graphMetric === "duration"
                                        ? String(fmtVal(v))
                                        : isHiitExercise
                                          ? String(Math.round(v))
                                          : `${Math.round(v)}kg`
                            }
                            domain={yDomain}
                          />
                          {/* Invisible area keeps scale in sync with scrollable chart */}
                          <Area
                            type="monotone"
                            dataKey="value"
                            stroke="none"
                            fill="none"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Scrollable chart body — X-axis and line scroll together */}
                    <div
                      style={
                        {
                          flex: 1,
                          overflowX: "auto",
                          overflowY: "hidden",
                          WebkitOverflowScrolling: "touch",
                          scrollbarWidth: "none",
                        } as React.CSSProperties
                      }
                    >
                      <div
                        style={{
                          minWidth: Math.max(filteredPoints.length * 70, 320),
                          height: "100%",
                        }}
                      >
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart
                            data={chartData}
                            margin={{ top: 8, right: 22, left: 20, bottom: 10 }}
                          >
                            <defs>
                              <linearGradient
                                id="areaGradient"
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                              >
                                <stop
                                  offset="5%"
                                  stopColor="#f97316"
                                  stopOpacity={0.25}
                                />
                                <stop
                                  offset="95%"
                                  stopColor="#f97316"
                                  stopOpacity={0}
                                />
                              </linearGradient>
                            </defs>
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke="rgba(255,255,255,0.06)"
                              vertical={false}
                            />
                            <XAxis
                              dataKey="date"
                              tick={{ fill: "#71717a", fontSize: 11 }}
                              tickLine={false}
                              axisLine={false}
                              interval={0}
                              minTickGap={40}
                            />
                            {/* Hidden Y-axis with same domain keeps the chart area aligned */}
                            <YAxis hide domain={yDomain} />
                            <Tooltip
                              contentStyle={{
                                background: "rgba(10,10,10,0.95)",
                                border: "1px solid rgba(255,255,255,0.1)",
                                borderRadius: 8,
                                fontSize: 12,
                                color: "white",
                              }}
                              formatter={(value: number) => {
                                const unit =
                                  graphMetric === "distance"
                                    ? " km"
                                    : graphMetric === "stat"
                                      ? " / km"
                                      : graphMetric === "duration"
                                        ? ""
                                        : isHiitExercise
                                          ? ""
                                          : " kg";
                                return [
                                  `${fmtVal(value)}${unit}`,
                                  metricLabel(graphMetric),
                                ];
                              }}
                              labelStyle={{ color: "#a1a1aa", marginBottom: 4 }}
                              cursor={{
                                stroke: "rgba(249,115,22,0.3)",
                                strokeWidth: 1,
                              }}
                            />
                            <Area
                              type="monotone"
                              dataKey="value"
                              stroke="#f97316"
                              strokeWidth={2}
                              fill="url(#areaGradient)"
                              dot={{ fill: "#f97316", r: 3, strokeWidth: 0 }}
                              activeDot={{
                                fill: "#f97316",
                                r: 5,
                                strokeWidth: 2,
                                stroke: "rgba(249,115,22,0.3)",
                              }}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-2.5 flex min-h-[110px] items-center justify-center rounded-xl border border-white/5 bg-zinc-900/60 text-sm text-muted-foreground">
                Not enough data yet to draw progression.
              </div>
            )}
          </CardContent>
        </Card>

        {/* History */}
        <Card className="rounded-2xl overflow-hidden">
          <CardHeader className="pb-0 pt-4">
            <CardTitle className="text-white">History</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pt-2 pb-3">
            {groupedHistory.length === 0 ? (
              <div className="flex items-center justify-center">
                <Card className="w-full max-w-2xl rounded-2xl overflow-hidden">
                  <CardContent className="px-[18px] py-5 overflow-hidden">
                    <div className="flex flex-col items-center text-center gap-4 py-6">
                      <div className="h-16 w-16 rounded-md bg-zinc-800 border border-white/10 flex items-center justify-center">
                        <PlusCircle className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <h2 className="text-lg font-semibold text-white">
                        No history yet
                      </h2>
                      <p className="text-sm text-muted-foreground max-w-xl">
                        We couldn't find any logged sets for this exercise. Try
                        logging a workout that includes this exercise, or browse
                        the exercise library for alternatives.
                      </p>
                      <div className="flex gap-3 mt-2">
                        <Button
                          onClick={() => navigate("/workouts/new")}
                          className="bg-primary"
                        >
                          Log a workout
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => navigate("/exercises")}
                        >
                          Browse exercises
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="space-y-3">
                {groupedHistory.map((g) => {
                  return (
                    <div
                      key={`h-${g.workoutId}`}
                      className="rounded-xl border border-white/5 bg-white/[0.02] p-3"
                    >
                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={() =>
                            navigate(`/workouts/${g.workoutId}/view`)
                          }
                          className="text-base font-semibold text-white text-left hover:underline"
                        >
                          {g.workoutName}
                        </button>
                        <div className="mt-0.5 text-xs text-muted-foreground/80">
                          {g.date
                            ? format(new Date(g.date), "dd LLL yyyy, HH:mm")
                            : "-"}
                        </div>
                      </div>

                      <div className="mt-3">
                        <div
                          className="mb-1.5 px-1 text-[10px] font-medium text-muted-foreground grid items-center gap-1"
                          style={{
                            gridTemplateColumns: (() => {
                              if (g.sets?.length > 0 && g.sets[0].cardioMode)
                                return isHiitExercise ? GRID_HIIT : GRID_CARDIO;
                              return GRID_STRENGTH;
                            })(),
                          }}
                        >
                          {g.sets?.[0]?.cardioMode ? (
                            isHiitExercise ? (
                              <>
                                <span className="flex justify-center">SET</span>
                                <span className="flex justify-center">
                                  DURATION
                                </span>
                                <span className="flex justify-center">
                                  REPS
                                </span>
                                <span className="flex justify-center">RPE</span>
                                <span className="flex justify-center">PR</span>
                              </>
                            ) : (
                              <>
                                <span className="flex justify-center">SET</span>
                                <span className="flex justify-center">
                                  DURATION
                                </span>
                                <span className="flex justify-center">
                                  DISTANCE
                                </span>
                                <span className="flex justify-center">
                                  LEVEL
                                </span>
                                <span className="flex justify-center">PR</span>
                              </>
                            )
                          ) : (
                            <>
                              <span className="flex justify-center translate-x-[2px]">
                                SET
                              </span>
                              <span className="flex justify-center">
                                WEIGHT
                              </span>
                              <span />
                              <span className="flex justify-center">REPS</span>
                              <span className="flex justify-center">RPE</span>
                              <span className="flex justify-center">
                                <Trophy className="h-3.5 w-3.5 -translate-x-[1px]" />
                              </span>
                            </>
                          )}
                        </div>

                        <div className="space-y-2">
                          {g.sets
                            .slice()
                            .sort(
                              (a: any, b: any) =>
                                (a.setNumber || 0) - (b.setNumber || 0),
                            )
                            .map((s: any, si: number) => (
                              <SetRow
                                key={`h-${g.workoutId}-${si}`}
                                set={s}
                                exerciseName={selectedExercise.name || ""}
                                unit={s.unit || "kg"}
                                setNumber={s.setNumber ?? si + 1}
                                onUpdate={() => {}}
                                onUnitChange={() => {}}
                                onComplete={() => {}}
                                readOnly
                                showComplete={false}
                              />
                            ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
