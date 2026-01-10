import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { User, Calendar, Target, TrendingUp, Award } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  differenceInCalendarDays,
  endOfMonth,
  format,
  startOfMonth,
} from "date-fns";
import {
  clearToken,
  getSets,
  getWorkouts,
  type UiWorkout,
  type UiWorkoutSet,
} from "@/lib/api";

type HeightUnit = "cm" | "inch";

type OnboardingInfo = {
  goals: string[];
  age: string;
  height: string;
  heightUnit: HeightUnit;
  currentWeight: string;
  goalWeight: string;
  experience: string;
  monthlyWorkouts: string;
};

const DEFAULT_ONBOARDING: OnboardingInfo = {
  goals: [],
  age: "",
  height: "",
  heightUnit: "cm",
  currentWeight: "",
  goalWeight: "",
  experience: "",
  monthlyWorkouts: "",
};

const EXPERIENCE_LABELS: Record<string, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

const FITNESS_GOAL_OPTIONS: { id: string; label: string }[] = [
  { id: "build-muscle", label: "Build Muscle" },
  { id: "lose-weight", label: "Lose Weight" },
  { id: "get-stronger", label: "Get Stronger" },
  { id: "stay-healthy", label: "Stay Healthy" },
  { id: "improve-endurance", label: "Improve Endurance" },
];

const MAX_MONTHLY_GOAL = 40;

function getInitialMonthlyGoal(): number {
  try {
    const raw = localStorage.getItem("user:monthlyGoal");
    if (!raw) return 16;
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) return 16;
    return Math.min(n, MAX_MONTHLY_GOAL);
  } catch {
    return 16;
  }
}

function computeStreak(dates: Date[]): number {
  if (!dates.length) return 0;

  const uniqueDays = Array.from(
    new Set(
      dates.map((d) =>
        new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
      )
    )
  ).sort((a, b) => b - a); // newest first

  let streak = 0;
  let prev: Date | null = null;

  for (const ts of uniqueDays) {
    const current = new Date(ts);
    if (!prev) {
      streak = 1;
      prev = current;
      continue;
    }
    const diff = differenceInCalendarDays(prev, current);
    if (diff === 1) {
      streak += 1;
      prev = current;
    } else {
      break;
    }
  }

  return streak;
}

export default function Profile() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: workouts = [] } = useQuery<UiWorkout[]>({
    queryKey: ["workouts"],
    queryFn: getWorkouts,
  });

  const completedWorkouts = useMemo(
    () => workouts.filter((w) => w.endedAt),
    [workouts]
  );

  const { data: setsByWorkout = {} } = useQuery<Record<string, UiWorkoutSet[]>>(
    {
      queryKey: ["profile-sets", completedWorkouts.map((w) => w.id)],
      queryFn: async () => {
        const entries = await Promise.all(
          completedWorkouts.map(
            async (w) => [w.id, await getSets(w.id)] as const
          )
        );
        return Object.fromEntries(entries) as Record<string, UiWorkoutSet[]>;
      },
      enabled: completedWorkouts.length > 0,
    }
  );

  const totalWorkouts = completedWorkouts.length;

  const workoutsThisMonth = useMemo(() => {
    if (!completedWorkouts.length) return 0;
    const now = new Date();
    const start = startOfMonth(now);
    const end = endOfMonth(now);
    return completedWorkouts.filter((w) => w.date >= start && w.date <= end)
      .length;
  }, [completedWorkouts]);

  const totalPRs = useMemo(() => {
    return Object.values(setsByWorkout).reduce((sum, sets) => {
      return sum + sets.filter((s) => s.isPR).length;
    }, 0);
  }, [setsByWorkout]);

  const streak = useMemo(
    () => computeStreak(completedWorkouts.map((w) => w.date)),
    [completedWorkouts]
  );

  const memberSinceLabel = useMemo(() => {
    if (!completedWorkouts.length) return "Just getting started";
    const earliest = completedWorkouts.reduce(
      (min, w) => (w.date < min ? w.date : min),
      completedWorkouts[0].date
    );
    try {
      return format(earliest, "MMM yyyy");
    } catch {
      return "Just getting started";
    }
  }, [completedWorkouts]);

  const [profileInfo, setProfileInfo] = useState<{
    name: string;
    email?: string | null;
  }>(() => ({ name: "Strenghty User", email: "" }));
  const [onboardingInfo, setOnboardingInfo] = useState<OnboardingInfo | null>(
    null
  );
  const [monthlyGoal, setMonthlyGoal] = useState<number>(getInitialMonthlyGoal);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    try {
      const rawProfile = localStorage.getItem("user:profile");
      if (rawProfile) {
        const parsed = JSON.parse(rawProfile) as {
          name?: string;
          email?: string;
        };
        const name = parsed.name || "Strenghty User";
        const email = parsed.email || "";
        setProfileInfo({ name, email });
      }
    } catch {}

    try {
      const rawOnboarding = localStorage.getItem("user:onboarding");
      if (rawOnboarding) {
        const parsed = JSON.parse(rawOnboarding) as Partial<OnboardingInfo>;
        setOnboardingInfo({
          ...DEFAULT_ONBOARDING,
          ...parsed,
          heightUnit:
            parsed.heightUnit === "inch" || parsed.heightUnit === "cm"
              ? parsed.heightUnit
              : "cm",
        });
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("user:monthlyGoal", String(monthlyGoal));
    } catch {}
  }, [monthlyGoal]);

  const handleSaveProfile = () => {
    try {
      localStorage.setItem(
        "user:profile",
        JSON.stringify({
          name: profileInfo.name,
          email: profileInfo.email || "",
        })
      );
      toast({
        title: "Profile saved",
        description: "Your changes were saved.",
      });
    } catch {}
  };

  const handleSaveDetails = () => {
    if (!onboardingInfo) return;
    try {
      localStorage.setItem("user:onboarding", JSON.stringify(onboardingInfo));
      toast({
        title: "Details saved",
        description: "Your profile details were updated.",
      });
    } catch {}
  };

  const handleSignOut = () => {
    try {
      clearToken();
    } catch {}
    navigate("/auth");
  };

  // Account settings are now managed on their own screen at /profile/account

  return (
    <AppLayout>
      <div className="space-y-6 w-full px-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Profile</h1>
          <p className="text-muted-foreground">
            Manage your account and preferences
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Profile Card */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                  <User className="h-10 w-10 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">{profileInfo.name}</h2>
                  <p className="text-muted-foreground">
                    {onboardingInfo?.experience
                      ? EXPERIENCE_LABELS[onboardingInfo.experience] ||
                        "Fitness Enthusiast"
                      : "Fitness Enthusiast"}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={profileInfo.name}
                    onChange={(e) =>
                      setProfileInfo((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileInfo.email || ""}
                    onChange={(e) =>
                      setProfileInfo((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weight">Current Weight (kg)</Label>
                  <Input
                    id="weight"
                    type="number"
                    defaultValue={onboardingInfo?.currentWeight || ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="goal">Goal Weight (kg)</Label>
                  <Input
                    id="goal"
                    type="number"
                    defaultValue={onboardingInfo?.goalWeight || ""}
                  />
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <Button
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => navigate("/profile/account")}
                >
                  Account Settings
                </Button>
                <div className="w-full sm:w-auto grid grid-cols-2 gap-2">
                  <Button
                    className="w-full px-4 sm:px-6"
                    onClick={handleSaveProfile}
                  >
                    Save Changes
                  </Button>
                  <Button
                    variant="destructive"
                    className="w-full px-4 sm:px-6"
                    onClick={handleSignOut}
                  >
                    Sign Out
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Summary */}
          <div className="space-y-4">
            <Card className="border border-border">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <Calendar className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground truncate">
                      Member Since
                    </p>
                    <p className="text-lg font-semibold">{memberSinceLabel}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-success/10">
                    <TrendingUp className="h-6 w-6 text-success" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground truncate">
                      Total Workouts
                    </p>
                    <p className="text-lg font-semibold">{totalWorkouts}</p>
                    <p className="text-sm text-muted-foreground">
                      {workoutsThisMonth} this month
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10">
                    <Award className="h-6 w-6 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground truncate">
                      Personal Records
                    </p>
                    <p className="text-lg font-semibold">{totalPRs}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Goals Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Fitness Goals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-border bg-secondary/50 p-4">
                <p className="text-sm text-muted-foreground">Weekly Goal</p>
                <p className="text-2xl font-bold">4 workouts</p>
                <p className="text-sm text-success">2/4 completed this week</p>
              </div>
              <div className="rounded-lg border border-border bg-secondary/50 p-4">
                <p className="text-sm text-muted-foreground">Monthly Goal</p>
                <p className="text-2xl font-bold">{monthlyGoal} workouts</p>
                <p className="text-sm text-muted-foreground">
                  {workoutsThisMonth}/{monthlyGoal} completed
                </p>
                <div className="mt-3 flex justify-end">
                  <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm">Edit</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Monthly Goal</DialogTitle>
                        <DialogDescription>
                          Set how many workouts you want to complete each month.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="py-4">
                        <div className="text-center mb-4 text-lg font-semibold">
                          {monthlyGoal} workouts
                        </div>
                        <input
                          aria-label="Monthly goal"
                          type="range"
                          min={0}
                          max={MAX_MONTHLY_GOAL}
                          value={monthlyGoal}
                          onChange={(e) =>
                            setMonthlyGoal(
                              Math.min(
                                Number((e.target as HTMLInputElement).value),
                                MAX_MONTHLY_GOAL
                              )
                            )
                          }
                          className="w-full"
                        />
                        <div className="flex justify-between text-sm mt-2">
                          <span>0</span>
                          <span>{MAX_MONTHLY_GOAL}</span>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button onClick={() => setDialogOpen(false)}>
                          Done
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
              <div className="rounded-lg border border-border bg-secondary/50 p-4">
                <p className="text-sm text-muted-foreground">Current Streak</p>
                <p className="text-2xl font-bold">{streak} days</p>
                <p className="text-sm text-primary">Keep it up! 🔥</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Onboarding Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Your Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            {onboardingInfo ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="detail-age">Age</Label>
                  <Input
                    id="detail-age"
                    type="number"
                    value={onboardingInfo.age || ""}
                    onChange={(e) =>
                      setOnboardingInfo((prev) => {
                        const base = prev ?? DEFAULT_ONBOARDING;
                        return { ...base, age: e.target.value };
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="detail-height">Height</Label>
                  <div className="flex gap-2">
                    <Input
                      id="detail-height"
                      type="number"
                      value={onboardingInfo.height || ""}
                      onChange={(e) =>
                        setOnboardingInfo((prev) => {
                          const base = prev ?? DEFAULT_ONBOARDING;
                          return { ...base, height: e.target.value };
                        })
                      }
                    />
                    <select
                      className="rounded border border-border bg-background px-2 text-sm"
                      value={onboardingInfo.heightUnit}
                      onChange={(e) =>
                        setOnboardingInfo((prev) => {
                          const base = prev ?? DEFAULT_ONBOARDING;
                          return {
                            ...base,
                            heightUnit:
                              e.target.value === "inch" ? "inch" : "cm",
                          };
                        })
                      }
                    >
                      <option value="cm">cm</option>
                      <option value="inch">inch</option>
                    </select>
                  </div>
                </div>
                <div className="sm:col-span-2 space-y-2">
                  <Label htmlFor="detail-goals">Fitness Goals</Label>
                  <p className="text-xs text-muted-foreground">
                    Select all that apply. These match the options you chose
                    when you first signed up.
                  </p>
                  <div className="flex flex-wrap gap-2" id="detail-goals">
                    {FITNESS_GOAL_OPTIONS.map((goal) => {
                      const selected = onboardingInfo.goals.includes(goal.id);
                      return (
                        <button
                          key={goal.id}
                          type="button"
                          onClick={() =>
                            setOnboardingInfo((prev) => {
                              const base = prev ?? DEFAULT_ONBOARDING;
                              const has = base.goals.includes(goal.id);
                              return {
                                ...base,
                                goals: has
                                  ? base.goals.filter((g) => g !== goal.id)
                                  : [...base.goals, goal.id],
                              };
                            })
                          }
                          className={`rounded-full border px-3 py-1 text-xs sm:text-sm transition-colors ${
                            selected
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-background text-muted-foreground hover:border-primary/60 hover:text-foreground"
                          }`}
                        >
                          {goal.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="sm:col-span-2 flex justify-end mt-2">
                  <Button size="sm" onClick={handleSaveDetails}>
                    Save Details
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Complete onboarding to see your goals and body metrics here.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
