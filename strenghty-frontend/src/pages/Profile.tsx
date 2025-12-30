import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { User, Calendar, Target, TrendingUp, Award } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getWorkouts, getSets } from "@/lib/api";
import {
  startOfMonth,
  endOfMonth,
  differenceInCalendarDays,
  format,
} from "date-fns";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

import type { UiWorkout, UiWorkoutSet } from "@/lib/api";

const GOAL_LABELS: Record<string, string> = {
  "build-muscle": "Build Muscle",
  "lose-weight": "Lose Weight",
  "get-stronger": "Get Stronger",
  "stay-healthy": "Stay Healthy",
  "improve-endurance": "Improve Endurance",
};

const EXPERIENCE_LABELS: Record<string, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

export default function Profile() {
  const navigate = useNavigate();

  const handleSignOut = () => {
    try {
      // Clear auth tokens / session info (adjust keys to your app)
      localStorage.removeItem("authToken");
      localStorage.removeItem("user");
    } catch {}
    navigate("/auth");
  };

  const { data: workouts = [] } = useQuery({
    queryKey: ["workouts"],
    queryFn: getWorkouts,
  });

  const completedWorkouts = workouts.filter((w: UiWorkout) => w.endedAt);

  const totalWorkouts = completedWorkouts.length;

  const thisMonthRange = {
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date()),
  };
  const workoutsThisMonth = completedWorkouts.filter(
    (w: UiWorkout) =>
      w.date >= thisMonthRange.start && w.date <= thisMonthRange.end
  ).length;

  // fetch sets for completed workouts to compute PRs
  const { data: setsByWorkout = {} } = useQuery({
    queryKey: [
      "setsByWorkoutProfile",
      completedWorkouts.map((w: UiWorkout) => w.id),
    ],
    queryFn: async () => {
      const entries = await Promise.all(
        completedWorkouts.map(
          async (w: UiWorkout) => [w.id, await getSets(w.id)] as const
        )
      );
      return Object.fromEntries(entries) as Record<string, UiWorkoutSet[]>;
    },
    enabled: completedWorkouts.length > 0,
  });

  const totalPRs = Object.values(setsByWorkout)
    .flat()
    .filter((s) => s.isPR).length;

  // compute streak: consecutive days up to today
  const sortedDates = [
    ...new Set(completedWorkouts.map((w) => format(w.date, "yyyy-MM-dd"))),
  ].sort((a, b) => (a < b ? 1 : -1));
  let streak = 0;
  try {
    const today = new Date();
    let cursor = today;
    while (true) {
      const key = format(cursor, "yyyy-MM-dd");
      if (sortedDates.includes(key)) {
        streak += 1;
        cursor.setDate(cursor.getDate() - 1);
      } else {
        break;
      }
    }
  } catch {
    streak = 0;
  }

  const MAX_MONTHLY_GOAL = 30;

  const [monthlyGoal, setMonthlyGoal] = useState<number>(() => {
    try {
      const raw = localStorage.getItem("user:monthlyGoal");
      const val = raw ? Number(raw) : 16;
      return Number.isFinite(val) ? Math.min(val, MAX_MONTHLY_GOAL) : 16;
    } catch {
      return 16;
    }
  });

  const [dialogOpen, setDialogOpen] = useState(false);

  const [profileInfo, setProfileInfo] = useState<{
    name: string;
    email: string;
  }>({
    name: "Strenghty User",
    email: "",
  });

  const [onboardingInfo, setOnboardingInfo] = useState<{
    goals: string[];
    age: string;
    height: string;
    heightUnit: "cm" | "inch";
    currentWeight: string;
    goalWeight: string;
    experience: string;
    monthlyWorkouts: string;
  } | null>(null);

  const handleSaveProfile = () => {
    try {
      localStorage.setItem(
        "user:profile",
        JSON.stringify({
          name: profileInfo.name,
          email: profileInfo.email,
        })
      );
    } catch {}
  };

  useEffect(() => {
    try {
      const rawProfile = localStorage.getItem("user:profile");
      if (rawProfile) {
        const parsed = JSON.parse(rawProfile) as {
          name?: string;
          email?: string;
        };
        setProfileInfo({
          name: parsed.name || "Strenghty User",
          email: parsed.email || "",
        });
      }
    } catch {}

    try {
      const rawOnboarding = localStorage.getItem("user:onboarding");
      if (rawOnboarding) {
        const parsed = JSON.parse(rawOnboarding) as {
          goals?: string[];
          age?: string;
          height?: string;
          heightUnit?: string;
          currentWeight?: string;
          goalWeight?: string;
          experience?: string;
          monthlyWorkouts?: string;
        };
        setOnboardingInfo({
          goals: parsed.goals || [],
          age: parsed.age || "",
          height: parsed.height || "",
          heightUnit: parsed.heightUnit === "inch" ? "inch" : "cm",
          currentWeight: parsed.currentWeight || "",
          goalWeight: parsed.goalWeight || "",
          experience: parsed.experience || "",
          monthlyWorkouts: parsed.monthlyWorkouts || "",
        });
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("user:monthlyGoal", String(monthlyGoal));
    } catch {}
  }, [monthlyGoal]);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Profile</h1>
          <p className="text-muted-foreground">
            Manage your account and preferences
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Profile Card */}
          <Card className="md:col-span-2">
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

              <div className="mt-4 flex justify-end gap-2">
                <Button onClick={handleSaveProfile}>Save Changes</Button>
                <Button variant="destructive" onClick={handleSignOut}>
                  Sign Out
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Stats Summary */}
          <div className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <Calendar className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Member Since
                    </p>
                    <p className="text-lg font-semibold">Dec 2024</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-success/10">
                    <TrendingUp className="h-6 w-6 text-success" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
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

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10">
                    <Award className="h-6 w-6 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
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
                <div>
                  <p className="text-sm text-muted-foreground">Age</p>
                  <p className="text-lg font-semibold">
                    {onboardingInfo.age || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Height</p>
                  <p className="text-lg font-semibold">
                    {onboardingInfo.height
                      ? `${onboardingInfo.height} ${onboardingInfo.heightUnit}`
                      : "—"}
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-sm text-muted-foreground">Fitness Goals</p>
                  <p className="text-lg font-semibold">
                    {onboardingInfo.goals.length
                      ? onboardingInfo.goals
                          .map((g) => GOAL_LABELS[g] || g)
                          .join(", ")
                      : "Not set yet"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Monthly goal</p>
                  <p className="text-lg font-semibold">
                    {onboardingInfo.monthlyWorkouts
                      ? `${onboardingInfo.monthlyWorkouts} workouts`
                      : `${monthlyGoal} workouts`}
                  </p>
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
