import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import { muscleGroupColors } from "@/data/mockData";

interface CreateExerciseDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;

  newExerciseName: string;
  setNewExerciseName: (value: string) => void;

  newExerciseEquipment: string | "all";
  setNewExerciseEquipment: (value: string | "all") => void;
  availableEquipments: string[];
  isEquipmentPickerOpen: boolean;
  onEquipmentPickerOpenChange: (open: boolean) => void;

  newExerciseMuscle: string;
  setNewExerciseMuscle: (value: string) => void;
  availableMuscles: string[];
  isMusclePickerOpen: boolean;
  onMusclePickerOpenChange: (open: boolean) => void;

  newExerciseDescription: string;
  setNewExerciseDescription: (value: string) => void;

  onSubmit: () => void;
  isSubmitting: boolean;

  isValidationOpen: boolean;
  onValidationOpenChange: (open: boolean) => void;
  validationMessage: string;
  newExerciseLogType?: "strength" | "timed" | "timed+reps";
  setNewExerciseLogType?: (v: "strength" | "timed" | "timed+reps") => void;
}

function getMissingFieldsMessage(
  name: string,
  equipment: string | "all",
  muscle: string,
): string | null {
  const missing: string[] = [];
  if (!name.trim()) missing.push("exercise name");
  if (!equipment || equipment === "all") missing.push("equipment type");
  if (!muscle) missing.push("muscle group");

  if (missing.length === 0) return null;
  if (missing.length === 1)
    return `Please select a ${missing[0]} before creating the exercise.`;
  const last = missing.pop();
  return `Please fill in the ${missing.join(", ")} and ${last} before creating the exercise.`;
}

const LOG_TYPES = [
  {
    value: "strength",
    label: "Reps & weight",
    description:
      "Track sets with a rep count and load — ideal for most gym exercises.",
    tags: ["Reps", "Weight"],
  },
  {
    value: "timed",
    label: "Duration only",
    description:
      "Log how long you hold or perform — great for planks, L-sits, cardio.",
    tags: ["Time"],
  },
  {
    value: "timed+reps",
    label: "Duration + reps",
    description:
      "Capture both time and rep count — useful for circuits or EMOM work.",
    tags: ["Time", "Reps"],
  },
] as const;

export function CreateExerciseDialog(props: CreateExerciseDialogProps) {
  const {
    isOpen,
    onOpenChange,
    newExerciseName,
    setNewExerciseName,
    newExerciseEquipment,
    setNewExerciseEquipment,
    availableEquipments,
    isEquipmentPickerOpen,
    onEquipmentPickerOpenChange,
    newExerciseMuscle,
    setNewExerciseMuscle,
    availableMuscles,
    isMusclePickerOpen,
    onMusclePickerOpenChange,
    newExerciseDescription,
    setNewExerciseDescription,
    onSubmit,
    isSubmitting,
    isValidationOpen,
    onValidationOpenChange,
    validationMessage,
    newExerciseLogType,
    setNewExerciseLogType,
  } = props;

  const [internalValidationOpen, setInternalValidationOpen] = useState(false);
  const [internalValidationMessage, setInternalValidationMessage] =
    useState("");

  function handleCreate() {
    const msg = getMissingFieldsMessage(
      newExerciseName,
      newExerciseEquipment,
      newExerciseMuscle,
    );
    if (msg) {
      setInternalValidationMessage(msg);
      setInternalValidationOpen(true);
      return;
    }
    onSubmit();
  }

  // Note: external validation Dialog removed in favor of inline messaging.

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0"
          style={{
            zIndex: 109,
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            background: "rgba(0,0,0,0.35)",
          }}
          onClick={() => onOpenChange(false)}
          aria-hidden
        />
      )}

      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) {
            setNewExerciseLogType?.("strength");
          }
          onOpenChange(open);
        }}
      >
        <DialogContent className="fixed left-1/2 top-1/2 z-[110] -translate-x-1/2 -translate-y-1/2 w-[94vw] max-w-[560px] sm:w-[90vw] sm:max-w-[640px] rounded-[32px] bg-neutral-950 border border-white/10 px-4 py-4 sm:px-6 sm:py-6">
          <div className="text-center">
            <DialogTitle className="text-lg sm:text-xl font-semibold">
              New exercise
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Add to your personal library
            </p>
          </div>

          <div className="mt-4 space-y-4">
            {/* Name */}
            <div>
              <Label htmlFor="create-name">Exercise Name</Label>
              <Input
                id="create-name"
                value={newExerciseName}
                onChange={(e) => {
                  setNewExerciseName(e.target.value);
                  setInternalValidationOpen(false);
                }}
                placeholder="e.g., Incline Dumbbell Press"
              />
            </div>

            {/* Equipment + Muscle side by side */}
            <div className="grid grid-cols-2 gap-4">
              {/* Equipment picker */}
              <div className="flex flex-col gap-1.5">
                <Label className="whitespace-nowrap">Equipment</Label>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEquipmentPickerOpenChange(true);
                  }}
                  className={`flex items-center gap-2 w-full truncate px-4 py-2.5 rounded-[9999px] text-sm sm:text-base border transition-all duration-300 ease-in-out active:scale-95 active:opacity-80 ${
                    newExerciseEquipment === "all"
                      ? "bg-zinc-900/80 border border-white/15 text-zinc-300 hover:bg-zinc-800/90 hover:border-white/20"
                      : "bg-zinc-800 border-white/25 text-white hover:bg-zinc-700 shadow-[0_6px_18px_rgba(0,0,0,0.6)] ring-1 ring-white/8"
                  }`}
                >
                  <span className="truncate flex-1 text-left">
                    {newExerciseEquipment === "all"
                      ? "All"
                      : newExerciseEquipment}
                  </span>
                  <ChevronDown
                    className={`h-5 w-5 flex-shrink-0 ${newExerciseEquipment === "all" ? "text-zinc-400" : "text-zinc-200"}`}
                  />
                </button>

                <Dialog
                  open={isEquipmentPickerOpen}
                  onOpenChange={onEquipmentPickerOpenChange}
                >
                  <DialogPortal>
                    <DialogContent
                      style={{ zIndex: 2147483647 }}
                      className="fixed left-1/2 top-1/2 z-[110] -translate-x-1/2 -translate-y-1/2 mx-auto flex max-h-[80vh] w-[calc(100%-64px)] max-w-[720px] flex-col overflow-hidden px-4 pt-4 pb-5 rounded-3xl bg-neutral-950 backdrop-blur-none border border-white/10 shadow-[0_32px_90px_rgba(0,0,0,0.85)]"
                    >
                      <div className="sticky top-0 z-30 bg-neutral-950 border-b border-white/10 pt-3 pb-3">
                        <div className="w-14 h-1.5 bg-zinc-800/40 rounded-full mx-auto mb-3" />
                        <div className="relative">
                          <button
                            onClick={() => onEquipmentPickerOpenChange(false)}
                            className="absolute right-0 top-0 h-7 w-7 flex items-center justify-center rounded-full bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 text-sm font-medium transition-colors"
                            aria-label="Close"
                          >
                            ✕
                          </button>
                          <h3 className="text-center text-lg font-medium text-zinc-100">
                            Equipment
                          </h3>
                        </div>
                      </div>
                      <div className="mt-4 flex min-h-0 flex-1 flex-col space-y-1.5 overflow-y-auto bg-neutral-950">
                        <button
                          className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm transition-colors ${
                            newExerciseEquipment === "all"
                              ? "bg-orange-500/10 border-l-2 border-orange-500 text-white"
                              : "text-zinc-300 hover:bg-white/5"
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setNewExerciseEquipment("all");
                            setInternalValidationOpen(false);
                            onEquipmentPickerOpenChange(false);
                          }}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-base font-medium truncate">
                              All Equipment
                            </span>
                          </div>
                          {newExerciseEquipment === "all" ? (
                            <span className="ml-3 text-zinc-200">✓</span>
                          ) : null}
                        </button>
                        {availableEquipments.map((opt) => {
                          const label = opt
                            .split(" ")
                            .map(
                              (w) =>
                                w[0]?.toUpperCase() + w.slice(1).toLowerCase(),
                            )
                            .join(" ");
                          const isSelected = newExerciseEquipment === opt;
                          return (
                            <button
                              key={opt}
                              className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm transition-colors ${
                                isSelected
                                  ? "bg-orange-500/10 border-l-2 border-orange-500 text-white"
                                  : "text-zinc-300 hover:bg-white/5"
                              }`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setNewExerciseEquipment(opt as any);
                                setInternalValidationOpen(false);
                                onEquipmentPickerOpenChange(false);
                              }}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="h-8 w-8 rounded-full bg-zinc-800/30 flex items-center justify-center flex-shrink-0">
                                  <img
                                    src={((): string => {
                                      const key = String(
                                        opt || "",
                                      ).toLowerCase();
                                      if (key.includes("barbell"))
                                        return "/icons/barbell.svg";
                                      if (key.includes("dumbbell"))
                                        return "/icons/dumbbell.svg";
                                      if (key.includes("kettlebell"))
                                        return "/icons/kettlebell.svg";
                                      if (key.includes("cable"))
                                        return "/icons/cable.svg";
                                      if (key.includes("machine"))
                                        return "/icons/machine.svg";
                                      if (key.includes("bodyweight"))
                                        return "/icons/bodyweight.svg";
                                      return "/icons/custom.svg";
                                    })()}
                                    alt={label + " icon"}
                                    className="h-4 w-4 opacity-70"
                                  />
                                </div>
                                <span className="text-base font-medium truncate">
                                  {label}
                                </span>
                              </div>
                              {isSelected ? (
                                <span className="ml-3 text-zinc-200">✓</span>
                              ) : null}
                            </button>
                          );
                        })}
                      </div>
                    </DialogContent>
                  </DialogPortal>
                </Dialog>
              </div>

              {/* Muscle picker */}
              <div className="flex flex-col gap-1.5">
                <Label className="whitespace-nowrap">Muscle group</Label>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMusclePickerOpenChange(true);
                  }}
                  className={`flex items-center gap-2 w-full truncate px-4 py-2.5 rounded-[9999px] text-sm sm:text-base border transition-all duration-300 ease-in-out active:scale-95 active:opacity-80 ${
                    !newExerciseMuscle
                      ? "bg-zinc-900/80 border border-white/15 text-zinc-300 hover:bg-zinc-800/90 hover:border-white/20"
                      : "bg-zinc-800 border-white/25 text-white hover:bg-zinc-700 shadow-[0_6px_18px_rgba(0,0,0,0.6)] ring-1 ring-white/8"
                  }`}
                >
                  <span className="truncate flex-1 text-left">
                    {newExerciseMuscle ? newExerciseMuscle : "All"}
                  </span>
                  <ChevronDown
                    className={`h-5 w-5 flex-shrink-0 ${!newExerciseMuscle ? "text-zinc-400" : "text-zinc-200"}`}
                  />
                </button>

                <Dialog
                  open={isMusclePickerOpen}
                  onOpenChange={onMusclePickerOpenChange}
                >
                  <DialogPortal>
                    <DialogContent
                      style={{ zIndex: 2147483647 }}
                      className="fixed left-1/2 top-1/2 z-[110] -translate-x-1/2 -translate-y-1/2 mx-auto flex max-h-[80vh] w-[calc(100%-64px)] max-w-[720px] flex-col overflow-hidden px-4 pt-4 pb-5 rounded-3xl bg-neutral-950 backdrop-blur-none border border-white/10 shadow-[0_32px_90px_rgba(0,0,0,0.85)]"
                    >
                      <div className="sticky top-0 z-30 bg-neutral-950 border-b border-white/10 pt-3 pb-3">
                        <div className="w-14 h-1.5 bg-zinc-800/40 rounded-full mx-auto mb-3" />
                        <div className="relative">
                          <button
                            onClick={() => onMusclePickerOpenChange(false)}
                            className="absolute right-0 top-0 h-7 w-7 flex items-center justify-center rounded-full bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 text-sm font-medium transition-colors"
                            aria-label="Close"
                          >
                            ✕
                          </button>
                          <h3 className="text-center text-lg font-medium text-zinc-100">
                            Muscles
                          </h3>
                        </div>
                      </div>
                      <div className="mt-4 flex min-h-0 flex-1 flex-col space-y-1.5 overflow-y-auto bg-neutral-950">
                        <button
                          className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm transition-colors ${
                            !newExerciseMuscle
                              ? "bg-orange-500/10 border-l-2 border-orange-500 text-white"
                              : "text-zinc-300 hover:bg-white/5"
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setNewExerciseMuscle("");
                            setInternalValidationOpen(false);
                            onMusclePickerOpenChange(false);
                          }}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-base font-medium truncate">
                              All Muscles
                            </span>
                          </div>
                          {!newExerciseMuscle ? (
                            <span className="ml-3 text-zinc-200">✓</span>
                          ) : null}
                        </button>
                        {availableMuscles
                          .filter((m) => m !== "other")
                          .map((opt) => {
                            const label = opt
                              .split(" ")
                              .map(
                                (w) =>
                                  w[0]?.toUpperCase() +
                                  w.slice(1).toLowerCase(),
                              )
                              .join(" ");
                            const isSelected = newExerciseMuscle === opt;
                            const color =
                              (muscleGroupColors as any)[opt as any] ||
                              "bg-slate-500/20 text-slate-400";
                            return (
                              <button
                                key={opt}
                                className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm transition-colors ${
                                  isSelected
                                    ? "bg-orange-500/10 border-l-2 border-orange-500 text-white"
                                    : "text-zinc-300 hover:bg-white/5"
                                }`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setNewExerciseMuscle(opt);
                                  setInternalValidationOpen(false);
                                  onMusclePickerOpenChange(false);
                                }}
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <span
                                    className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${color}`}
                                  />
                                  <span className="text-base font-medium truncate">
                                    {label}
                                  </span>
                                </div>
                                {isSelected ? (
                                  <span className="ml-3 text-zinc-200">✓</span>
                                ) : null}
                              </button>
                            );
                          })}
                      </div>
                    </DialogContent>
                  </DialogPortal>
                </Dialog>
              </div>
            </div>

            {/* Log type */}
            <div className="space-y-1.5">
              <Label>How will you log this?</Label>
              <div className="flex flex-col gap-2 mt-2">
                {LOG_TYPES.map(({ value, label, description, tags }) => {
                  const isSelected =
                    (newExerciseLogType || "strength") === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        (setNewExerciseLogType || (() => {}))(value);
                        setInternalValidationOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border text-left transition-all ${
                        isSelected
                          ? "bg-orange-500/10 border-orange-500/35"
                          : "bg-white/[0.03] border-white/8 hover:bg-white/[0.06]"
                      }`}
                    >
                      {/* Radio indicator */}
                      <div
                        className={`h-4 w-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                          isSelected ? "border-orange-500" : "border-zinc-600"
                        }`}
                      >
                        {isSelected && (
                          <div className="h-2 w-2 rounded-full bg-orange-500" />
                        )}
                      </div>

                      {/* Text */}
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-semibold leading-tight ${
                            isSelected ? "text-orange-400" : "text-white"
                          }`}
                        >
                          {label}
                        </p>
                        <p className="text-xs text-zinc-500 mt-0.5 leading-snug">
                          {description}
                        </p>
                        {/* Tags */}
                        <div className="flex gap-1.5 mt-1.5 flex-wrap">
                          {tags.map((tag) => {
                            const tagColors: Record<string, string> = {
                              Reps: "bg-orange-500/15 text-orange-400",
                              Weight: "bg-orange-500/15 text-orange-400",
                              Time: "bg-blue-500/15 text-blue-400",
                            };
                            return (
                              <span
                                key={tag}
                                className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md ${
                                  tagColors[tag] ?? "bg-white/8 text-zinc-400"
                                }`}
                              >
                                {tag}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="create-desc">
                Description{" "}
                <span className="text-zinc-600 font-normal">(optional)</span>
              </Label>
              <Textarea
                id="create-desc"
                value={newExerciseDescription}
                onChange={(e) => {
                  setNewExerciseDescription(e.target.value);
                  setInternalValidationOpen(false);
                }}
              />
            </div>
          </div>

          {/* Inline validation error */}
          {internalValidationOpen && (
            <div className="mt-3 flex items-start gap-2 rounded-xl bg-red-500/10 border border-red-500/25 px-3 py-2.5">
              <span className="text-red-400 text-xs leading-relaxed">
                {internalValidationMessage}
              </span>
              <button
                type="button"
                onClick={() => setInternalValidationOpen(false)}
                className="ml-auto text-red-400/60 hover:text-red-400 text-xs flex-shrink-0"
              >
                ✕
              </button>
            </div>
          )}

          <div className="mt-4 flex gap-3 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* external validation removed */}
    </>
  );
}
