import { useEffect, useRef, useState } from "react";
// Grid templates for strength vs cardio rows
const GRID_TEMPLATE_STRENGTH =
  "minmax(25px, 0.3fr) minmax(65px, 0.75fr) 6px minmax(25px, 0.6fr) minmax(30px, 0.35fr) 28px 30px";
// same as above but without the final check column (30px)
const GRID_TEMPLATE_STRENGTH_NO_CHECK =
  "minmax(25px, 0.25fr) minmax(65px, 0.7fr) 6px minmax(25px, 0.65fr) minmax(30px, 0.35fr) 28px";

// Cardio: Set type | Time | Dist/Floors | Level/Split | PR | Check
const GRID_TEMPLATE_CARDIO =
  "minmax(20px, 0.4fr) minmax(60px, 0.6fr) minmax(60px, 0.8fr) minmax(30px, 0.25fr) 28px 30px";
const GRID_TEMPLATE_CARDIO_NO_CHECK =
  "minmax(20px, 0.4fr) minmax(60px, 0.6fr) minmax(60px, 0.8fr) minmax(30px, 0.25fr) 28px";

import { Check, Trophy } from "lucide-react";
import type { WorkoutSet } from "@/types/workout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { triggerHaptic } from "@/lib/haptics";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";

interface SetRowProps {
  set: WorkoutSet;
  setNumber: number;
  unit?: "lbs" | "kg";
  exerciseName?: string;
  readOnly?: boolean;
  unitInteractiveWhenReadOnly?: boolean;
  showComplete?: boolean;
  onUpdate: (updates: Partial<WorkoutSet>) => void;
  onUnitChange?: (unit: "lbs" | "kg") => void;
  onComplete: () => void;
}

function HeaderCell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-8 w-full items-center justify-center text-center leading-none">
      {children}
    </div>
  );
}

function Cell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-8 w-full items-center justify-center text-center leading-none">
      {children}
    </div>
  );
}

export function SetRow({
  set,
  setNumber,
  unit = "lbs",
  exerciseName,
  readOnly = false,
  unitInteractiveWhenReadOnly = false,
  showComplete = true,
  onUpdate,
  onUnitChange,
  onComplete,
}: SetRowProps) {
  const isCardio = !!set.cardioMode;
  const currentType = (set.type || "S") as "W" | "S" | "F" | "D";
  const typeClasses: Record<"W" | "S" | "F" | "D", string> = {
    W: "bg-muted/30 text-yellow-400 border-yellow-400/60",
    S: "bg-muted/30 text-white border-border",
    F: "bg-red-500/10 text-red-300 border-red-500/40",
    D: "bg-blue-500/10 text-blue-300 border-blue-500/40",
  };

  const rpeOptions = [
    { value: 10, label: "10 - All-out / failure" },
    { value: 9.5, label: "9.5 - Hard, maybe more weight" },
    { value: 9, label: "9.0 - 1 rep in reserve" },
    { value: 8.5, label: "8.5 - 1-2 reps in reserve" },
    { value: 8, label: "8.0 - 2 reps in reserve" },
    { value: 7.5, label: "7.5 - 2-3 reps in reserve" },
    { value: 7, label: "7.0 - Easy / warm-up" },
  ];

  const hasRpe = typeof set.rpe === "number" && !isNaN(set.rpe);
  const sliderValue = hasRpe ? (set.rpe as number) : 8.5;
  const rpeInfo = rpeOptions.find((o) => o.value === sliderValue)?.label;

  const weight =
    typeof set.weight === "number" && !isNaN(set.weight) ? set.weight : 0;
  const reps = typeof set.reps === "number" && !isNaN(set.reps) ? set.reps : 0;

  const cardioDurationSeconds =
    typeof set.cardioDurationSeconds === "number" &&
    !isNaN(set.cardioDurationSeconds)
      ? set.cardioDurationSeconds
      : 0;
  const cardioDistance =
    typeof set.cardioDistance === "number" && !isNaN(set.cardioDistance)
      ? set.cardioDistance
      : 0;
  const cardioDistanceUnit =
    (set as any).cardioDistanceUnit === "mile"
      ? "mile"
      : (set as any).cardioDistanceUnit === "m"
        ? "m"
        : (set as any).cardioDistanceUnit === "flr"
          ? "flr"
          : "km";
  const cardioStat =
    typeof set.cardioStat === "number" && !isNaN(set.cardioStat)
      ? set.cardioStat
      : 0;

  const [timeInput, setTimeInput] = useState<string>("");
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const [pickerHours, setPickerHours] = useState(0);
  const [pickerMinutes, setPickerMinutes] = useState(0);
  const [pickerSeconds, setPickerSeconds] = useState(0);
  const [paceInput, setPaceInput] = useState<string>("");

  // Helper to format seconds as mm:ss for < 1h, or H:MM:SS for >= 1h
  const formatSecondsToMMSS = (seconds: number): string => {
    if (!seconds || seconds <= 0) return "";
    const total = Math.round(seconds);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60)
      .toString()
      .padStart(2, "0");
    const s = (total % 60).toString().padStart(2, "0");
    if (h > 0) {
      return `${h}:${m}:${s}`;
    }
    return `${m}:${s}`;
  };

  // Parse a mm:ss (or mm) input into seconds
  const parseTimeInput = (value: string): number => {
    const trimmed = value.trim();
    if (!trimmed) return 0;
    const parts = trimmed.split(":");
    if (parts.length === 1) {
      const minutes = Number(parts[0]);
      return isNaN(minutes) ? 0 : minutes * 60;
    }
    const minutes = Number(parts[0]);
    const seconds = Number(parts[1]);
    if (isNaN(minutes) || isNaN(seconds)) return 0;
    return minutes * 60 + seconds;
  };

  useEffect(() => {
    if (isCardio) {
      setTimeInput(formatSecondsToMMSS(cardioDurationSeconds));
    } else {
      setTimeInput("");
    }
  }, [isCardio, cardioDurationSeconds]);

  // Keep rowing pace text in sync with stored seconds
  useEffect(() => {
    if (isCardio && set.cardioMode === "row") {
      setPaceInput(cardioStat > 0 ? formatSecondsToMMSS(cardioStat) : "");
    } else {
      setPaceInput("");
    }
  }, [isCardio, set.cardioMode, cardioStat]);

  // Initialize picker values when the duration dialog opens
  useEffect(() => {
    if (!timePickerOpen || !isCardio) return;
    const total = Math.max(0, Math.round(cardioDurationSeconds));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    setPickerHours(h);
    setPickerMinutes(m);
    setPickerSeconds(s);
  }, [timePickerOpen, isCardio, cardioDurationSeconds]);

  type PrLine = { label: string; value: string };
  const prLines: PrLine[] = [];
  if (isCardio && set.cardioMode) {
    // `cardioDistance` is stored in user-facing units (km or miles).
    // Treat it as kilometers when the unit is `km`.
    const distanceKm = cardioDistance;

    if (
      (set.cardioMode === "treadmill" ||
        set.cardioMode === "bike" ||
        set.cardioMode === "elliptical") &&
      cardioDistance > 0
    ) {
      if (set.cardioDistancePR) {
        prLines.push({
          label: "Best Distance",
          value: `${distanceKm.toFixed(2)} km`,
        });
      }

      if (set.cardioPacePR && cardioDurationSeconds > 0) {
        // `cardioDistance` here is stored in user-facing units (km or miles).
        // Compute seconds-per-kilometer correctly:
        // - if unit is km: secondsPerKm = duration / distance(km)
        // - if unit is mile: convert miles -> km then secondsPerKm = duration / (distance_miles * 1.60934)
        let paceSecondsPerKm = 0;
        try {
          if (cardioDistance > 0) {
            if (cardioDistanceUnit === "mile") {
              const km = cardioDistance * 1.60934;
              paceSecondsPerKm = cardioDurationSeconds / km;
            } else {
              paceSecondsPerKm = cardioDurationSeconds / cardioDistance;
            }
          }
        } catch (e) {
          paceSecondsPerKm = 0;
        }

        if (paceSecondsPerKm > 0) {
          prLines.push({
            label: "Best Pace",
            value: `${formatSecondsToMMSS(paceSecondsPerKm)} / km`,
          });
        }
      }
    }

    if (set.cardioMode === "stairs" && cardioDistance > 0) {
      if (set.cardioAscentPR) {
        prLines.push({
          label: "Most Floors",
          value: `${cardioDistance.toFixed(0)} floors`,
        });
      }

      if (set.cardioIntensityPR && cardioDurationSeconds > 0) {
        const floorsPerMin = cardioDistance / (cardioDurationSeconds / 60);
        if (floorsPerMin > 0) {
          prLines.push({
            label: "Best Intensity",
            value: `${floorsPerMin.toFixed(1)} floors/min`,
          });
        }
      }
    }

    if (set.cardioMode === "row" && cardioDistance > 0) {
      if (set.cardioDistancePR) {
        prLines.push({
          label: "Best Distance",
          value: `${distanceKm.toFixed(2)} km`,
        });
      }

      if (set.cardioSplitPR && cardioStat > 0) {
        prLines.push({
          label: "Best Split",
          value: `${formatSecondsToMMSS(cardioStat)} / 500m`,
        });
      }
    }
  } else {
    if (set.absWeightPR && weight > 0) {
      prLines.push({
        label: "Heaviest Weight",
        value: `${weight.toFixed(1)} ${unit}`,
      });
    }

    if (set.e1rmPR && weight > 0 && reps > 0 && reps < 37) {
      const est1rm = (weight * 36) / (37 - reps);
      prLines.push({
        label: "Best 1RM",
        value: `${est1rm.toFixed(1)} ${unit}`,
      });
    }

    if (set.volumePR && weight > 0 && reps > 0) {
      const LBS_PER_KG = 2.20462;
      const volumeKg =
        unit === "kg" ? weight * reps : (weight / LBS_PER_KG) * reps;
      prLines.push({
        label: "Best Set Volume",
        value: `${volumeKg.toFixed(1)} kg`,
      });
    }
  }

  const [open, setOpen] = useState(false);
  const [halfDialogOpen, setHalfDialogOpen] = useState(false);
  const [halfSliderValue, setHalfSliderValue] = useState<number>(
    Math.max(1, Math.min(5, Number(set.halfReps) || 1)),
  );

  const [rpeDialogOpen, setRpeDialogOpen] = useState(false);
  const [localRpe, setLocalRpe] = useState<number>(sliderValue);

  useEffect(() => {
    if (rpeDialogOpen) {
      setLocalRpe(sliderValue);
    }
  }, [rpeDialogOpen, sliderValue]);

  useEffect(() => {
    if (halfDialogOpen) {
      setHalfSliderValue(Math.max(1, Math.min(5, Number(set.halfReps) || 1)));
    }
  }, [halfDialogOpen, set.halfReps]);
  // Only show the trophy if the set is flagged as a PR and there are
  // actual PR lines to display. Prevents showing the trophy when
  // `isPR` is true but no PR details were detected.
  const showTrophy =
    set.isPR && (readOnly || set.completed) && prLines.length > 0;

  return (
    <div
      className="grid gap-2 rounded-lg border border-border px-2 py-1 items-center mx-auto"
      style={{
        gridTemplateColumns: isCardio
          ? showComplete
            ? GRID_TEMPLATE_CARDIO
            : GRID_TEMPLATE_CARDIO_NO_CHECK
          : showComplete
            ? GRID_TEMPLATE_STRENGTH
            : GRID_TEMPLATE_STRENGTH_NO_CHECK,
        maxWidth: "100%",
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      {/* Column 1: Set type */}
      <Cell>
        {!readOnly ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={cn(
                  "h-8 w-full rounded-md border text-[0.7rem] font-semibold focus:outline-none flex items-center justify-center",
                  typeClasses[currentType],
                )}
                aria-label={`Set type ${currentType}`}
              >
                {currentType === "W"
                  ? "W"
                  : currentType === "S"
                    ? "1"
                    : currentType === "F"
                      ? "F"
                      : "D"}
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent className="w-56 p-0">
              <div className="space-y-2 rounded-md bg-neutral-900 p-3">
                <DropdownMenuLabel className="px-0 text-white">
                  Select Set Type
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="-mx-3" />

                <DropdownMenuItem
                  onClick={() => onUpdate({ type: "W" })}
                  className="flex items-center gap-3 py-2 text-white"
                >
                  <span className="w-4 text-xs font-bold text-yellow-400">
                    W
                  </span>
                  <span className="text-sm">Warm Up Set</span>
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => onUpdate({ type: "S" })}
                  className="flex items-center gap-3 py-2 text-white"
                >
                  <span className="w-4 text-xs font-bold text-white">1</span>
                  <span className="text-sm">Normal Set</span>
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => onUpdate({ type: "F" })}
                  className="flex items-center gap-3 py-2 text-white"
                >
                  <span className="w-4 text-xs font-bold text-red-400">F</span>
                  <span className="text-sm">Failure Set</span>
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => onUpdate({ type: "D" })}
                  className="flex items-center gap-3 py-2 text-white"
                >
                  <span className="w-4 text-xs font-bold text-sky-400">D</span>
                  <span className="text-sm">Drop Set</span>
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div
            className={cn(
              "h-8 w-full rounded-md border px-1 text-[0.7rem] font-semibold flex items-center justify-center",
              typeClasses[currentType],
            )}
          >
            {currentType === "W"
              ? "W"
              : currentType === "S"
                ? "1"
                : currentType === "F"
                  ? "F"
                  : "D"}
          </div>
        )}
      </Cell>

      {/* Column 2: Strength weight+unit OR Cardio time */}
      <Cell>
        {isCardio ? (
          <div className="flex w-full h-8 items-center">
            <label className="sr-only">Time</label>
            <button
              type="button"
              disabled={readOnly}
              onClick={() => {
                if (!readOnly) setTimePickerOpen(true);
              }}
              className="h-8 w-full rounded-md border border-border bg-neutral-900/60 px-2 text-center text-[11px] sm:text-[12.5px] text-white/90"
            >
              {timeInput || "00:00"}
            </button>
          </div>
        ) : (
          <div className="flex w-full h-8 items-center -space-x-[1px]">
            <Input
              type="number"
              placeholder="0"
              value={
                typeof set.weight === "number" && set.weight !== 0
                  ? String(set.weight)
                  : ""
              }
              onChange={(e) =>
                !readOnly && onUpdate({ weight: Number(e.target.value) })
              }
              disabled={readOnly}
              /* Added [appearance:textfield] and [&::-webkit-outer-spin-button]:appearance-none to remove arrows */
              className="h-8 flex-1 px-1 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none text-[11px] sm:text-[12.5px] rounded-r-none focus-visible:ring-1 focus-visible:ring-offset-0 border-border"
            />
            {!readOnly || unitInteractiveWhenReadOnly ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="h-8 flex items-center justify-center gap-1 rounded-r-md border border-l-0 border-border bg-muted/20 px-2 text-[10px] font-bold text-muted-foreground hover:bg-muted/30 transition-colors"
                  >
                    {unit}
                    <span className="text-[8px] opacity-50">▼</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-20 p-1">
                  <DropdownMenuItem
                    className="text-white text-xs justify-center"
                    onClick={() => onUnitChange?.("lbs")}
                  >
                    lbs
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-white text-xs justify-center"
                    onClick={() => onUnitChange?.("kg")}
                  >
                    kg
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="h-8 flex items-center justify-center rounded-r-md border border-l-0 border-border bg-muted/10 px-2 text-[10px] font-bold text-muted-foreground/50">
                {unit}
              </div>
            )}
          </div>
        )}
      </Cell>

      {/* Column 3: Strength spacer OR Cardio distance/floors with unit */}
      <Cell>
        {isCardio ? (
          <div className="flex w-full h-8 items-center -space-x-[1px]">
            <div className="flex-1">
              <label className="sr-only">
                {set.cardioMode === "stairs" ? "Floors" : "Distance"}
              </label>
              <Input
                type="number"
                placeholder={
                  set.cardioMode === "stairs"
                    ? cardioDistanceUnit === "flr"
                      ? "floors"
                      : "meters"
                    : "dist"
                }
                value={
                  cardioDistance && cardioDistance > 0
                    ? String(cardioDistance)
                    : ""
                }
                onChange={(e) =>
                  !readOnly &&
                  onUpdate({ cardioDistance: Number(e.target.value) || 0 })
                }
                disabled={readOnly}
                className="h-8 w-full px-1 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none text-[11px] sm:text-[12.5px] rounded-r-none focus-visible:ring-1 focus-visible:ring-offset-0 border-border"
              />
            </div>
            {set.cardioMode === "stairs" ? (
              // For stairs allow choosing between floors and meters
              !readOnly ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="h-8 flex items-center justify-center gap-1 rounded-r-md border border-l-0 border-border bg-muted/20 px-2 text-[10px] font-bold text-muted-foreground hover:bg-muted/30 transition-colors"
                    >
                      {cardioDistanceUnit === "flr" ? "flr" : "m"}
                      <span className="text-[8px] opacity-50">▼</span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    className="w-[120px] p-2 bg-zinc-950 backdrop-blur-sm border border-zinc-800 shadow-2xl rounded-lg origin-top-right transition-transform duration-150 ease-out"
                    style={{ transformOrigin: "top right" }}
                  >
                    <DropdownMenuItem
                      className={cn(
                        "w-full text-center py-3 text-sm flex items-center justify-center gap-2 rounded-sm transition-colors",
                        cardioDistanceUnit === "flr"
                          ? "text-orange-500"
                          : "text-muted-foreground",
                      )}
                      onClick={() =>
                        onUpdate({ cardioDistanceUnit: "flr" as any })
                      }
                    >
                      {cardioDistanceUnit === "flr" && (
                        <Check className="h-4 w-4 text-orange-500" />
                      )}
                      <span>floors</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className={cn(
                        "w-full text-center py-3 text-sm flex items-center justify-center gap-2 rounded-sm transition-colors",
                        cardioDistanceUnit === "m"
                          ? "text-orange-500"
                          : "text-muted-foreground",
                      )}
                      onClick={() =>
                        onUpdate({ cardioDistanceUnit: "m" as any })
                      }
                    >
                      {cardioDistanceUnit === "m" && (
                        <Check className="h-4 w-4 text-orange-500" />
                      )}
                      <span>meters</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="h-8 flex items-center justify-center rounded-r-md border border-l-0 border-border bg-muted/10 px-2 text-[10px] font-bold text-muted-foreground/60">
                  {cardioDistanceUnit === "flr" ? "flr" : "m"}
                </div>
              )
            ) : !readOnly ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="h-8 flex items-center justify-center gap-1 rounded-r-md border border-l-0 border-border bg-muted/20 px-2 text-[10px] font-bold text-muted-foreground hover:bg-muted/30 transition-colors"
                  >
                    {cardioDistanceUnit === "mile" ? "mile" : "km"}
                    <span className="text-[8px] opacity-50">▼</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-[120px] p-2 bg-zinc-950 backdrop-blur-sm border border-zinc-800 shadow-2xl rounded-lg origin-top-right transition-transform duration-150 ease-out"
                  style={{ transformOrigin: "top right" }}
                >
                  <DropdownMenuItem
                    className={cn(
                      "w-full text-center py-3 text-sm flex items-center justify-center gap-2 rounded-sm transition-colors",
                      cardioDistanceUnit === "km"
                        ? "text-orange-500"
                        : "text-muted-foreground",
                    )}
                    onClick={() =>
                      onUpdate({ cardioDistanceUnit: "km" as any })
                    }
                  >
                    {cardioDistanceUnit === "km" && (
                      <Check className="h-4 w-4 text-orange-500" />
                    )}
                    <span>km</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className={cn(
                      "w-full text-center py-3 text-sm flex items-center justify-center gap-2 rounded-sm transition-colors",
                      cardioDistanceUnit === "mile"
                        ? "text-orange-500"
                        : "text-muted-foreground",
                    )}
                    onClick={() =>
                      onUpdate({ cardioDistanceUnit: "mile" as any })
                    }
                  >
                    {cardioDistanceUnit === "mile" && (
                      <Check className="h-4 w-4 text-orange-500" />
                    )}
                    <span>mile</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="h-8 flex items-center justify-center rounded-r-md border border-l-0 border-border bg-muted/10 px-2 text-[10px] font-bold text-muted-foreground/60">
                {cardioDistanceUnit === "mile" ? "mile" : "km"}
              </div>
            )}
          </div>
        ) : (
          <span>×</span>
        )}
      </Cell>

      {/* Column 4: Strength reps OR Cardio machine-specific stat */}
      <Cell>
        {isCardio ? (
          <div className="w-full">
            <label className="sr-only">
              {set.cardioMode === "row"
                ? "Pace (per 500m)"
                : set.cardioMode === "stairs"
                  ? "Level"
                  : "Level"}
            </label>
            <Input
              type={set.cardioMode === "row" ? "text" : "number"}
              placeholder={
                set.cardioMode === "row"
                  ? "mm:ss"
                  : set.cardioMode === "stairs"
                    ? "lvl"
                    : set.cardioMode === "treadmill"
                      ? "%"
                      : "lvl"
              }
              value={
                set.cardioMode === "row"
                  ? paceInput
                  : cardioStat && cardioStat !== 0
                    ? String(cardioStat)
                    : ""
              }
              onChange={(e) => {
                if (readOnly) return;
                if (set.cardioMode === "row") {
                  const val = e.target.value;
                  setPaceInput(val);
                  const seconds = parseTimeInput(val);
                  onUpdate({ cardioStat: seconds });
                } else {
                  onUpdate({ cardioStat: Number(e.target.value) || 0 });
                }
              }}
              disabled={readOnly}
              className="h-8 w-full px-1 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none text-[11px] leading-none sm:text-[12.5px] focus-visible:ring-1 focus-visible:ring-offset-0"
            />
          </div>
        ) : (
          <div className="relative w-full h-8">
            <label className="sr-only">Reps</label>
            <Input
              type="number"
              placeholder="reps"
              value={set.reps || ""}
              onChange={(e) =>
                !readOnly && onUpdate({ reps: Number(e.target.value) })
              }
              disabled={readOnly}
              className="h-8 w-full px-1 pr-8 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none text-[11px] leading-none sm:text-[12.5px] focus-visible:ring-1 focus-visible:ring-offset-0"
            />
            {/* Half-reps button: editable increments when not readOnly; when readOnly
                and there are partials, open a dialog to show the count. */}
            <div className="absolute right-1 top-1/2 -translate-y-1/2">
              <Dialog open={halfDialogOpen} onOpenChange={setHalfDialogOpen}>
                <DialogTrigger asChild>
                  <button
                    type="button"
                    aria-label={
                      (set.halfReps || 0) > 0
                        ? `Half reps: ${Math.min(5, Number(set.halfReps) || 0)}`
                        : "Add half reps"
                    }
                    onClick={() => {
                      if (readOnly) {
                        // open the dialog to show partial reps when viewing
                        if ((set.halfReps || 0) > 0) setHalfDialogOpen(true);
                        return;
                      }
                      // When editing, open the partial-reps editor without
                      // automatically incrementing the value. This prevents
                      // accidental increments when the user intends to adjust
                      // via the slider.
                      setHalfDialogOpen(true);
                    }}
                    className={cn(
                      "h-6 w-6 rounded-sm text-[11px] font-semibold leading-none flex items-center justify-center select-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0",
                      (set.halfReps || 0) > 0
                        ? "bg-neutral-900/70 text-orange-500 border border-orange-500"
                        : "bg-transparent text-muted-foreground/70 hover:text-muted-foreground border border-border",
                    )}
                  >
                    {(set.halfReps || 0) > 0 ? (
                      <span>{Math.min(5, Number(set.halfReps) || 0)}</span>
                    ) : (
                      <span>½</span>
                    )}
                  </button>
                </DialogTrigger>

                {/* Dialog content: read-only shows a simple message; editable shows a slider (1-5) */}
                <DialogContent className="fixed left-1/2 top-1/2 z-50 max-w-xs -translate-x-1/2 -translate-y-1/2">
                  {readOnly ? (
                    <>
                      <DialogHeader>
                        <DialogTitle>Partial Reps</DialogTitle>
                      </DialogHeader>
                      <div className="mt-2 text-sm">
                        This set contains{" "}
                        <span className="font-medium">
                          {Math.min(5, Number(set.halfReps) || 0)}
                        </span>{" "}
                        partial rep{(set.halfReps || 0) === 1 ? "" : "s"}.
                      </div>
                    </>
                  ) : (
                    <PartialRepsEditor
                      initialValue={Math.max(
                        1,
                        Math.min(5, Number(set.halfReps) || 1),
                      )}
                      onCancel={() => setHalfDialogOpen(false)}
                      onClear={() => {
                        onUpdate({ halfReps: 0 });
                        setHalfDialogOpen(false);
                      }}
                      onSave={(val) => {
                        onUpdate({ halfReps: val });
                        setHalfDialogOpen(false);
                      }}
                    />
                  )}
                </DialogContent>
              </Dialog>
            </div>
          </div>
        )}
      </Cell>

      {/* Column 5: RPE control (centered dialog on click) - strength only */}
      {!isCardio && (
        <Cell>
              {!readOnly ? (
            <Dialog open={rpeDialogOpen} onOpenChange={setRpeDialogOpen}>
              <DialogTrigger asChild>
                <button
                  type="button"
                  className="flex h-8 w-full items-center justify-center rounded-md border border-border bg-neutral-900/70 px-1 text-[0.7rem] text-white/90"
                >
                  {hasRpe ? sliderValue.toFixed(1) : "RPE"}
                </button>
              </DialogTrigger>
              <DialogContent className="fixed left-1/2 top-1/2 z-50 max-w-sm -translate-x-1/2 -translate-y-1/2 min-h-[280px] pb-20 overflow-visible">
                <DialogHeader>
                  <DialogTitle>Log Set RPE</DialogTitle>
                  <div className="text-xs text-muted-foreground mt-1">
                    Adjust how hard this set felt.
                  </div>
                </DialogHeader>

                <div className="flex flex-col gap-4 py-2">
                  <div className="text-4xl font-bold text-center text-white">
                    {(rpeDialogOpen ? localRpe : sliderValue).toFixed(1)}
                  </div>
                  <div className="text-sm text-center text-muted-foreground min-h-[2.25rem]">
                    {rpeInfo}
                  </div>
                  <div className="px-6 w-full">
                    <div
                      className="relative w-full"
                      style={{
                        // CSS variable to tune the usable track inset (half thumb width)
                        // Adjust if your slider thumb is a different size.
                        ["--rpe-edge-gap" as any]: "12px",
                      }}
                    >
                      {/* Slider occupies full width of the inner area */}
                      <div className="w-full z-10">
                        <Slider
                          className="w-full"
                          min={7}
                          max={10}
                          step={0.5}
                          value={[rpeDialogOpen ? localRpe : sliderValue]}
                          onValueChange={(vals) => setLocalRpe(vals[0] ?? localRpe)}
                        />
                      </div>

                      {/* Absolute tick overlay positioned relative to the slider track's usable width */}
                      <div
                        className="pointer-events-none"
                        style={{
                          position: "absolute",
                          left: "var(--rpe-edge-gap)",
                          right: "var(--rpe-edge-gap)",
                          top: "100%",
                          marginTop: 8,
                        }}
                      >
                        {/* Each tick uses percentage positions across the usable track */}
                        <div className="relative h-5">
                          <div
                            style={{
                              position: "absolute",
                              left: "0%",
                              transform: "translateX(-50%)",
                            }}
                            className="text-sm text-muted-foreground"
                          >
                            7
                          </div>
                          <div
                            style={{
                              position: "absolute",
                              left: "16.6666667%",
                              transform: "translateX(-50%)",
                            }}
                            className="text-sm text-muted-foreground"
                          >
                            7.5
                          </div>
                          <div
                            style={{
                              position: "absolute",
                              left: "33.3333333%",
                              transform: "translateX(-50%)",
                            }}
                            className="text-sm text-muted-foreground"
                          >
                            8
                          </div>
                          <div
                            style={{
                              position: "absolute",
                              left: "50%",
                              transform: "translateX(-50%)",
                            }}
                            className="text-sm text-muted-foreground"
                          >
                            8.5
                          </div>
                          <div
                            style={{
                              position: "absolute",
                              left: "66.6666667%",
                              transform: "translateX(-50%)",
                            }}
                            className="text-sm text-muted-foreground"
                          >
                            9
                          </div>
                          <div
                            style={{
                              position: "absolute",
                              left: "83.3333333%",
                              transform: "translateX(-50%)",
                            }}
                            className="text-sm text-muted-foreground"
                          >
                            9.5
                          </div>
                          <div
                            style={{
                              position: "absolute",
                              left: "100%",
                              transform: "translateX(-50%)",
                            }}
                            className="text-sm text-muted-foreground"
                          >
                            10
                          </div>
                        </div>
                      </div>
                      <div
                        style={{
                          position: "absolute",
                          left: "var(--rpe-edge-gap)",
                          right: "var(--rpe-edge-gap)",
                          top: "calc(100% + 38px)",
                        }}
                        className="pointer-events-auto"
                      >
                        <Button
                          className="w-full"
                          onClick={() => {
                            onUpdate({ rpe: Number(localRpe) });
                            setRpeDialogOpen(false);
                          }}
                        >
                          Done 
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          ) : (
            <div className="flex h-8 w-full items-center justify-center rounded-md border border-border bg-neutral-900/70 px-1 text-[0.7rem] text-white/90">
              {hasRpe ? sliderValue.toFixed(1) : "RPE"}
            </div>
          )}
        </Cell>
      )}

      {/* Cardio duration picker dialog */}
      {isCardio && !readOnly && (
        <Dialog open={timePickerOpen} onOpenChange={setTimePickerOpen}>
          <DialogContent className="max-w-[360px] rounded-[28px] bg-neutral-950 border border-neutral-800/40 text-white pb-4 pt-2">
            <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-neutral-800" />
            <DialogHeader className="items-center text-center pb-1">
              <DialogTitle className="font-heading text-base font-semibold tracking-tight">
                Duration
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-1">
                Set how long this cardio set lasted.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-1">
              <div className="flex items-center justify-center gap-2 text-sm font-medium text-white">
                <span>{pickerHours}h</span>
                <span>{pickerMinutes}m</span>
                <span>{pickerSeconds}s</span>
              </div>
              <div className="relative overflow-hidden rounded-2xl bg-muted/10">
                <div className="relative flex items-center justify-center gap-6 py-4">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-[10px] font-medium tracking-[0.25em] text-muted-foreground uppercase">
                      Hr
                    </span>
                    <div className="relative h-32 w-16 overflow-y-auto py-1 scrollbar-hide">
                      {Array.from({ length: 6 }, (_, i) => i).map((h) => (
                        <button
                          key={h}
                          type="button"
                          onClick={() => setPickerHours(h)}
                          className={`flex h-8 w-full items-center justify-center text-xl transition-colors rounded-md ${
                            h === pickerHours
                              ? "font-semibold text-white bg-neutral-800/80"
                              : "text-muted-foreground"
                          }`}
                        >
                          {h}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-[10px] font-medium tracking-[0.25em] text-muted-foreground uppercase">
                      Min
                    </span>
                    <div className="relative h-32 w-16 overflow-y-auto py-1 scrollbar-hide">
                      {Array.from({ length: 60 }, (_, i) => i).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setPickerMinutes(m)}
                          className={`flex h-8 w-full items-center justify-center text-xl transition-colors rounded-md ${
                            m === pickerMinutes
                              ? "font-semibold text-white bg-neutral-800/80"
                              : "text-muted-foreground"
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-[10px] font-medium tracking-[0.25em] text-muted-foreground uppercase">
                      Sec
                    </span>
                    <div className="relative h-32 w-16 overflow-y-auto py-1 scrollbar-hide">
                      {Array.from({ length: 60 }, (_, i) => i).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setPickerSeconds(s)}
                          className={`flex h-8 w-full items-center justify-center text-xl transition-colors rounded-md ${
                            s === pickerSeconds
                              ? "font-semibold text-white bg-neutral-800/80"
                              : "text-muted-foreground"
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <Button
                  variant="ghost"
                  className="flex-1 text-xs font-medium text-muted-foreground hover:text-white"
                  onClick={() => setTimePickerOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 text-xs font-semibold"
                  onClick={() => {
                    const total =
                      pickerHours * 3600 + pickerMinutes * 60 + pickerSeconds;
                    onUpdate({ cardioDurationSeconds: total });
                    setTimeInput(formatSecondsToMMSS(total));
                    setTimePickerOpen(false);
                  }}
                >
                  Done
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Column 7: PR button / indicator */}
      <Cell className="flex items-center justify-center">
        {showTrophy ? (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button
                variant="pr"
                size="icon"
                className="h-8 w-full max-w-[2.25rem] p-0"
              >
                <Trophy className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="fixed left-1/2 top-1/3 z-50 max-w-sm -translate-x-1/2">
              <DialogHeader>
                <DialogTitle>Personal Record</DialogTitle>
                {exerciseName && (
                  <DialogDescription className="mt-1 font-semibold text-white">
                    {exerciseName}
                  </DialogDescription>
                )}
                <p className="mt-2 text-sm text-muted-foreground">
                  This set hit the following PR type(s):
                </p>
              </DialogHeader>
              {prLines.length > 0 ? (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                  {prLines.map((line) => (
                    <li key={line.label}>
                      <span className="font-medium">{line.label}</span>
                      {" - "}
                      <span>{line.value}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="mt-2 text-sm text-muted-foreground">
                  No personal records for this set.
                </div>
              )}
            </DialogContent>
          </Dialog>
        ) : (
          <div className="h-8 w-full max-w-[2.25rem] flex items-center justify-center text-xs text-muted-foreground">
            -
          </div>
        )}
      </Cell>

      {/* Column 8: Complete / check button (optional) */}
      {showComplete && (
        <Cell className="flex items-center justify-center">
          {readOnly ? (
            <div className="h-8 w-full max-w-[2rem] flex items-center justify-center rounded-md border border-border bg-neutral-900/60 text-xs text-muted-foreground">
              <Check className="h-4 w-4" />
            </div>
          ) : (
            <Button
              variant={set.completed ? "success" : "outline"}
              size="icon"
              className="h-8 w-full max-w-[2rem] p-0"
              onClick={() => {
                triggerHaptic();
                onComplete();
              }}
            >
              <Check className="h-4 w-4" />
            </Button>
          )}
        </Cell>
      )}
    </div>
  );
}

// Small editor component for partial reps (slider 1..5)
function PartialRepsEditor({
  initialValue,
  onSave,
  onCancel,
  onClear,
}: {
  initialValue: number;
  onSave: (v: number) => void;
  onCancel: () => void;
  onClear: () => void;
}) {
  const [value, setValue] = useState<number>(initialValue || 1);

  useEffect(() => setValue(initialValue || 1), [initialValue]);

  return (
    <div className="rounded-2xl border border-border/50 bg-neutral-900/80 p-4 shadow-[0_8px_30px_rgba(0,0,0,0.6)]">
      <DialogHeader className="text-center">
        <DialogTitle className="mx-auto">Adjust Partial Reps</DialogTitle>
      </DialogHeader>

      <div className="py-2">
        <div className="text-5xl sm:text-6xl font-heading font-extrabold text-white text-center">
          {value}
        </div>
        <div className="text-sm text-center text-muted-foreground mb-3 font-medium">
          Partial reps (1–5)
        </div>

        <div className="px-2">
          <div className="mx-auto max-w-[220px]">
            <Slider
              min={1}
              max={5}
              step={1}
              value={[value]}
              onValueChange={(vals) => setValue(vals[0] ?? value)}
              className="h-1.5"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <Button
          variant="ghost"
          className="flex-1 px-4 py-2 text-xs"
          onClick={onCancel}
        >
          Cancel
        </Button>

        <Button
          variant="ghost"
          className="flex-1 px-4 py-2 text-xs"
          onClick={onClear}
        >
          Clear
        </Button>

        <Button
          className="flex-1 px-4 py-2 text-xs font-semibold bg-orange-500 hover:bg-orange-600 text-white"
          onClick={() => onSave(value)}
        >
          Done
        </Button>
      </div>
    </div>
  );
}
