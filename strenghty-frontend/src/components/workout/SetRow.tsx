const GRID_TEMPLATE =
  "minmax(30px, 0.7fr) minmax(40px, 1.2fr) minmax(40px, 1fr) 10px minmax(40px, 1.2fr) minmax(42px, 1fr) 35px 32px";

import { Check, Trophy } from "lucide-react";
import { WorkoutSet } from "@/types/workout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
  onUpdate,
  onUnitChange,
  onComplete,
}: SetRowProps) {
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

  type PrLine = { label: string; value: string };
  const prLines: PrLine[] = [];

  if (set.absWeightPR && weight > 0) {
    prLines.push({
      label: "Heaviest Weight",
      value: `${weight.toFixed(1)} ${unit}`,
    });
  }

  if (set.e1rmPR && weight > 0 && reps > 0 && reps < 37) {
    const est1rm = (weight * 36) / (37 - reps);
    prLines.push({ label: "Best 1RM", value: `${est1rm.toFixed(1)} ${unit}` });
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

  return (
    <div
      className="grid gap-2 rounded-lg border border-border px-2 py-1 items-center mx-auto"
      style={{ gridTemplateColumns: GRID_TEMPLATE, maxWidth: "100%" }}
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
                  typeClasses[currentType]
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

            <DropdownMenuContent className="w-56 p-0 border-border">
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
              typeClasses[currentType]
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

      {/* Column 2: Weight input */}
      <Cell>
        <label className="sr-only">Weight</label>
        <Input
          type="number"
          placeholder={unit === "kg" ? "kg" : "lbs"}
          value={
            typeof set.weight === "number" && set.weight !== 0
              ? String(set.weight)
              : ""
          }
          onChange={(e) =>
            !readOnly && onUpdate({ weight: Number(e.target.value) })
          }
          disabled={readOnly}
          className="h-8 w-full px-1 text-center text-[11px] leading-none sm:text-[12.5px]"
        />
      </Cell>

      {/* Column 3: Unit dropdown */}
      <Cell>
        {!readOnly || unitInteractiveWhenReadOnly ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="h-8 w-full rounded-md bg-neutral-900/80 text-white/90 border border-border px-1 text-xs flex items-center justify-center"
              >
                <span className="text-xs sm:text-sm">{unit}</span>
                <span className="text-muted-foreground">▾</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-28 p-0 border-border">
              <div className="space-y-1 rounded-md bg-neutral-900 p-1">
                <DropdownMenuItem
                  className="text-white"
                  onClick={() => {
                    const newUnit = "lbs" as "lbs" | "kg";
                    const current =
                      typeof set.weight === "number" ? set.weight : 0;
                    if (newUnit !== unit && current && !isNaN(current)) {
                      const conv =
                        newUnit === "lbs"
                          ? current * 2.20462
                          : current / 2.20462;
                      const rounded = Math.round(conv * 10) / 10;
                      onUpdate({ weight: Number(rounded.toFixed(1)) });
                    }
                    onUnitChange && onUnitChange(newUnit);
                  }}
                >
                  lbs
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-white"
                  onClick={() => {
                    const newUnit = "kg" as "lbs" | "kg";
                    const current =
                      typeof set.weight === "number" ? set.weight : 0;
                    if (newUnit !== unit && current && !isNaN(current)) {
                      const conv =
                        newUnit === "lbs"
                          ? current * 2.20462
                          : current / 2.20462;
                      const rounded = Math.round(conv * 10) / 10;
                      onUpdate({ weight: Number(rounded.toFixed(1)) });
                    }
                    onUnitChange && onUnitChange(newUnit);
                  }}
                >
                  kg
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="h-8 w-full rounded-md bg-neutral-900 text-white border border-border px-2 text-xs flex items-center justify-center">
            {unit}
          </div>
        )}
      </Cell>

      {/* Column 4: spacer (keeps grid alignment) */}
      <Cell className="px-1">×</Cell>

      {/* Column 5: Reps input */}
      <Cell>
        <label className="sr-only">Reps</label>
        <Input
          type="number"
          placeholder="reps"
          value={set.reps || ""}
          onChange={(e) =>
            !readOnly && onUpdate({ reps: Number(e.target.value) })
          }
          disabled={readOnly}
          className="h-8 w-full px-1 text-center text-[11px] leading-none sm:text-[12.5px]"
        />
      </Cell>

      {/* Column 6: RPE control (centered dialog on click) */}
      <Cell>
        {!readOnly ? (
          <Dialog>
            <DialogTrigger asChild>
              <button
                type="button"
                className="flex h-8 w-full items-center justify-center rounded-md border border-border bg-neutral-900/70 px-1 text-[0.7rem] text-white/90"
              >
                {hasRpe ? sliderValue.toFixed(1) : "RPE"}
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-sm mx-auto">
              <DialogHeader>
                <DialogTitle>Log Set RPE</DialogTitle>
                <div className="text-xs text-muted-foreground mt-1">
                  Adjust how hard this set felt.
                </div>
              </DialogHeader>

              <div className="flex flex-col gap-4 py-2">
                <div className="text-4xl font-bold text-center text-white">
                  {sliderValue.toFixed(1)}
                </div>
                <div className="text-sm text-center text-muted-foreground min-h-[2.25rem]">
                  {rpeInfo}
                </div>
                <div className="px-4">
                  <Slider
                    min={7}
                    max={10}
                    step={0.5}
                    value={[sliderValue]}
                    onValueChange={(vals) =>
                      onUpdate({ rpe: vals[0] ?? sliderValue })
                    }
                  />
                </div>

                <div className="flex justify-between items-center text-sm text-muted-foreground px-6">
                  <span>7</span>
                  <span>7.5</span>
                  <span>8</span>
                  <span>8.5</span>
                  <span>9</span>
                  <span>9.5</span>
                  <span>10</span>
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

      {/* Column 7: PR button / indicator */}
      <Cell className="flex items-center justify-center">
        {set.isPR && prLines.length > 0 ? (
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="pr"
                size="icon"
                className="h-8 w-full max-w-[2rem] p-0"
              >
                <Trophy className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
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
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                {prLines.map((line) => (
                  <li key={line.label}>
                    <span className="font-medium">{line.label}</span>
                    {" - "}
                    <span>{line.value}</span>
                  </li>
                ))}
              </ul>
            </DialogContent>
          </Dialog>
        ) : (
          <div className="h-8 w-full max-w-[2rem] flex items-center justify-center text-xs text-muted-foreground">
            -
          </div>
        )}
      </Cell>

      {/* Column 8: Complete / check button */}
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
            onClick={onComplete}
          >
            <Check className="h-4 w-4" />
          </Button>
        )}
      </Cell>
    </div>
  );
}
