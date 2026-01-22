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
  signOut,
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
        new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(),
      ),
    ),
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
    [workouts],
  );

  const { data: setsByWorkout = {} } = useQuery<Record<string, UiWorkoutSet[]>>(
    {
      queryKey: ["profile-sets", completedWorkouts.map((w) => w.id)],
      queryFn: async () => {
        const entries = await Promise.all(
          completedWorkouts.map(
            async (w) => [w.id, await getSets(w.id)] as const,
          ),
        );
        return Object.fromEntries(entries) as Record<string, UiWorkoutSet[]>;
      },
      enabled: completedWorkouts.length > 0,
    },
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
    [completedWorkouts],
  );

  const memberSinceLabel = useMemo(() => {
    if (!completedWorkouts.length) return "Just getting started";
    const earliest = completedWorkouts.reduce(
      (min, w) => (w.date < min ? w.date : min),
      completedWorkouts[0].date,
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
    null,
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
        }),
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

  const handleSignOut = async () => {
    // Perform immediate synchronous local cleanup so the UI can navigate
    // away without awaiting any native operations that may fail on-device.
    try {
      try {
        clearToken();
      } catch (e) {}
      try {
        localStorage.removeItem("user:profile");
      } catch (e) {}
      try {
        localStorage.removeItem("user:onboarding");
      } catch (e) {}
      try {
        localStorage.removeItem("user:monthlyGoal");
      } catch (e) {}
      try {
        localStorage.removeItem("google:credential");
      } catch (e) {}
    } catch (e) {}

    // Defer native cleanup to the next tick so the UI can navigate away
    // first. On some devices importing native plugins synchronously while
    // the UI is transitioning can trigger crashes; deferring reduces that
    // risk while still performing background cleanup.
    try {
      setTimeout(() => {
        try {
          signOut().catch((err) => {
            try {
              console.error("signOut background error", err);
            } catch (e) {}
          });
        } catch (e) {
          try {
            console.error("signOut invocation failed", e);
          } catch (e) {}
        }
      }, 150);
    } catch (e) {
      try {
        console.error("failed to schedule signOut cleanup", e);
      } catch (e) {}
    }

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

        {/* Reworked Profile layout: identity, fitness identity, progress, controls */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Profile Header (identity) */}
          <Card className="lg:col-span-2">
            <CardContent className="p-6">
              {/* Identity row: avatar + text stack (primary anchor) */}
              <div className="flex items-center gap-6">
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10">
                  <User className="h-12 w-12 text-primary" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-white">
                    {profileInfo.name}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {onboardingInfo?.experience
                      ? `${EXPERIENCE_LABELS[onboardingInfo.experience] || "Intermediate"} • ${onboardingInfo.goals && onboardingInfo.goals.length ? onboardingInfo.goals.map((g) => g.replace(/-/g, " ")).join(", ") : "Fitness Enthusiast"}`
                      : "Fitness Enthusiast"}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Member since {memberSinceLabel}
                  </p>
                </div>
              </div>

              {/* Actions row: secondary, centered below identity */}
              <div className="mt-4 flex justify-center gap-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDialogOpen(true)}
                >
                  Edit Profile
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate("/profile/account")}
                >
                  Account Settings
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Progress Snapshot */}
          <div className="space-y-4 flex flex-col justify-center h-full">
            <Card>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg border border-border bg-secondary/50 p-6 flex flex-col items-center justify-center">
                    <p className="text-sm text-muted-foreground">
                      Total Workouts
                    </p>
                    <p className="text-2xl font-bold">{totalWorkouts}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-secondary/50 p-6 flex flex-col items-center justify-center">
                    <p className="text-sm text-muted-foreground">
                      Current Streak
                    </p>
                    <p className="text-2xl font-bold">{streak} days</p>
                  </div>
                  <div className="rounded-lg border border-border bg-secondary/50 p-6 flex flex-col items-center justify-center">
                    <p className="text-sm text-muted-foreground">This Month</p>
                    <p className="text-2xl font-bold">{workoutsThisMonth}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-secondary/50 p-6 flex flex-col items-center justify-center">
                    <p className="text-sm text-muted-foreground">PRs</p>
                    <p className="text-2xl font-bold">{totalPRs}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Fitness Identity Card (read-only) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Fitness Identity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Goal</span>
                <span className="font-medium text-white">
                  {onboardingInfo?.goals && onboardingInfo.goals.length
                    ? onboardingInfo.goals
                        .map((g) => g.replace(/-/g, " "))
                        .join(", ")
                    : "—"}
                </span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Experience</span>
                <span className="font-medium text-white">
                  {onboardingInfo?.experience
                    ? EXPERIENCE_LABELS[onboardingInfo.experience]
                    : "—"}
                </span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Equipment</span>
                <span className="font-medium text-white">
                  {onboardingInfo?.heightUnit
                    ? onboardingInfo.heightUnit === "cm"
                      ? "Full Gym"
                      : "Bodyweight"
                    : "—"}
                </span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Monthly Goal</span>
                <span className="font-medium text-white">
                  {monthlyGoal} workouts
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Edit Profile Dialog (opens from Edit Profile buttons) */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Profile</DialogTitle>
              <DialogDescription>
                Update your display name and email address.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Full Name</Label>
                <Input
                  id="edit-name"
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
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
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
            </div>
            <DialogFooter>
              <div className="flex w-full justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  className="h-10 px-4 rounded-lg"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    handleSaveProfile();
                    setDialogOpen(false);
                  }}
                  className="h-10 px-4 rounded-lg"
                >
                  Save
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Controls Section */}
        <Card>
          <CardHeader>
            <CardTitle>Controls</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button onClick={() => setDialogOpen(true)}>Edit Profile</Button>
              <Button
                variant="outline"
                onClick={() => navigate("/profile/account")}
              >
                Account Settings
              </Button>
              <Button variant="destructive" onClick={handleSignOut}>
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
