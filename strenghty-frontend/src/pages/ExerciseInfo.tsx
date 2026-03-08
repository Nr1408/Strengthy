import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import MuscleTag from "@/components/workout/MuscleTag";
import { SetRow } from "@/components/workout/SetRow";
import { muscleGroupColors } from "@/data/mockData";
import { getExerciseIconFile } from "@/lib/exerciseIcons";
import libraryExercises from "@/data/libraryExercises";
import { format } from "date-fns";
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

const GRID_TEMPLATE_STRENGTH_NO_CHECK =
  "minmax(20px, 0.25fr) minmax(60px, 0.7fr) 6px minmax(22px, 0.65fr) minmax(28px, 0.35fr) 32px";
const GRID_TEMPLATE_CARDIO_NO_CHECK =
  "minmax(18px, 0.35fr) minmax(56px, 0.6fr) minmax(56px, 0.8fr) minmax(28px, 0.25fr) 32px";
const GRID_TEMPLATE_HIIT_NO_CHECK =
  "minmax(20px, 0.25fr) minmax(60px, 0.7fr) minmax(48px, 0.7fr) minmax(32px, 0.5fr) 32px";

const isHiitExerciseName = (value: string) => {
  const name = (value || "").toLowerCase();
  return (
    name.includes("hiit") ||
    name.includes("burpee") ||
    name.includes("mountain") ||
    name.includes("climb") ||
    name.includes("jump squat") ||
    name.includes("plank jack") ||
    name.includes("skater") ||
    name.includes("jumping jack") ||
    name.includes("high knee")
  );
};

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
  const exerciseToReplaceFromState = (location as any)?.state
    ?.exerciseToReplace;

  const exerciseNameFromState =
    (location?.state?.exerciseName as string | undefined) || "";
  const muscleFromState =
    (location?.state?.muscleGroup as MuscleGroup | undefined) || "other";

  const { data: exercises = [] } = useQuery({
    queryKey: ["exercises"],
    queryFn: getExercises,
  });

  const resolvedExerciseId = useMemo(() => {
    if (!id) return "";
    const routeId = String(id);
    const byExactId = exercises.find((e) => String(e.id) === routeId);
    if (byExactId) return String(byExactId.id);
    if (exerciseNameFromState) {
      const byName = exercises.find(
        (e) =>
          String(e.name || "").toLowerCase() ===
          String(exerciseNameFromState || "").toLowerCase(),
      );
      if (byName) return String(byName.id);
    }
    return routeId;
  }, [id, exercises, exerciseNameFromState]);

  const { data: sets = [] } = useQuery({
    queryKey: ["exercise-sets", resolvedExerciseId],
    queryFn: () => getSetsForExercise(String(resolvedExerciseId || "")),
    enabled: !!resolvedExerciseId && /^\d+$/.test(String(resolvedExerciseId)),
  });

  const { data: workouts = [] } = useQuery({
    queryKey: ["workouts"],
    queryFn: getWorkouts,
  });

  const [graphMetric, setGraphMetric] = useState<"heaviest" | "orm" | "volume">(
    "heaviest",
  );
  const [activePointIndex, setActivePointIndex] = useState<number | null>(null);
  const [tooltipStyle, setTooltipStyle] = useState<{
    left: number;
    top: number;
    label: string;
  } | null>(null);
  const [timeRange, setTimeRange] = useState<"1W" | "1M" | "3M" | "ALL">("ALL");
  const svgRef = useRef<SVGSVGElement | null>(null);
  const chartViewportRef = useRef<HTMLDivElement | null>(null);
  const [chartViewportWidth, setChartViewportWidth] = useState(0);

  useEffect(() => {
    const el = chartViewportRef.current;
    if (!el) return;
    const update = () => {
      const next = Math.round(el.getBoundingClientRect().width);
      setChartViewportWidth((prev) => (prev !== next ? next : prev));
    };
    update();
    const observer = new ResizeObserver(() => update());
    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, []);

  const selectedExercise = useMemo(() => {
    const byId = exercises.find(
      (e) => String(e.id) === String(resolvedExerciseId || id),
    );
    if (byId) {
      // If the user's exercise exists but doesn't include equipment,
      // try to augment it from the library dataset by matching name.
      if (!byId.equipment) {
        const libByName = libraryExercises.find(
          (le) =>
            String(le.name || "").toLowerCase() ===
            String(byId.name || "").toLowerCase(),
        );
        if (libByName && libByName.equipment) {
          return { ...byId, equipment: libByName.equipment };
        }
      }
      return byId;
    }
    // Try to find in libraryExercises by ID
    const byLibId = libraryExercises.find(
      (e) => String(e.id) === String(resolvedExerciseId || id),
    );
    if (byLibId) return byLibId;
    // Always check by name (case-insensitive) if ID lookup fails
    const byName = libraryExercises.find(
      (e) =>
        String(e.name || "").toLowerCase() ===
          String(exerciseNameFromState || "").toLowerCase() ||
        String(e.name || "").toLowerCase() === String(id || "").toLowerCase(),
    );
    if (byName) return byName;
    return {
      id: String(id || ""),
      name: exerciseNameFromState || `Exercise ${id}`,
      muscleGroup: muscleFromState,
      equipment: undefined,
      createdAt: new Date(),
    };
  }, [
    exercises,
    id,
    resolvedExerciseId,
    exerciseNameFromState,
    muscleFromState,
  ]);

  const completedWorkoutIds = useMemo(
    () =>
      new Set(
        workouts.filter((w: any) => !!w?.endedAt).map((w: any) => String(w.id)),
      ),
    [workouts],
  );

  const loggedSets = useMemo(
    () =>
      (sets || []).filter((s: any) =>
        completedWorkoutIds.has(
          String(s.workout || s.workoutId || s.workout_id || ""),
        ),
      ),
    [sets, completedWorkoutIds],
  );

  const records = useMemo(() => {
    let heaviestWeight = 0;
    let heaviestUnit = "kg";
    let bestSet = "-";
    let estimated1RM = 0;

    (loggedSets || []).forEach((s: any) => {
      const weight = Number(s.weight || 0);
      const reps = Number(s.reps || 0);
      if (weight > heaviestWeight) {
        heaviestWeight = weight;
        heaviestUnit = String(s.unit || "kg");
      }
      if (
        reps > 0 &&
        (bestSet === "-" ||
          reps > Number(String(bestSet).split(" reps")[0] || 0))
      ) {
        bestSet = `${reps} reps @ ${weight || 0}`;
      }
      if (weight > 0 && reps > 0) {
        const est = weight * (1 + reps / 30);
        if (est > estimated1RM) estimated1RM = est;
      }
    });

    const totalWorkouts = new Set(
      (loggedSets || []).map((s: any) =>
        String(s.workout || s.workoutId || s.workout_id || ""),
      ),
    ).size;

    return {
      heaviestWeight,
      heaviestUnit,
      bestSet,
      estimated1RM,
      totalWorkouts,
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

    (loggedSets || []).forEach((set: any) => {
      const workoutId = String(
        set.workout || set.workoutId || set.workout_id || "",
      );
      if (!workoutId) return;
      const workout = workouts.find((w: any) => String(w.id) === workoutId);
      const date = workout?.date
        ? new Date(workout.date)
        : workout?.createdAt
          ? new Date(workout.createdAt)
          : undefined;
      if (!map.has(workoutId)) {
        map.set(workoutId, {
          workoutId,
          workoutName: workout?.name || `Workout ${workoutId}`,
          date,
          sets: [],
        });
      }
      map.get(workoutId)?.sets.push(set);
    });

    return Array.from(map.values()).sort((a, b) => {
      const at = a.date ? new Date(a.date).getTime() : 0;
      const bt = b.date ? new Date(b.date).getTime() : 0;
      return bt - at;
    });
  }, [loggedSets, workouts]);

  const lastPerformed = useMemo(() => {
    return groupedHistory && groupedHistory.length > 0 && groupedHistory[0].date
      ? new Date(groupedHistory[0].date)
      : null;
  }, [groupedHistory]);

  const primaryMuscle = selectedExercise.muscleGroup || "other";
  const secondaryMuscles = SECONDARY_BY_PRIMARY[primaryMuscle] || [
    "Support Muscles",
  ];

  const progressionPoints = useMemo(() => {
    const dailyMap = new Map<string, { date: Date; value: number }>();

    groupedHistory
      .slice()
      .reverse()
      .forEach((group) => {
        let metricValue = 0;
        (group.sets || []).forEach((s: any) => {
          const w = Number(s.weight || 0);
          const reps = Number(s.reps || 0);
          if (graphMetric === "heaviest") {
            if (w > metricValue) metricValue = w;
            return;
          }
          if (graphMetric === "orm") {
            if (w > 0 && reps > 0) {
              const est = w * (1 + reps / 30);
              if (est > metricValue) metricValue = est;
            }
            return;
          }
          if (graphMetric === "volume") {
            if (w > 0 && reps > 0) metricValue += w * reps;
          }
        });

        const parsedDate = group.date ? new Date(group.date) : null;
        if (!parsedDate || Number.isNaN(parsedDate.getTime())) return;
        const value = Number(metricValue);
        if (!Number.isFinite(value) || value <= 0) return;

        const dateKey = format(parsedDate, "yyyy-MM-dd");
        const existing = dailyMap.get(dateKey);
        if (!existing) {
          dailyMap.set(dateKey, { date: new Date(dateKey), value });
          return;
        }
        if (graphMetric === "volume") {
          existing.value += value;
        } else {
          existing.value = Math.max(existing.value, value);
        }
      });

    return Array.from(dailyMap.entries())
      .map(([dateKey, entry]) => ({
        workoutId: dateKey,
        value: entry.value,
        date: entry.date,
      }))
      .sort((a, b) => {
        const at = a.date ? new Date(a.date).getTime() : 0;
        const bt = b.date ? new Date(b.date).getTime() : 0;
        return at - bt;
      });
  }, [groupedHistory, graphMetric]);

  const filteredProgressionPoints = useMemo(() => {
    if (timeRange === "ALL") return progressionPoints;
    const now = Date.now();
    const cutoff =
      timeRange === "1W"
        ? now - 7 * 86400000
        : timeRange === "1M"
          ? now - 30 * 86400000
          : now - 90 * 86400000;
    return progressionPoints.filter(
      (p) => p.date && new Date(p.date).getTime() >= cutoff,
    );
  }, [progressionPoints, timeRange]);

  const pointSpacing = 70;
  const dynamicChartWidth = useMemo(
    () =>
      Math.max(
        chartViewportWidth || 0,
        filteredProgressionPoints.length * pointSpacing,
        260,
      ),
    [chartViewportWidth, filteredProgressionPoints.length],
  );

  useEffect(() => {
    const el = chartViewportRef.current;
    if (!el) return;
    el.scrollLeft = el.scrollWidth;
  }, [dynamicChartWidth, filteredProgressionPoints.length]);

  const graphRenderData = useMemo(() => {
    if (filteredProgressionPoints.length === 0) {
      return {
        points: [] as Array<{ x: number; y: number; value: number }>,
        linePoints: "",
        areaPoints: "",
        yAxisTicks: [] as Array<{ value: number; y: number }>,
        baselineY: 0,
        latestIndex: -1,
        viewWidth: dynamicChartWidth,
      };
    }

    const viewWidth = dynamicChartWidth;
    const topPadding = 2;
    const bottomPadding = 4;
    const horizontalPadding = 4;
    const chartWidth = viewWidth - horizontalPadding * 2;
    const chartHeight = 40 - topPadding - bottomPadding;
    const baselineY = topPadding + chartHeight;

    const timestamps = filteredProgressionPoints.map((p) =>
      p.date ? new Date(p.date).getTime() : 0,
    );
    const minTime = Math.min(...timestamps);
    const maxTime = Math.max(...timestamps);
    const tRange = Math.max(maxTime - minTime, 1);

    const values = filteredProgressionPoints.map((p) => p.value);
    const maxValue = Math.max(...values);
    const minValue = Math.min(...values);
    const rawRange = Math.max(maxValue - minValue, 0);
    // Reduce domain padding so the line sits even closer to the top visually
    const domainPadding = Math.max(rawRange * 0.04, 0.5);

    let yMin = minValue - domainPadding;
    let yMax = maxValue + domainPadding;

    const minVisualSpan = graphMetric === "volume" ? 10 : 4;
    const visualSpan = yMax - yMin;
    if (visualSpan < minVisualSpan) {
      const center = (yMax + yMin) / 2;
      yMin = center - minVisualSpan / 2;
      yMax = center + minVisualSpan / 2;
    }

    const tickCount = 4;
    const roughStep = Math.max((yMax - yMin) / tickCount, 1);
    const tickStep =
      graphMetric === "volume"
        ? Math.max(1, Math.ceil(roughStep / 5) * 5)
        : Math.max(1, Math.ceil(roughStep));

    const domainMin = Math.floor(yMin / tickStep) * tickStep;
    const domainMax = Math.ceil(yMax / tickStep) * tickStep;
    const domainRange = Math.max(domainMax - domainMin, tickStep);

    const yAxisTicks = Array.from({ length: tickCount + 1 }, (_, idx) => {
      const value = domainMax - idx * tickStep;
      const ratio = idx / tickCount;
      const y = topPadding + ratio * chartHeight;
      return { value, y };
    });

    const points = filteredProgressionPoints.map((p) => {
      const timestamp = p.date ? new Date(p.date).getTime() : minTime;
      const x =
        filteredProgressionPoints.length === 1
          ? viewWidth / 2
          : horizontalPadding + ((timestamp - minTime) / tRange) * chartWidth;
      const y =
        topPadding +
        chartHeight -
        ((p.value - domainMin) / domainRange) * chartHeight;
      return { x, y, value: p.value };
    });

    const linePoints = points.map((p) => `${p.x},${p.y}`).join(" ");
    const areaPoints =
      points.length >= 2
        ? `${points[0].x},${baselineY} ${linePoints} ${points[points.length - 1].x},${baselineY}`
        : "";

    return {
      points,
      linePoints,
      areaPoints,
      yAxisTicks,
      baselineY,
      latestIndex: points.length - 1,
      viewWidth,
    };
  }, [dynamicChartWidth, graphMetric, filteredProgressionPoints]);

  const latestProgressPoint =
    filteredProgressionPoints.length > 0
      ? filteredProgressionPoints[filteredProgressionPoints.length - 1]
      : null;

  const formatVolumeCompact = (value: number) => {
    if (value >= 1000) return `${(value / 1000).toFixed(1).replace(".0", "")}k`;
    return `${Math.round(value)}`;
  };

  const graphMetricUnit = "kg";
  const yAxisLabelFormatter = (value: number) => {
    if (graphMetric === "volume") return formatVolumeCompact(value);
    return String(Math.round(value));
  };
  const formatMetricValue = (value: number) => {
    if (graphMetric === "volume") return formatVolumeCompact(value);
    return String(Math.round(value));
  };

  const xAxisTicks = useMemo(() => {
    if (filteredProgressionPoints.length === 0)
      return [] as Array<{
        key: string;
        label: string;
        x: number;
        align: "left" | "center" | "right";
      }>;

    const total = filteredProgressionPoints.length;
    const horizontalPadding = 4;
    const viewWidth = dynamicChartWidth;
    const chartWidth = viewWidth - horizontalPadding * 2;
    const timestamps = filteredProgressionPoints.map((p) =>
      p.date ? new Date(p.date).getTime() : 0,
    );
    const minTime = Math.min(...timestamps);
    const maxTime = Math.max(...timestamps);
    const tRange = Math.max(maxTime - minTime, 1);

    let indexes: number[];
    if (total <= 6) {
      indexes = Array.from({ length: total }, (_, i) => i);
    } else {
      const desiredCount = 5;
      const step = (total - 1) / (desiredCount - 1);
      const unique = new Set<number>();
      for (let i = 0; i < desiredCount; i++) unique.add(Math.round(i * step));
      unique.add(0);
      unique.add(total - 1);
      indexes = Array.from(unique).sort((a, b) => a - b);
    }

    return indexes.map((idx) => {
      const point = filteredProgressionPoints[idx];
      const timestamp = point.date ? new Date(point.date).getTime() : minTime;
      const x =
        total === 1
          ? viewWidth / 2
          : horizontalPadding + ((timestamp - minTime) / tRange) * chartWidth;
      return {
        key: `${point.workoutId}-${idx}`,
        label: point.date ? format(new Date(point.date), "MMM d") : "-",
        x,
        align: "center" as const,
      };
    });
  }, [dynamicChartWidth, filteredProgressionPoints]);

  const chartHorizontalPadding = 4;

  // Color maps copied from Exercises.tsx for pill styling
  const colorMap: Record<string, string> = {
    chest: "bg-red-500/20 border-red-500/40 text-red-400 hover:bg-red-500/30",
    back: "bg-blue-500/20 border-blue-500/40 text-blue-400 hover:bg-blue-500/30",
    shoulders:
      "bg-purple-600/20 border-purple-600/40 text-purple-500 hover:bg-purple-600/30",
    biceps:
      "bg-green-500/20 border-green-500/40 text-green-400 hover:bg-green-500/30",
    triceps:
      "bg-yellow-500/20 border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/30",
    forearms:
      "bg-emerald-500/20 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30",
    quads:
      "bg-orange-500/20 border-orange-500/40 text-orange-400 hover:bg-orange-500/30",
    hamstrings:
      "bg-violet-500/20 border-violet-500/40 text-violet-400 hover:bg-violet-500/30",
    glutes:
      "bg-rose-500/20 border-rose-500/40 text-rose-400 hover:bg-rose-500/30",
    calves:
      "bg-amber-500/20 border-amber-500/40 text-amber-400 hover:bg-amber-500/30",
    core: "bg-pink-500/20 border-pink-500/40 text-pink-400 hover:bg-pink-500/30",
    cardio:
      "bg-cyan-500/20 border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/30",
    other:
      "bg-slate-500/20 border-slate-500/40 text-slate-400 hover:bg-slate-500/30",
  };
  const pill =
    "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide transition-all";

  const handleBack = () => {
    if (openedFromPicker) {
      navigate(returnRoute || -1, {
        state: {
          reopenExerciseDialog: true,
          exerciseToReplace: exerciseToReplaceFromState || null,
        },
      });
      return;
    }
    if (openedFromExercises) {
      navigate("/exercises", { state: { showLibrary: returnShowLibrary } });
      return;
    }
    navigate(-1);
  };

  const handleAddFromInfo = () => {
    const payload = {
      id: String(selectedExercise.id),
      name: selectedExercise.name,
      muscleGroup: selectedExercise.muscleGroup,
    };
    navigate(returnRoute || -1, {
      state: {
        addExerciseFromInfo: true,
        exercisePayload: payload,
        exerciseToReplace: exerciseToReplaceFromState || null,
      },
    });
  };

  return (
    <AppLayout>
      <div className="space-y-6 mt-1 px-1 sm:px-0 max-w-3xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleBack}
              className="h-9 w-9 flex items-center justify-center rounded-full text-white bg-neutral-900/50 border border-neutral-800/60 shadow-sm hover:bg-neutral-900/70"
            >
              ◀
            </button>
          </div>
          {openedFromPicker ? (
            <div>
              <Button
                variant="ghost"
                onClick={handleAddFromInfo}
                className="text-white"
              >
                <PlusCircle className="h-5 w-5 mr-2" />
                Add
              </Button>
            </div>
          ) : null}
        </div>

        {/* Exercise info card */}
        <Card className="rounded-2xl overflow-hidden">
          <CardContent className="px-[18px] py-5">
            <h2 className="text-2xl font-bold text-white">
              {selectedExercise.name}
            </h2>
            {/* Always show equipment badge if present */}
            {selectedExercise.equipment ? (
              <div className="mt-2 flex items-center gap-2">
                <span className="inline-flex items-center rounded-full border border-orange-500/40 bg-orange-500/15 px-3 py-1 text-xs font-semibold text-orange-400 uppercase tracking-wide">
                  {selectedExercise.equipment}
                </span>
              </div>
            ) : (
              <div className="mt-2 flex items-center gap-2">
                <span className="inline-flex items-center rounded-full border border-red-500/40 bg-red-500/15 px-2 py-1 text-xs font-semibold text-red-400">
                  No equipment
                </span>
              </div>
            )}
            <div className="mt-4">
              <div className="h-[100px] w-[100px] rounded-md bg-zinc-800 border border-white/10 p-2 flex items-center justify-center">
                <img
                  src={`/icons/${getExerciseIconFile(selectedExercise.name, selectedExercise.muscleGroup || "")}`}
                  alt={selectedExercise.name}
                  className="h-full w-full object-contain"
                />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-sm text-muted-foreground block">
                Primary
              </span>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span
                  className={`${pill} ${colorMap[primaryMuscle] || colorMap.other}`}
                >
                  {String(selectedExercise.muscleGroup || "other")}
                </span>
              </div>
            </div>
            <div className="mt-2.5">
              <span className="text-sm text-muted-foreground block">
                Secondary
              </span>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                {secondaryMuscles.map((m) => {
                  const key = (m || "").toLowerCase();
                  return (
                    <span
                      key={m}
                      className={`${pill} ${colorMap[key] || colorMap.other}`}
                    >
                      {m}
                    </span>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Records card */}
        <Card className="rounded-2xl overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-white">Your Records</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 px-[18px] py-5">
            <div className="rounded-xl border border-white/10 bg-zinc-900/60 px-4 py-[14px] space-y-2">
              <p className="text-xs text-muted-foreground">Heaviest Weight</p>
              <p className="text-lg font-semibold text-white">
                {records.heaviestWeight || 0} {records.heaviestUnit}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-zinc-900/60 px-4 py-[14px] space-y-2">
              <p className="text-xs text-muted-foreground">Best Set</p>
              <p className="text-lg font-semibold text-white">
                {records.bestSet}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-zinc-900/60 px-4 py-[14px] space-y-2">
              <p className="text-xs text-muted-foreground">Estimated 1RM</p>
              <p className="text-lg font-semibold text-white">
                {Math.round(records.estimated1RM || 0)} {records.heaviestUnit}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-zinc-900/60 px-4 py-[14px] space-y-2">
              <p className="text-xs text-muted-foreground">Total Workouts</p>
              <p className="text-lg font-semibold text-white">
                {records.totalWorkouts}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-zinc-900/60 px-4 py-[14px] space-y-2">
              <p className="text-xs text-muted-foreground">Last Performed</p>
              <p className="text-lg font-semibold text-white">
                {lastPerformed ? format(lastPerformed, "MMM d") : "-"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Progress graph card */}
        <Card className="rounded-2xl overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-white">Progress Graph</CardTitle>
          </CardHeader>
          <CardContent className="px-[18px] pt-[18px] pb-[18px]">
            {progressionPoints.length >= 2 ? (
              <div className="mt-3.5 rounded-xl border border-white/5 bg-zinc-900/60 px-4 pt-10 pb-6">
                {/* Latest value */}
                <div className="mb-3 text-sm text-muted-foreground">
                  {latestProgressPoint
                    ? graphMetric === "volume"
                      ? `Latest Volume: ${formatMetricValue(latestProgressPoint.value)} kg • ${latestProgressPoint.date ? format(new Date(latestProgressPoint.date), "MMM d") : "-"}`
                      : `Latest: ${formatMetricValue(latestProgressPoint.value)} ${graphMetricUnit} • ${latestProgressPoint.date ? format(new Date(latestProgressPoint.date), "MMM d") : "-"}`
                    : graphMetric === "volume"
                      ? "Latest Volume: -"
                      : `Latest: - ${graphMetricUnit}`}
                </div>

                {/* Time range filter */}
                <div className="mb-3 flex gap-1.5">
                  {(["1W", "1M", "3M", "ALL"] as const).map((range) => (
                    <button
                      key={range}
                      type="button"
                      onClick={() => {
                        setTimeRange(range);
                        setTooltipStyle(null);
                      }}
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold border transition-colors ${
                        timeRange === range
                          ? "border-white/20 bg-zinc-700 text-white"
                          : "border-white/10 bg-transparent text-muted-foreground"
                      }`}
                    >
                      {range}
                    </button>
                  ))}
                </div>

                {/* Metric toggle */}
                <div className="mb-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setGraphMetric("heaviest");
                      setTooltipStyle(null);
                    }}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                      graphMetric === "heaviest"
                        ? "border-orange-500/40 bg-orange-500/15 text-orange-400"
                        : "border-white/10 bg-zinc-800/50 text-muted-foreground hover:text-white"
                    }`}
                  >
                    Heaviest Weight
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setGraphMetric("orm");
                      setTooltipStyle(null);
                    }}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                      graphMetric === "orm"
                        ? "border-orange-500/40 bg-orange-500/15 text-orange-400"
                        : "border-white/10 bg-zinc-800/50 text-muted-foreground hover:text-white"
                    }`}
                  >
                    1RM
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setGraphMetric("volume");
                      setTooltipStyle(null);
                    }}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                      graphMetric === "volume"
                        ? "border-orange-500/40 bg-orange-500/15 text-orange-400"
                        : "border-white/10 bg-zinc-800/50 text-muted-foreground hover:text-white"
                    }`}
                  >
                    Volume
                  </button>
                </div>

                {/* Graph or filtered empty state */}
                {filteredProgressionPoints.length < 2 ? (
                  <div className="mt-2.5 flex min-h-[80px] items-center justify-center rounded-xl border border-white/5 bg-zinc-900/60 text-sm text-muted-foreground">
                    No data in this range — try a wider window.
                  </div>
                ) : (
                  <div
                    className="flex items-stretch gap-2 w-full"
                    style={{ position: "relative" }}
                  >
                    {/* Y-axis labels */}
                    <div className="w-[42px] shrink-0 relative h-24 sm:h-28 lg:h-32 xl:h-36 pr-1 text-xs text-muted-foreground text-right">
                      {graphRenderData.yAxisTicks.map((tick, idx) => (
                        <span
                          key={`y-tick-label-${idx}`}
                          className="absolute right-0 -translate-y-1/2 whitespace-nowrap"
                          style={{ top: `${(tick.y / 40) * 100}%` }}
                        >
                          {`${yAxisLabelFormatter(tick.value)} ${graphMetric === "volume" ? "" : "kg"}`.trim()}
                        </span>
                      ))}
                    </div>

                    {/* Scrollable chart viewport */}
                    <div
                      ref={chartViewportRef}
                      className="w-full min-w-0 overflow-x-auto chart-scroll"
                      style={
                        {
                          scrollbarWidth: "none",
                          msOverflowStyle: "none",
                        } as React.CSSProperties
                      }
                    >
                      <div style={{ minWidth: `${dynamicChartWidth + 20}px` }}>
                        <div
                          style={{
                            width: `${dynamicChartWidth}px`,
                            marginLeft: "10px",
                            marginRight: "10px",
                          }}
                        >
                          <svg
                            ref={svgRef}
                            viewBox={`0 0 ${dynamicChartWidth} 40`}
                            preserveAspectRatio="none"
                            className="w-full h-24 sm:h-28 lg:h-32 xl:h-36"
                            onClick={() => setTooltipStyle(null)}
                          >
                            <defs>
                              <linearGradient
                                id="progressGradient"
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                              >
                                <stop
                                  offset="0%"
                                  stopColor="rgba(249,115,22,0.18)"
                                />
                                <stop
                                  offset="50%"
                                  stopColor="rgba(249,115,22,0.05)"
                                />
                                <stop
                                  offset="100%"
                                  stopColor="rgba(249,115,22,0)"
                                />
                              </linearGradient>
                            </defs>

                            {graphRenderData.yAxisTicks.map((tick, idx) => (
                              <line
                                key={`grid-line-${idx}`}
                                x1={chartHorizontalPadding}
                                y1={tick.y}
                                x2={
                                  graphRenderData.viewWidth -
                                  chartHorizontalPadding
                                }
                                y2={tick.y}
                                stroke="rgba(255,255,255,0.06)"
                                strokeWidth="1"
                              />
                            ))}

                            <line
                              x1={chartHorizontalPadding}
                              y1={graphRenderData.baselineY}
                              x2={
                                graphRenderData.viewWidth -
                                chartHorizontalPadding
                              }
                              y2={graphRenderData.baselineY}
                              stroke="rgba(255,255,255,0.05)"
                              strokeWidth="1"
                            />

                            <polygon
                              points={graphRenderData.areaPoints}
                              fill="url(#progressGradient)"
                              opacity="0.65"
                            />

                            <polyline
                              fill="none"
                              stroke="#f97316"
                              strokeWidth="1.3"
                              strokeOpacity="0.9"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              points={graphRenderData.linePoints}
                            />

                            {graphRenderData.points.map((point, idx) => {
                              const isLatest =
                                idx === graphRenderData.latestIndex;
                              return (
                                <ellipse
                                  key={`progress-point-${idx}`}
                                  cx={point.x}
                                  cy={point.y}
                                  rx={4}
                                  ry={isLatest ? 1.5 : 1.3}
                                  fill="#f97316"
                                  stroke="rgba(0,0,0,0.4)"
                                  strokeWidth="0.9"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const svg = svgRef.current;
                                    if (!svg) return;
                                    const ctm = svg.getScreenCTM();
                                    const container = chartViewportRef.current;
                                    if (!ctm || !container) return;
                                    const m: any = ctm as any;
                                    const containerRect =
                                      container.getBoundingClientRect();
                                    const screenX = m.a * point.x + m.e;
                                    const screenY = m.d * point.y + m.f;
                                    setTooltipStyle({
                                      left: screenX - containerRect.left,
                                      top: screenY - containerRect.top,
                                      label: `${formatMetricValue(point.value)} ${graphMetricUnit}`,
                                    });
                                    setActivePointIndex(idx);
                                  }}
                                  style={{ cursor: "pointer" }}
                                >
                                  <title>{`${formatMetricValue(point.value)} ${graphMetricUnit}`}</title>
                                </ellipse>
                              );
                            })}
                          </svg>

                          {/* X-axis date labels */}
                          <div className="mt-2 relative h-4 text-[11px] text-muted-foreground">
                            {xAxisTicks.map((tick) => (
                              <span
                                key={tick.key}
                                className="absolute -translate-x-1/2 whitespace-nowrap"
                                style={{
                                  left: `${(tick.x / dynamicChartWidth) * 100}%`,
                                }}
                              >
                                {tick.label}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Tooltip — outside scroll container so it never clips */}
                    {tooltipStyle && (
                      <div
                        className="pointer-events-none absolute z-20"
                        style={{
                          left: tooltipStyle.left + 42,
                          top: tooltipStyle.top,
                          transform: "translate(-50%, calc(-100% - 10px))",
                        }}
                      >
                        <div
                          style={{
                            background: "rgba(10,10,10,0.95)",
                            borderRadius: "6px",
                            padding: "4px 8px",
                            fontSize: "12px",
                            fontWeight: 700,
                            color: "white",
                            whiteSpace: "nowrap",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
                          }}
                        >
                          {tooltipStyle.label}
                        </div>
                        <div
                          style={{
                            width: 0,
                            height: 0,
                            margin: "0 auto",
                            borderLeft: "5px solid transparent",
                            borderRight: "5px solid transparent",
                            borderTop: "5px solid rgba(10,10,10,0.95)",
                          }}
                        />
                      </div>
                    )}
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

        {/* History card */}
        <Card className="rounded-2xl overflow-hidden">
          <CardHeader className="pb-1">
            <CardTitle className="text-white">History</CardTitle>
          </CardHeader>
          <CardContent className="px-3 py-[6px]">
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
              <div className="space-y-5">
                {groupedHistory.map((g, idx) => (
                  <div
                    key={`h-${g.workoutId}`}
                    className={
                      idx === 0 ? "" : "mt-3 border-t border-white/5 pt-3"
                    }
                  >
                    <Card className="w-full rounded-2xl overflow-hidden">
                      <CardContent className="px-3 py-[6px] overflow-hidden">
                        <div className="flex items-center justify-between">
                          <div>
                            <div>
                              <button
                                type="button"
                                onClick={() =>
                                  navigate(`/workouts/${g.workoutId}/view`)
                                }
                                className="pt-1 text-lg font-semibold text-white text-left hover:underline"
                              >
                                {g.workoutName}
                              </button>
                            </div>
                            <div className="mt-0.5 text-xs text-muted-foreground/80">
                              {g.date
                                ? format(new Date(g.date), "dd LLL yyyy, HH:mm")
                                : "-"}
                            </div>
                          </div>
                        </div>

                        <div className="mt-3">
                          <div
                            className="mb-1.5 px-1 text-[10px] font-medium text-muted-foreground grid items-center gap-1"
                            style={{
                              gridTemplateColumns: ((): string => {
                                const isHiit = isHiitExerciseName(
                                  selectedExercise.name || "",
                                );
                                if (
                                  g.sets &&
                                  g.sets.length > 0 &&
                                  g.sets[0].cardioMode
                                ) {
                                  return isHiit
                                    ? GRID_TEMPLATE_HIIT_NO_CHECK
                                    : GRID_TEMPLATE_CARDIO_NO_CHECK;
                                }
                                return GRID_TEMPLATE_STRENGTH_NO_CHECK;
                              })(),
                            }}
                          >
                            {g.sets && g.sets[0] && g.sets[0].cardioMode ? (
                              (() => {
                                const isHiit = isHiitExerciseName(
                                  selectedExercise.name || "",
                                );
                                if (isHiit) {
                                  return (
                                    <>
                                      <span className="flex justify-center">
                                        SET
                                      </span>
                                      <span className="flex justify-center">
                                        DURATION
                                      </span>
                                      <span className="flex justify-center">
                                        REPS
                                      </span>
                                      <span className="flex justify-center">
                                        RPE
                                      </span>
                                      <span className="flex justify-center">
                                        PR
                                      </span>
                                    </>
                                  );
                                }
                                return (
                                  <>
                                    <span className="flex justify-center">
                                      SET
                                    </span>
                                    <span className="flex justify-center">
                                      DURATION
                                    </span>
                                    <span className="flex justify-center">
                                      DISTANCE
                                    </span>
                                    <span className="flex justify-center">
                                      LEVEL
                                    </span>
                                    <span className="flex justify-center">
                                      PR
                                    </span>
                                  </>
                                );
                              })()
                            ) : (
                              <>
                                <span className="flex justify-center translate-x-[2px]">
                                  SET
                                </span>
                                <span className="flex justify-center">
                                  WEIGHT
                                </span>
                                <span />
                                <span className="flex justify-center">
                                  REPS
                                </span>
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
                              .map((s: any, setIdx: number) => (
                                <SetRow
                                  key={`h-${g.workoutId}-${setIdx}`}
                                  set={s}
                                  exerciseName={selectedExercise.name || ""}
                                  unit={s.unit || "kg"}
                                  setNumber={s.setNumber ?? setIdx + 1}
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
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
