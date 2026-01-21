import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Target,
  Scale,
  TrendingUp,
  Calendar,
  ArrowRight,
  ArrowLeft,
  Dumbbell,
  Flame,
  Trophy,
  Heart,
  Zap,
  User,
  Ruler,
  CheckCircle2,
  Sparkles,
  Building2,
  Home,
  PersonStanding,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { API_BASE, authHeaders } from "@/lib/api";
import { recommendFirstWorkout, UserOnboardingData } from "@/lib/onboarding";

const fitnessGoals = [
  {
    id: "build-muscle",
    label: "Build Muscle",
    icon: Dumbbell,
    color: "from-blue-500 to-cyan-500 text-white",
  },
  {
    id: "lose-weight",
    label: "Lose Weight",
    icon: Flame,
    color: "from-orange-500 to-red-500",
  },
  {
    id: "get-stronger",
    label: "Get Stronger",
    icon: Trophy,
    color: "from-yellow-500 to-amber-500",
  },
  {
    id: "stay-healthy",
    label: "Stay Healthy",
    icon: Heart,
    color: "from-pink-500 to-rose-500",
  },
  {
    id: "improve-endurance",
    label: "Improve Endurance",
    icon: Zap,
    color: "from-purple-500 to-violet-500",
  },
];

const experienceLevels = [
  {
    id: "beginner",
    label: "Beginner",
    description: "New to fitness or returning after a break",
    icon: Sparkles,
  },
  {
    id: "intermediate",
    label: "Intermediate",
    description: "1-3 years of consistent training",
    icon: TrendingUp,
  },
  {
    id: "advanced",
    label: "Advanced",
    description: "3+ years of serious training",
    icon: Trophy,
  },
];

const onboardingGoals = [
  {
    id: "hypertrophy",
    label: "Build Muscle",
    icon: Dumbbell,
    color: "from-blue-500 to-cyan-500",
  },
  {
    id: "calorie-burn",
    label: "Burn Fat",
    icon: Flame,
    color: "from-orange-500 to-red-500",
  },
  {
    id: "powerlifting",
    label: "Get Stronger",
    icon: Trophy,
    color: "from-yellow-500 to-amber-500",
  },
];

const equipmentOptions = [
  {
    id: "full-gym",
    label: "Full Gym",
    description: "I have access to everything",
    icon: Building2,
    color: "from-violet-500 to-purple-500",
  },
  {
    id: "home-gym",
    label: "Home Gym",
    description: "Dumbbells + bench",
    icon: Home,
    color: "from-teal-500 to-cyan-500",
  },
  {
    id: "bodyweight",
    label: "Bodyweight",
    description: "No equipment",
    icon: PersonStanding,
    color: "from-pink-500 to-rose-500",
  },
];

const workoutGoals = [
  { id: "8", label: "8 workouts", description: "2 per week" },
  { id: "12", label: "12 workouts", description: "3 per week" },
  { id: "16", label: "16 workouts", description: "4 per week" },
  { id: "20", label: "20 workouts", description: "5 per week" },
];

export default function Onboarding() {
  // New, step-based onboarding that stores a single `userData` object and
  // deterministically recommends an existing routine. Key behavioral changes:
  // - Step flow: Goal -> Personal metrics -> Equipment -> Experience -> Monthly -> Summary
  // - Validation per-step enforced before advancing
  // - On final screen we call `recommendFirstWorkout` and show an outcome label
  // - "Start My First Workout" navigates to NewWorkout with flags so the app
  //   creates the workout and opens the workout view immediately.

  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [direction, setDirection] = useState<"next" | "prev">("next");

  const [userData, setUserData] = useState({
    goal: "" as "hypertrophy" | "calorie-burn" | "powerlifting" | "",
    age: "" as string,
    height: "" as string,
    heightUnit: "cm" as "cm" | "ft",
    weight: "" as string,
    weightUnit: "kg" as "kg" | "lbs",
    equipment: "" as "full-gym" | "home-gym" | "bodyweight" | "",
    experience: "intermediate" as "beginner" | "intermediate" | "advanced" | "",
    monthlyWorkouts: 12,
  });

  // Helpers for unit conversion and simple formatting
  const convertHeight = (
    valueStr: string | undefined,
    from: "cm" | "ft",
    to: "cm" | "ft",
  ) => {
    if (!valueStr) return "";
    const val = Number(valueStr);
    if (Number.isNaN(val)) return "";
    if (from === to) return String(valueStr);
    if (from === "cm" && to === "ft") {
      // cm -> feet (decimal)
      const feet = val / 30.48;
      return String(Number(feet.toFixed(1)));
    }
    if (from === "ft" && to === "cm") {
      const cm = val * 30.48;
      return String(Math.round(cm));
    }
    return String(valueStr);
  };

  const convertWeight = (
    valueStr: string | undefined,
    from: "kg" | "lbs",
    to: "kg" | "lbs",
  ) => {
    if (!valueStr) return "";
    const val = Number(valueStr);
    if (Number.isNaN(val)) return "";
    if (from === to) return String(valueStr);
    if (from === "kg" && to === "lbs") {
      const lbs = val * 2.20462;
      return String(Math.round(lbs));
    }
    if (from === "lbs" && to === "kg") {
      const kg = val / 2.20462;
      return String(Math.round(kg));
    }
    return String(valueStr);
  };

  const capitalizeFirst = (s: string | undefined) => {
    if (!s) return "";
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

  const steps = [
    { title: "Goal" },
    { title: "Personal" },
    { title: "Equipment" },
    { title: "Experience" },
    { title: "Monthly" },
    { title: "Summary" },
  ];

  const totalSteps = 6; // goal, personal, equipment, experience, monthly, summary

  const stepNext = () => {
    setDirection("next");
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentStep((s) => Math.min(totalSteps - 1, s + 1));
      setIsAnimating(false);
    }, 260);
  };

  const stepPrev = () => {
    setDirection("prev");
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentStep((s) => Math.max(0, s - 1));
      setIsAnimating(false);
    }, 200);
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return userData.goal !== "";
      case 1:
        return (
          userData.age.trim() !== "" &&
          userData.height.trim() !== "" &&
          userData.weight.trim() !== ""
        );
      case 2:
        return userData.equipment !== "";
      case 3:
        return userData.experience !== "";
      case 4:
        return (
          typeof userData.monthlyWorkouts === "number" &&
          userData.monthlyWorkouts >= 4
        );
      default:
        return true;
    }
  };

  // Persist onboarding locally and attempt server-side save on completion.
  const completeOnboarding = async () => {
    try {
      localStorage.setItem("user:onboarding", JSON.stringify(userData));
      localStorage.setItem(
        "user:monthlyGoal",
        String(userData.monthlyWorkouts),
      );
    } catch (e) {}

    // best-effort server save similar to previous implementation
    try {
      const payload = {
        goal: userData.goal,
        age: userData.age ? Number(userData.age) : null,
        height: userData.height ? Number(userData.height) : null,
        height_unit: userData.heightUnit,
        weight: userData.weight ? Number(userData.weight) : null,
        weight_unit: userData.weightUnit,
        equipment: userData.equipment,
        experience: userData.experience,
        monthly_workouts: userData.monthlyWorkouts,
      } as any;
      await fetch(`${API_BASE}/profile/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(payload),
      });
    } catch (e) {
      // ignore
    }
  };

  const onStartRecommended = async () => {
    // persist onboarding before starting
    await completeOnboarding();

    // normalize data shape for recommendation
    const payload: UserOnboardingData = {
      goal: (userData.goal as any) || "other",
      age: userData.age ? Number(userData.age) : null,
      height: userData.height ? Number(userData.height) : null,
      heightUnit: userData.heightUnit,
      weight: userData.weight ? Number(userData.weight) : null,
      weightUnit: userData.weightUnit,
      equipment: (userData.equipment as any) || "other",
      experience: (userData.experience as any) || "intermediate",
      monthlyWorkouts: Number(userData.monthlyWorkouts) || 12,
    };

    const rec = recommendFirstWorkout(payload);

    // Show the lightweight Pre-Workout Preview for first-time users.
    // Persist a flag so this preview is only shown once.
    try {
      try {
        localStorage.setItem("user:firstWorkoutPreviewShown", "1");
      } catch (e) {}
      navigate("/workouts/preview", {
        state: { routine: rec.routine, label: rec.label, firstTime: true },
      });
    } catch (e) {
      // fallback: go to dashboard
      navigate("/dashboard");
    }
  };

  // Load recommendation on-demand in final screen
  // (imported lazily below to keep logic grouped)
  // UI rendering follows the existing dark styling of the app.

  return (
    <div className="flex min-h-screen flex-col bg-background overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-primary/5 blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-secondary/10 blur-3xl animate-pulse delay-1000" />
      </div>

      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg">
              <img
                src="/icons/logo.png"
                alt="Strengthy logo"
                className="h-9 w-9 rounded-lg"
              />
            </div>
            <span className="font-heading text-xl font-bold text-white">
              Strenghty
            </span>
          </div>

          {/* Progress Indicator */}
          <div className="flex items-center gap-2">
            {steps.map((_, index) => (
              <div
                key={index}
                className={cn(
                  "h-2 rounded-full transition-all duration-500",
                  index === currentStep
                    ? "w-8 bg-primary"
                    : index < currentStep
                      ? "w-2 bg-primary/60"
                      : "w-2 bg-muted",
                )}
              />
            ))}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 flex-col items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          {/* Step Title */}
          <div
            className={cn(
              "mb-8 text-center transition-all duration-300",
              isAnimating && direction === "next" && "opacity-0 -translate-x-8",
              isAnimating && direction === "prev" && "opacity-0 translate-x-8",
            )}
          >
            <h1 className="font-heading text-3xl font-bold mb-2 animate-fade-in text-white">
              {steps[currentStep].title}
            </h1>
            <p className="text-white animate-fade-in delay-100">
              {steps[currentStep].subtitle}
            </p>
          </div>

          {/* Step Content */}
          <div
            className={cn(
              "transition-all duration-300",
              isAnimating && direction === "next" && "opacity-0 translate-x-12",
              isAnimating &&
                direction === "prev" &&
                "opacity-0 -translate-x-12",
            )}
          >
            {/* Step 0: Primary Goal (single choice) */}
            {currentStep === 0 && (
              <div className="grid gap-3 sm:grid-cols-2">
                {onboardingGoals.map((g, i) => {
                  const Icon = g.icon;
                  const selected = userData.goal === g.id;
                  return (
                    <button
                      key={g.id}
                      onClick={() => setUserData((p) => ({ ...p, goal: g.id }))}
                      className={cn(
                        "group relative flex items-center gap-4 rounded-xl border-2 p-5 text-left transition-all duration-300 hover:scale-[1.01]",
                        selected
                          ? "border-primary bg-primary/10"
                          : "border-border bg-card hover:border-primary/50",
                      )}
                      style={{ animationDelay: `${i * 80}ms` }}
                    >
                      <div
                        className={cn(
                          "flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br transition-transform duration-300 group-hover:scale-110",
                          g.color,
                        )}
                      >
                        <Icon className="h-7 w-7 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="text-lg font-heading font-bold text-white">
                          {g.label}
                        </div>
                      </div>
                      {selected && (
                        <CheckCircle2 className="h-6 w-6 text-primary animate-scale-in" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Step 1: Personal metrics (age / height / weight) */}
            {currentStep === 1 && (
              <div className="mx-auto max-w-md space-y-6">
                <div className="group rounded-xl border border-border bg-card p-6 transition-all duration-300 hover:border-primary/50">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-500">
                      <User className="h-5 w-5 text-white" />
                    </div>
                    <Label
                      htmlFor="age"
                      className="text-lg font-medium text-white"
                    >
                      Your Age
                    </Label>
                  </div>
                  <div className="relative">
                    <Input
                      id="age"
                      type="number"
                      placeholder="25"
                      value={userData.age}
                      onChange={(e) =>
                        setUserData((p) => ({ ...p, age: e.target.value }))
                      }
                      className="text-2xl font-heading h-14 pr-16"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white font-medium">
                      years
                    </span>
                  </div>
                </div>

                <div className="group rounded-xl border border-border bg-card p-6 transition-all duration-300 hover:border-primary/50">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-cyan-500">
                        <Ruler className="h-5 w-5 text-white" />
                      </div>
                      <Label
                        htmlFor="height"
                        className="text-lg font-medium text-white"
                      >
                        Your Height
                      </Label>
                    </div>
                    <div className="flex rounded-lg bg-secondary p-1">
                      <button
                        type="button"
                        onClick={() =>
                          setUserData((p) => {
                            if (p.height) {
                              const converted = convertHeight(
                                p.height,
                                p.heightUnit,
                                "cm",
                              );
                              return {
                                ...p,
                                heightUnit: "cm",
                                height: converted,
                              };
                            }
                            return { ...p, heightUnit: "cm" };
                          })
                        }
                        className={cn(
                          "px-3 py-1 rounded-md text-sm font-medium transition-all duration-200",
                          userData.heightUnit === "cm"
                            ? "bg-primary text-primary-foreground"
                            : "text-white hover:text-foreground",
                        )}
                      >
                        cm
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setUserData((p) => {
                            if (p.height) {
                              const converted = convertHeight(
                                p.height,
                                p.heightUnit,
                                "ft",
                              );
                              return {
                                ...p,
                                heightUnit: "ft",
                                height: converted,
                              };
                            }
                            return { ...p, heightUnit: "ft" };
                          })
                        }
                        className={cn(
                          "px-3 py-1 rounded-md text-sm font-medium transition-all duration-200",
                          userData.heightUnit === "ft"
                            ? "bg-primary text-primary-foreground"
                            : "text-white hover:text-foreground",
                        )}
                      >
                        ft
                      </button>
                    </div>
                  </div>
                  <div className="relative">
                    <Input
                      id="height"
                      type="number"
                      placeholder={userData.heightUnit === "cm" ? "175" : "5.9"}
                      value={userData.height}
                      onChange={(e) =>
                        setUserData((p) => ({ ...p, height: e.target.value }))
                      }
                      className="text-2xl font-heading h-14 pr-14"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white font-medium">
                      {userData.heightUnit}
                    </span>
                  </div>
                </div>

                <div className="group rounded-xl border border-border bg-card p-6 transition-all duration-300 hover:border-primary/50">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500">
                      <Scale className="h-5 w-5 text-white" />
                    </div>
                    <Label
                      htmlFor="weight"
                      className="text-lg font-medium text-white"
                    >
                      Current Weight
                    </Label>
                  </div>
                  <div className="relative">
                    <Input
                      id="weight"
                      type="number"
                      placeholder="75"
                      value={userData.weight}
                      onChange={(e) =>
                        setUserData((p) => ({ ...p, weight: e.target.value }))
                      }
                      className="text-2xl font-heading h-14 pr-14"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setUserData((p) => {
                            if (p.weight) {
                              const converted = convertWeight(
                                p.weight,
                                p.weightUnit,
                                "kg",
                              );
                              return {
                                ...p,
                                weightUnit: "kg",
                                weight: converted,
                              };
                            }
                            return { ...p, weightUnit: "kg" };
                          })
                        }
                        className={cn(
                          "px-2 py-0.5 rounded-md text-sm",
                          userData.weightUnit === "kg"
                            ? "bg-primary text-primary-foreground"
                            : "text-white",
                        )}
                      >
                        kg
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setUserData((p) => {
                            if (p.weight) {
                              const converted = convertWeight(
                                p.weight,
                                p.weightUnit,
                                "lbs",
                              );
                              return {
                                ...p,
                                weightUnit: "lbs",
                                weight: converted,
                              };
                            }
                            return { ...p, weightUnit: "lbs" };
                          })
                        }
                        className={cn(
                          "px-2 py-0.5 rounded-md text-sm",
                          userData.weightUnit === "lbs"
                            ? "bg-primary text-primary-foreground"
                            : "text-white",
                        )}
                      >
                        lbs
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Equipment step is at index 2 (rendered above). */}

            {/* Step 4: Experience Level */}
            {currentStep === 3 && (
              <div className="mx-auto max-w-md space-y-4">
                {experienceLevels.map((level, index) => {
                  const Icon = level.icon;
                  const isSelected = userData.experience === level.id;
                  return (
                    <button
                      key={level.id}
                      onClick={() =>
                        setUserData((prev) => ({
                          ...prev,
                          experience: level.id,
                        }))
                      }
                      className={cn(
                        "group relative flex w-full items-center gap-4 rounded-xl border-2 p-5 text-left transition-all duration-300 hover:scale-[1.01]",
                        isSelected
                          ? "border-primary bg-primary/10"
                          : "border-border bg-card hover:border-primary/50",
                      )}
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <div
                        className={cn(
                          "flex h-12 w-12 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110",
                          isSelected ? "bg-primary" : "bg-secondary",
                        )}
                      >
                        <Icon
                          className={cn(
                            "h-6 w-6",
                            isSelected
                              ? "text-primary-foreground"
                              : "text-foreground",
                          )}
                        />
                      </div>
                      <div className="flex-1">
                        <span className="text-lg font-heading font-bold text-white">
                          {level.label}
                        </span>
                        <p className="text-white text-sm mt-0.5">
                          {level.description}
                        </p>
                      </div>
                      {isSelected && (
                        <CheckCircle2 className="h-6 w-6 text-primary animate-scale-in" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Step 2: Equipment */}
            {currentStep === 2 && (
              <div className="grid gap-4 max-w-md mx-auto">
                {equipmentOptions.map((option, idx) => {
                  const Icon = option.icon;
                  const isSelected = userData.equipment === option.id;
                  return (
                    <button
                      key={option.id}
                      onClick={() =>
                        setUserData((p) => ({ ...p, equipment: option.id }))
                      }
                      className={cn(
                        "group relative flex items-center gap-4 rounded-xl border-2 p-5 text-left transition-all duration-300 hover:scale-[1.01]",
                        isSelected
                          ? "border-primary bg-primary/10"
                          : "border-border bg-card hover:border-primary/50",
                      )}
                      style={{ animationDelay: `${idx * 80}ms` }}
                    >
                      <div
                        className={cn(
                          "flex h-14 w-14 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110",
                          option.color,
                        )}
                      >
                        <Icon className="h-7 w-7 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="text-lg font-heading font-bold text-white">
                          {option.label}
                        </div>
                        <p className="text-white text-sm mt-0.5">
                          {option.description}
                        </p>
                      </div>
                      {isSelected && (
                        <CheckCircle2 className="h-6 w-6 text-primary animate-scale-in" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Step 5: Monthly Goal */}
            {currentStep === 4 && (
              <div className="mx-auto max-w-md space-y-6">
                <div className="flex items-center justify-center gap-3 mb-2">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70">
                    <Calendar className="h-6 w-6 text-primary-foreground" />
                  </div>
                </div>

                <p className="text-center text-white">
                  Choose how many workouts you want to complete each month.
                </p>

                <div className="space-y-3">
                  <div className="text-center text-3xl font-heading font-bold text-white">
                    {userData.monthlyWorkouts} workouts
                  </div>
                  <input
                    aria-label="Monthly workout goal"
                    type="range"
                    min={4}
                    max={30}
                    step={1}
                    value={userData.monthlyWorkouts}
                    onChange={(e) =>
                      setUserData((prev) => ({
                        ...prev,
                        monthlyWorkouts: Math.min(
                          Math.max(
                            Number((e.target as HTMLInputElement).value) || 12,
                            4,
                          ),
                          30,
                        ),
                      }))
                    }
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-white">
                    <span>4</span>
                    <span>30</span>
                  </div>
                  <p className="text-center text-sm text-white">
                    ≈ {Math.max(1, Math.round(userData.monthlyWorkouts / 4))}{" "}
                    workouts per week
                  </p>
                </div>
              </div>
            )}

            {/* Summary: Blueprint Ready */}
            {currentStep === 5 && (
              <div className="w-full max-w-md mx-auto space-y-6">
                <div className="text-center mb-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mx-auto mb-4">
                    <CheckCircle2 className="h-8 w-8 text-primary" />
                  </div>
                  <h2 className="font-heading text-3xl font-bold mb-2 text-white">
                    Blueprint Ready!
                  </h2>
                  <p className="text-white">
                    Chosen based on your goal, experience, and equipment.
                  </p>
                </div>

                <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-white">Goal</span>
                    <span className="font-medium text-white">
                      {capitalizeFirst(userData.goal) || "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white">Experience</span>
                    <span className="font-medium text-white">
                      {capitalizeFirst(userData.experience) || "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white">Equipment</span>
                    <span className="font-medium text-white">
                      {capitalizeFirst(userData.equipment) || "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white">Monthly Workouts</span>
                    <span className="font-medium text-white">
                      {userData.monthlyWorkouts} sessions
                    </span>
                  </div>
                </div>

                <div className="rounded-xl bg-primary/10 border border-primary/20 p-4">
                  {/* compute recommendation label on render so we show the outcome-oriented label */}
                  {(() => {
                    const norm: UserOnboardingData = {
                      goal: (userData.goal as any) || "other",
                      age: userData.age ? Number(userData.age) : null,
                      height: userData.height ? Number(userData.height) : null,
                      heightUnit: userData.heightUnit,
                      weight: userData.weight ? Number(userData.weight) : null,
                      weightUnit: userData.weightUnit,
                      equipment: (userData.equipment as any) || "other",
                      experience:
                        (userData.experience as any) || "intermediate",
                      monthlyWorkouts: Number(userData.monthlyWorkouts) || 12,
                    };
                    const rec = recommendFirstWorkout(norm);
                    return (
                      <p className="text-center text-sm">
                        <span className="text-white">Your first workout: </span>
                        <span className="font-semibold text-primary">
                          {rec.label}
                        </span>
                      </p>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>

          {/* Navigation Buttons */}
          <div className="mt-10 flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={stepPrev}
              disabled={currentStep === 0}
              className={cn(
                "transition-opacity duration-300 text-white",
                currentStep === 0 && "opacity-0 pointer-events-none",
              )}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>

            <Button
              onClick={() => {
                if (currentStep === totalSteps - 1) {
                  onStartRecommended();
                } else {
                  if (!canProceed()) return;
                  stepNext();
                }
              }}
              disabled={!canProceed()}
              size="lg"
              className="min-w-[140px] transition-all duration-300 hover:scale-105"
            >
              {currentStep === totalSteps - 1 ? (
                <>
                  Start My First Workout
                  <Dumbbell className="ml-2 h-4 w-4" />
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
