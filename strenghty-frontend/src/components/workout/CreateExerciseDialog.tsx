import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";
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
}

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
  } = props;

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

      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="fixed left-1/2 top-1/2 z-[110] -translate-x-1/2 -translate-y-1/2 w-[94vw] max-w-[400px] sm:w-[90vw] sm:max-w-[420px] rounded-[32px] bg-neutral-950 border border-white/10 px-4 py-4 sm:px-6 sm:py-6">
          <div className="text-center">
            <DialogTitle className="text-lg font-semibold">
              Create Exercise
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Add a new exercise to your library
            </p>
          </div>

          <div className="mt-4 space-y-4">
            <div>
              <Label htmlFor="create-name">Exercise Name</Label>
              <Input
                id="create-name"
                value={newExerciseName}
                onChange={(e) => setNewExerciseName(e.target.value)}
                placeholder="e.g., Incline Dumbbell Press"
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <Label className="whitespace-nowrap">Equipment:</Label>
              <div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEquipmentPickerOpenChange(true);
                  }}
                  className={`flex items-center gap-2 min-w-0 max-w-full truncate px-2 sm:px-3 py-1.5 rounded-full text-sm border transition-all duration-300 ease-in-out active:scale-95 active:opacity-80 ${
                    newExerciseEquipment === "all"
                      ? "bg-zinc-900/80 border border-white/15 text-zinc-300 hover:bg-zinc-800/90 hover:border-white/20"
                      : "bg-zinc-800 border-white/25 text-white hover:bg-zinc-700 shadow-[0_6px_18px_rgba(0,0,0,0.6)] ring-1 ring-white/8"
                  }`}
                >
                  <span className="truncate">
                    {newExerciseEquipment === "all"
                      ? "All Equipment"
                      : newExerciseEquipment}
                  </span>
                  <ChevronDown
                    className={`h-3.5 w-3.5 ${newExerciseEquipment === "all" ? "text-zinc-400" : "text-zinc-200"}`}
                  />
                </button>

                <Dialog
                  open={isEquipmentPickerOpen}
                  onOpenChange={onEquipmentPickerOpenChange}
                >
                  <DialogPortal>
                    <DialogContent
                      style={{
                        zIndex: 2147483647,
                      }}
                      className="fixed left-1/2 top-1/2 z-[110] -translate-x-1/2 -translate-y-1/2 mx-auto flex max-h-[65vh] w-[calc(100%-32px)] max-w-[480px] flex-col overflow-hidden px-4 pt-4 pb-5 rounded-3xl bg-neutral-950 backdrop-blur-none border border-white/10 shadow-[0_32px_90px_rgba(0,0,0,0.85)]"
                    >
                      <div className="sticky top-0 z-30 bg-neutral-950 border-b border-white/10 pt-3 pb-3">
                        <div className="w-14 h-1.5 bg-zinc-800/40 rounded-full mx-auto mb-3" />
                        <div className="relative">
                          <button
                            onClick={() => onEquipmentPickerOpenChange(false)}
                            className="absolute right-3 top-0 text-zinc-400 hover:text-zinc-200"
                            aria-label="Close"
                          >
                            ×
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
                              ? "bg-white/5 text-white"
                              : "text-zinc-300 hover:bg-white/3"
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setNewExerciseEquipment("all");
                            onEquipmentPickerOpenChange(false);
                          }}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-8 w-8 rounded-full bg-zinc-800/30 flex items-center justify-center flex-shrink-0">
                              <img
                                src="/icons/custom.svg"
                                alt="All Equipment icon"
                                className="h-4 w-4 opacity-70"
                              />
                            </div>
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
                                  ? "bg-white/5 text-white"
                                  : "text-zinc-300 hover:bg-white/3"
                              }`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setNewExerciseEquipment(opt as any);
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
            </div>

            <div className="flex items-center justify-between gap-4 mt-4">
              <Label className="whitespace-nowrap">Muscle group:</Label>
              <div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMusclePickerOpenChange(true);
                  }}
                  className={`flex items-center gap-2 min-w-0 max-w-full truncate px-2 sm:px-3 py-1.5 rounded-full text-sm border transition-all duration-300 ease-in-out active:scale-95 active:opacity-80 ${
                    !newExerciseMuscle
                      ? "bg-zinc-900/80 border border-white/15 text-zinc-300 hover:bg-zinc-800/90 hover:border-white/20"
                      : "bg-zinc-800 border-white/25 text-white hover:bg-zinc-700 shadow-[0_6px_18px_rgba(0,0,0,0.6)] ring-1 ring-white/8"
                  }`}
                >
                  <span className="truncate">
                    {newExerciseMuscle ? newExerciseMuscle : "All Muscles"}
                  </span>
                  <ChevronDown
                    className={`h-3.5 w-3.5 ${!newExerciseMuscle ? "text-zinc-400" : "text-zinc-200"}`}
                  />
                </button>

                <Dialog
                  open={isMusclePickerOpen}
                  onOpenChange={onMusclePickerOpenChange}
                >
                  <DialogPortal>
                    <DialogContent
                      style={{
                        zIndex: 2147483647,
                      }}
                      className="fixed left-1/2 top-1/2 z-[110] -translate-x-1/2 -translate-y-1/2 mx-auto flex max-h-[65vh] w-[calc(100%-32px)] max-w-[480px] flex-col overflow-hidden px-4 pt-4 pb-5 rounded-3xl bg-neutral-950 backdrop-blur-none border border-white/10 shadow-[0_32px_90px_rgba(0,0,0,0.85)]"
                    >
                      <div className="sticky top-0 z-30 bg-neutral-950 border-b border-white/10 pt-3 pb-3">
                        <div className="w-14 h-1.5 bg-zinc-800/40 rounded-full mx-auto mb-3" />
                        <div className="relative">
                          <button
                            onClick={() => onMusclePickerOpenChange(false)}
                            className="absolute right-3 top-0 text-zinc-400 hover:text-zinc-200"
                            aria-label="Close"
                          >
                            ×
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
                              ? "bg-white/5 text-white"
                              : "text-zinc-300 hover:bg-white/3"
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setNewExerciseMuscle("");
                            onMusclePickerOpenChange(false);
                          }}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-8 w-8 rounded-full bg-zinc-800/30 flex items-center justify-center flex-shrink-0">
                              <img
                                src="/icons/custom.svg"
                                alt="All Muscles icon"
                                className="h-4 w-4 opacity-70"
                              />
                            </div>
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
                                    ? "bg-white/5 text-white"
                                    : "text-zinc-300 hover:bg-white/3"
                                }`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setNewExerciseMuscle(opt);
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

            <div>
              <Label htmlFor="create-desc">Description (optional)</Label>
              <Textarea
                id="create-desc"
                value={newExerciseDescription}
                onChange={(e) => setNewExerciseDescription(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-4 flex gap-3 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={onSubmit} disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Validation dialog shown when required create fields missing */}
      <Dialog open={isValidationOpen} onOpenChange={onValidationOpenChange}>
        <DialogContent className="max-w-[360px] rounded-[16px] bg-zinc-900 border border-white/10 text-white p-4">
          <DialogTitle className="text-base font-semibold">
            Missing information
          </DialogTitle>
          <DialogDescription className="mt-2 text-sm text-muted-foreground">
            {validationMessage}
          </DialogDescription>
          <div className="mt-4 flex justify-end">
            <Button
              variant="outline"
              onClick={() => onValidationOpenChange(false)}
            >
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
