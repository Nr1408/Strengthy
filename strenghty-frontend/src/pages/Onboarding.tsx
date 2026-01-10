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
  CheckCircle2,
  Ruler,
  User,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const fitnessGoals = [
  {
    id: "build-muscle",
    label: "Build Muscle",
    icon: Dumbbell,
    color: "from-blue-500 to-cyan-500",
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

const workoutGoals = [
  { id: "8", label: "8 workouts", description: "2 per week" },
  { id: "12", label: "12 workouts", description: "3 per week" },
  { id: "16", label: "16 workouts", description: "4 per week" },
  { id: "20", label: "20 workouts", description: "5 per week" },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [direction, setDirection] = useState<"next" | "prev">("next");

  const [userData, setUserData] = useState({
    goals: [] as string[],
    age: "",
    height: "",
    heightUnit: "cm" as "cm" | "inch",
    currentWeight: "",
    goalWeight: "",
    experience: "",
    monthlyWorkouts: "12",
  });

  const steps = [
    {
      title: "What are your fitness goals?",
      subtitle: "Select all that apply",
    },
    {
      title: "A bit about you",
      subtitle: "Help us personalize your experience",
    },
    {
      title: "Your body metrics",
      subtitle: "Track your transformation journey",
    },
    {
      title: "Your experience level",
      subtitle: "We'll tailor workouts to match",
    },
    {
      title: "Monthly workout goal",
      subtitle: "How often do you want to train?",
    },
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setDirection("next");
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep((prev) => prev + 1);
        setIsAnimating(false);
      }, 300);
    } else {
      // Complete onboarding: persist onboarding data and go to dashboard
      try {
        localStorage.setItem("user:onboarding", JSON.stringify(userData));
        const monthly = Number(userData.monthlyWorkouts);
        if (Number.isFinite(monthly)) {
          localStorage.setItem("user:monthlyGoal", String(monthly));
        }
      } catch {}
      navigate("/dashboard");
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setDirection("prev");
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep((prev) => prev - 1);
        setIsAnimating(false);
      }, 300);
    }
  };

  const toggleGoal = (goalId: string) => {
    setUserData((prev) => ({
      ...prev,
      goals: prev.goals.includes(goalId)
        ? prev.goals.filter((g) => g !== goalId)
        : [...prev.goals, goalId],
    }));
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return userData.goals.length > 0;
      case 1:
        return userData.age !== "" && userData.height !== "";
      case 2:
        return userData.currentWeight !== "" && userData.goalWeight !== "";
      case 3:
        return userData.experience !== "";
      case 4:
        return userData.monthlyWorkouts !== "";
      default:
        return true;
    }
  };

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
                    : "w-2 bg-muted"
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
              isAnimating && direction === "prev" && "opacity-0 translate-x-8"
            )}
          >
            <h1 className="font-heading text-3xl font-bold mb-2 animate-fade-in text-white">
              {steps[currentStep].title}
            </h1>
            <p className="text-muted-foreground animate-fade-in delay-100">
              {steps[currentStep].subtitle}
            </p>
          </div>

          {/* Step Content */}
          <div
            className={cn(
              "transition-all duration-300",
              isAnimating && direction === "next" && "opacity-0 translate-x-12",
              isAnimating && direction === "prev" && "opacity-0 -translate-x-12"
            )}
          >
            {/* Step 1: Goals */}
            {currentStep === 0 && (
              <div className="grid gap-3 sm:grid-cols-2">
                {fitnessGoals.map((goal, index) => {
                  const Icon = goal.icon;
                  const isSelected = userData.goals.includes(goal.id);
                  return (
                    <button
                      key={goal.id}
                      onClick={() => toggleGoal(goal.id)}
                      className={cn(
                        "group relative flex items-center gap-4 rounded-xl border-2 p-4 text-left transition-all duration-300 hover:scale-[1.02]",
                        isSelected
                          ? "border-primary bg-primary/10"
                          : "border-border bg-card hover:border-primary/50"
                      )}
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <div
                        className={cn(
                          "flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br transition-transform duration-300 group-hover:scale-110",
                          goal.color
                        )}
                      >
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <span className="font-medium text-foreground">
                        {goal.label}
                      </span>
                      {isSelected && (
                        <CheckCircle2 className="absolute right-4 h-5 w-5 text-primary animate-scale-in" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Step 2: Age & Height */}
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
                        setUserData((prev) => ({
                          ...prev,
                          age: e.target.value,
                        }))
                      }
                      className="text-2xl font-heading h-14 pr-16"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
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
                    {/* Unit Toggle */}
                    <div className="flex rounded-lg bg-secondary p-1">
                      <button
                        type="button"
                        onClick={() =>
                          setUserData((prev) => ({
                            ...prev,
                            heightUnit: "cm",
                            height: "",
                          }))
                        }
                        className={cn(
                          "px-3 py-1 rounded-md text-sm font-medium transition-all duration-200",
                          userData.heightUnit === "cm"
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        cm
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setUserData((prev) => ({
                            ...prev,
                            heightUnit: "inch",
                            height: "",
                          }))
                        }
                        className={cn(
                          "px-3 py-1 rounded-md text-sm font-medium transition-all duration-200",
                          userData.heightUnit === "inch"
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        inch
                      </button>
                    </div>
                  </div>
                  <div className="relative">
                    <Input
                      id="height"
                      type="number"
                      placeholder={userData.heightUnit === "cm" ? "175" : "69"}
                      value={userData.height}
                      onChange={(e) =>
                        setUserData((prev) => ({
                          ...prev,
                          height: e.target.value,
                        }))
                      }
                      className="text-2xl font-heading h-14 pr-14"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                      {userData.heightUnit}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Weight Info */}
            {currentStep === 2 && (
              <div className="mx-auto max-w-md space-y-6">
                <div className="group rounded-xl border border-border bg-card p-6 transition-all duration-300 hover:border-primary/50">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500">
                      <Scale className="h-5 w-5 text-white" />
                    </div>
                    <Label
                      htmlFor="currentWeight"
                      className="text-lg font-medium text-white"
                    >
                      Current Weight
                    </Label>
                  </div>
                  <div className="relative">
                    <Input
                      id="currentWeight"
                      type="number"
                      placeholder="75"
                      value={userData.currentWeight}
                      onChange={(e) =>
                        setUserData((prev) => ({
                          ...prev,
                          currentWeight: e.target.value,
                        }))
                      }
                      className="text-2xl font-heading h-14 pr-12"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                      kg
                    </span>
                  </div>
                </div>

                <div className="group rounded-xl border border-border bg-card p-6 transition-all duration-300 hover:border-primary/50">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-green-500 to-emerald-500">
                      <Target className="h-5 w-5 text-white" />
                    </div>
                    <Label
                      htmlFor="goalWeight"
                      className="text-lg font-medium text-white"
                    >
                      Goal Weight
                    </Label>
                  </div>
                  <div className="relative">
                    <Input
                      id="goalWeight"
                      type="number"
                      placeholder="70"
                      value={userData.goalWeight}
                      onChange={(e) =>
                        setUserData((prev) => ({
                          ...prev,
                          goalWeight: e.target.value,
                        }))
                      }
                      className="text-2xl font-heading h-14 pr-12"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                      kg
                    </span>
                  </div>
                </div>

                {userData.currentWeight && userData.goalWeight && (
                  <div className="flex items-center justify-center gap-2 text-muted-foreground animate-fade-in">
                    <TrendingUp className="h-4 w-4" />
                    <span>
                      {Number(userData.currentWeight) >
                      Number(userData.goalWeight)
                        ? `${
                            Number(userData.currentWeight) -
                            Number(userData.goalWeight)
                          } kg to lose`
                        : Number(userData.currentWeight) <
                          Number(userData.goalWeight)
                        ? `${
                            Number(userData.goalWeight) -
                            Number(userData.currentWeight)
                          } kg to gain`
                        : "Maintain your current weight"}
                    </span>
                  </div>
                )}
              </div>
            )}

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
                          : "border-border bg-card hover:border-primary/50"
                      )}
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <div
                        className={cn(
                          "flex h-12 w-12 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110",
                          isSelected ? "bg-primary" : "bg-secondary"
                        )}
                      >
                        <Icon
                          className={cn(
                            "h-6 w-6",
                            isSelected
                              ? "text-primary-foreground"
                              : "text-foreground"
                          )}
                        />
                      </div>
                      <div className="flex-1">
                        <span className="text-lg font-heading font-bold text-white">
                          {level.label}
                        </span>
                        <p className="text-muted-foreground text-sm mt-0.5">
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

            {/* Step 5: Monthly Goal */}
            {currentStep === 4 && (
              <div className="mx-auto max-w-md space-y-6">
                <div className="flex items-center justify-center gap-3 mb-2">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70">
                    <Calendar className="h-6 w-6 text-primary-foreground" />
                  </div>
                </div>

                <p className="text-center text-muted-foreground">
                  Choose how many workouts you want to complete each month.
                </p>

                <div className="space-y-3">
                  <div className="text-center text-3xl font-heading font-bold text-white">
                    {Number(userData.monthlyWorkouts || "12")} workouts
                  </div>
                  <input
                    aria-label="Monthly workout goal"
                    type="range"
                    min={4}
                    max={30}
                    step={1}
                    value={Number(userData.monthlyWorkouts || "12")}
                    onChange={(e) =>
                      setUserData((prev) => ({
                        ...prev,
                        monthlyWorkouts: String(
                          Math.min(
                            Math.max(
                              Number((e.target as HTMLInputElement).value) ||
                                12,
                              4
                            ),
                            30
                          )
                        ),
                      }))
                    }
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>4</span>
                    <span>30</span>
                  </div>
                  <p className="text-center text-sm text-muted-foreground">
                    ≈{" "}
                    {Math.max(
                      1,
                      Math.round(Number(userData.monthlyWorkouts || "12") / 4)
                    )}{" "}
                    workouts per week
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Navigation Buttons */}
          <div className="mt-10 flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={currentStep === 0}
              className={cn(
                "transition-opacity duration-300 text-white",
                currentStep === 0 && "opacity-0 pointer-events-none"
              )}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>

            <Button
              onClick={handleNext}
              disabled={!canProceed()}
              size="lg"
              className="min-w-[140px] transition-all duration-300 hover:scale-105"
            >
              {currentStep === steps.length - 1 ? (
                <>
                  Get Started
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
