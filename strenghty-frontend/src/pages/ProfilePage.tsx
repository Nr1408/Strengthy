import { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  User,
  Calendar,
  Target,
  TrendingUp,
  Award,
  Camera,
  Image,
  Pencil,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { countPrTypesFromSet } from "@/lib/utils";
import { Capacitor } from "@capacitor/core";

type HeightUnit = "cm" | "inch" | "ft";

type OnboardingInfo = {
  goals: string[];
  age: string;
  height: string;
  heightUnit: HeightUnit;
  currentWeight: string;
  goalWeight: string;
  experience: string;
  monthlyWorkouts: string;
  equipment: string;
  weightUnit: "kg" | "lbs";
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
  equipment: "",
  weightUnit: "kg",
};

const EXPERIENCE_LABELS: Record<string, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

const FITNESS_GOAL_OPTIONS: { id: string; label: string }[] = [
  { id: "hypertrophy", label: "Build Muscle" },
  { id: "calorie-burn", label: "Burn Fat" },
  { id: "powerlifting", label: "Get Stronger" },
  { id: "build-muscle", label: "Build Muscle" },
  { id: "lose-weight", label: "Lose Weight" },
  { id: "get-stronger", label: "Get Stronger" },
  { id: "stay-healthy", label: "Stay Healthy" },
  { id: "improve-endurance", label: "Improve Endurance" },
];

const TRAINING_GOAL_OPTIONS: { id: string; label: string }[] = [
  { id: "hypertrophy", label: "Build Muscle" },
  { id: "calorie-burn", label: "Burn Fat" },
  { id: "powerlifting", label: "Get Stronger" },
];

function normalizeOnboardingInfo(raw: any): OnboardingInfo {
  const goalsFromArray = Array.isArray(raw?.goals)
    ? raw.goals.map((g: unknown) => String(g)).filter(Boolean)
    : [];
  const singleGoal = String(raw?.goal || "").trim();
  const goals = goalsFromArray.length
    ? goalsFromArray
    : singleGoal
      ? [singleGoal]
      : [];

  const normalizedHeightUnit = (() => {
    const unit = String(
      raw?.heightUnit || raw?.height_unit || "cm",
    ).toLowerCase();
    if (unit === "cm" || unit === "inch" || unit === "ft")
      return unit as HeightUnit;
    if (unit === "in") return "inch";
    return "cm";
  })();

  const monthly =
    raw?.monthlyWorkouts ?? raw?.monthly_workouts ?? raw?.monthlyGoal ?? "";

  return {
    goals,
    age: raw?.age != null ? String(raw.age) : "",
    height: raw?.height != null ? String(raw.height) : "",
    heightUnit: normalizedHeightUnit,
    currentWeight:
      raw?.currentWeight != null
        ? String(raw.currentWeight)
        : raw?.weight != null
          ? String(raw.weight)
          : raw?.current_weight != null
            ? String(raw.current_weight)
            : "",
    goalWeight:
      raw?.goalWeight != null
        ? String(raw.goalWeight)
        : raw?.goal_weight != null
          ? String(raw.goal_weight)
          : "",
    experience: raw?.experience ? String(raw.experience) : "",
    monthlyWorkouts: monthly != null ? String(monthly) : "",
    equipment: raw?.equipment ? String(raw.equipment) : "",
    weightUnit: (raw?.weightUnit === "lbs" ? "lbs" : "kg") as "kg" | "lbs",
  };
}

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
  ).sort((a, b) => b - a);
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
      return sum + sets.reduce((inner, s) => inner + countPrTypesFromSet(s), 0);
    }, 0);
  }, [setsByWorkout]);

  const streak = useMemo(
    () => computeStreak(completedWorkouts.map((w) => w.date)),
    [completedWorkouts],
  );

  const memberSinceLabel = useMemo(() => {
    if (!workouts.length) return "Just getting started";
    let earliest = workouts[0]?.date;
    for (const w of workouts) {
      if (w.date < earliest) earliest = w.date;
    }
    try {
      return format(earliest, "MMM yyyy");
    } catch {
      return "Just getting started";
    }
  }, [workouts]);

  const [profileInfo, setProfileInfo] = useState<{
    name: string;
    email?: string | null;
    avatar?: string | null;
  }>(() => ({ name: "Strenghty User", email: "" }));
  const [onboardingInfo, setOnboardingInfo] = useState<OnboardingInfo | null>(
    null,
  );
  const [monthlyGoal, setMonthlyGoal] = useState<number>(getInitialMonthlyGoal);
  const [editing, setEditing] = useState(false);
  const [editingGoals, setEditingGoals] = useState(false);
  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);
  const [signOutConfirmOpen, setSignOutConfirmOpen] = useState(false);
  const [tempAvatar, setTempAvatar] = useState<string | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const isNative = Capacitor.getPlatform && Capacitor.getPlatform() !== "web";

  const openGallery = async () => {
    if (isNative) {
      try {
        const cam = await import("@capacitor/camera");
        const { Camera, CameraResultType, CameraSource } = cam;
        const photo = await Camera.getPhoto({
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Photos,
          quality: 90,
        });
        const dataUrl =
          photo.dataUrl ??
          (photo.base64String
            ? `data:image/jpeg;base64,${photo.base64String}`
            : null);
        if (dataUrl) setTempAvatar(dataUrl);
        return;
      } catch (err) {
        try {
          toast({
            title: "Permission required",
            description:
              "Please enable storage/gallery permissions in app settings.",
          });
        } catch (e) {}
        return;
      }
    }
    galleryInputRef.current?.click();
  };

  const openCamera = async () => {
    if (isNative) {
      try {
        const cam = await import("@capacitor/camera");
        const { Camera, CameraResultType, CameraSource } = cam;
        const photo = await Camera.getPhoto({
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Camera,
          quality: 90,
        });
        const dataUrl =
          photo.dataUrl ??
          (photo.base64String
            ? `data:image/jpeg;base64,${photo.base64String}`
            : null);
        if (dataUrl) setTempAvatar(dataUrl);
        return;
      } catch (err) {
        try {
          toast({
            title: "Permission required",
            description: "Please enable camera permission in app settings.",
          });
        } catch (e) {}
        return;
      }
    }
    cameraInputRef.current?.click();
  };

  useEffect(() => {
    try {
      const rawProfile = localStorage.getItem("user:profile");
      if (rawProfile) {
        const parsed = JSON.parse(rawProfile) as {
          name?: string;
          email?: string;
          avatar?: string | null;
        };
        setProfileInfo({
          name: parsed.name || "Strenghty User",
          email: parsed.email || "",
          avatar: parsed.avatar || null,
        });
      }
    } catch {}
    try {
      const rawOnboarding = localStorage.getItem("user:onboarding");
      if (rawOnboarding) {
        const parsed = JSON.parse(rawOnboarding);
        const normalized = normalizeOnboardingInfo(parsed);
        setOnboardingInfo(normalized);
        const monthly = Number(normalized.monthlyWorkouts || "");
        if (Number.isFinite(monthly) && monthly > 0) {
          setMonthlyGoal(Math.min(monthly, MAX_MONTHLY_GOAL));
        }
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
      localStorage.setItem("user:profile", JSON.stringify(profileInfo));
      toast({
        title: "Profile saved",
        description: "Your changes were saved.",
      });
    } catch {}
  };

  const handleSaveDetails = async () => {
    try {
      const payload = onboardingInfo ?? DEFAULT_ONBOARDING;
      localStorage.setItem("user:onboarding", JSON.stringify(payload));
      setOnboardingInfo(payload);

      // Recompute Next Up based on new goals/experience/equipment
      try {
        const { recommendFirstWorkout } = await import("@/lib/onboarding");
        console.log("[Profile] recomputing nextUp with:", {
          goal: (payload.goals?.[0] as any) || "other",
          equipment: (payload.equipment as any) || "other",
          experience: (payload.experience as any) || "intermediate",
        });
        const rec = recommendFirstWorkout({
          goal: (payload.goals?.[0] as any) || "other",
          age: payload.age ? Number(payload.age) : null,
          height: payload.height ? Number(payload.height) : null,
          heightUnit: (payload.heightUnit as any) || "cm",
          weight: payload.currentWeight ? Number(payload.currentWeight) : null,
          weightUnit:
            (payload.weightUnit as any) || (payload.weightUnit as any) || "kg",
          equipment: (payload.equipment as any) || "other",
          experience: (payload.experience as any) || "intermediate",
          monthlyWorkouts: Number(payload.monthlyWorkouts) || 12,
        });
        console.log(
          "[Profile] recomputed result:",
          rec?.routine?.id,
          rec?.label,
        );
        try {
          localStorage.setItem(
            "user:nextSuggestedRoutine",
            JSON.stringify({ id: rec.routine.id, label: rec.label }),
          );
          window.dispatchEvent(new CustomEvent("strengthy:nextUpUpdated"));
        } catch {}
      } catch (e) {
        console.error("[Profile] recompute failed:", e);
      }

      toast({
        title: "Details saved",
        description: "Your profile details were updated.",
      });
    } catch {}
  };

  const updateOnboardingInfo = (patch: Partial<OnboardingInfo>) => {
    setOnboardingInfo((prev) => ({
      ...(prev ?? DEFAULT_ONBOARDING),
      ...patch,
    }));
  };

  const handleSignOut = async () => {
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

  return (
    <AppLayout>
      <main className="w-full max-w-4xl mx-auto px-4 pb-32">
        {/* ── Hero ── */}
        <section className="pt-0 -mt-6 pb-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <button
              type="button"
              onClick={() => {
                setTempAvatar(profileInfo.avatar || null);
                setAvatarDialogOpen(true);
              }}
              className="relative flex-shrink-0 h-20 w-20 rounded-full bg-transparent flex items-center justify-center overflow-hidden transition-all duration-200"
              aria-label="Change avatar"
            >
              {profileInfo.avatar ? (
                <img
                  src={profileInfo.avatar}
                  alt="avatar"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-3xl font-bold text-white select-none">
                  {profileInfo.name.charAt(0).toUpperCase()}
                </span>
              )}
            </button>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-white truncate">
                  {profileInfo.name}
                </h1>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-500/15 text-orange-400 border border-orange-500/20">
                  {onboardingInfo?.experience
                    ? EXPERIENCE_LABELS[onboardingInfo.experience] || "Member"
                    : "Member"}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {completedWorkouts.length > 0
                  ? `Member since ${memberSinceLabel}`
                  : "New member 🎉"}
              </p>
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setEditing(true)}
                >
                  Edit Profile
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => navigate("/profile/account")}
                >
                  Account Settings
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* ── Stats row ── */}
        <section className="mt-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <StatCard
              label="Total Workouts"
              value={String(totalWorkouts)}
              icon={<Calendar className="h-5 w-5 text-orange-400" />}
            />
            <StatCard
              label="Day Streak"
              value={`${streak}d`}
              icon={<TrendingUp className="h-5 w-5 text-orange-400" />}
            />
            <StatCard
              label="This Month"
              value={String(workoutsThisMonth)}
              icon={<Target className="h-5 w-5 text-orange-400" />}
            />
            <StatCard
              label="Total PRs"
              value={String(totalPRs)}
              icon={<Award className="h-5 w-5 text-orange-400" />}
            />
          </div>
        </section>

        {/* ── Monthly Progress ── */}
        <section className="mt-5 sm:mt-7">
          <div className="rounded-2xl bg-card border border-border p-5 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
              Monthly Progress
            </h2>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">
                    Workouts this month
                  </span>
                  <span className="text-sm font-bold text-white">
                    {workoutsThisMonth} / {monthlyGoal}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-orange-500 transition-all duration-500"
                    style={{
                      width: `${Math.min((workoutsThisMonth / Math.max(monthlyGoal, 1)) * 100, 100)}%`,
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {monthlyGoal - workoutsThisMonth > 0
                    ? `${monthlyGoal - workoutsThisMonth} more to hit your goal`
                    : "🎉 Monthly goal achieved!"}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Goals & Physical ── */}
        <section className="mt-5 sm:mt-7">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Physical stats card */}
            <div className="rounded-2xl bg-card border border-border p-4 sm:p-5 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Physical
                </h2>
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-muted-foreground border border-white/10 bg-zinc-800/50 hover:text-white hover:border-white/25 transition-colors"
                >
                  <Pencil className="h-3 w-3" /> Edit
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
                <PhysicalStat
                  label="Height"
                  value={
                    onboardingInfo?.height
                      ? `${onboardingInfo.height} ${onboardingInfo.heightUnit || ""}`.trim()
                      : null
                  }
                />
                <PhysicalStat
                  label="Weight"
                  value={
                    onboardingInfo?.currentWeight
                      ? `${onboardingInfo.currentWeight} ${onboardingInfo.weightUnit === "lbs" ? "lbs" : "kg"}`
                      : null
                  }
                />
                <PhysicalStat label="Age" value={onboardingInfo?.age || null} />
                <PhysicalStat
                  label="Goal Weight"
                  value={
                    onboardingInfo?.goalWeight
                      ? `${onboardingInfo.goalWeight} ${onboardingInfo.weightUnit === "lbs" ? "lbs" : "kg"}`
                      : null
                  }
                />
              </div>
            </div>

            {/* Goals & training card */}
            <div className="rounded-2xl bg-card border border-border p-5 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Goals & Training
                </h2>
                <button
                  type="button"
                  onClick={() => setEditingGoals(true)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-muted-foreground border border-white/10 bg-zinc-800/50 hover:text-white hover:border-white/25 transition-colors"
                >
                  <Pencil className="h-3 w-3" /> Edit
                </button>
              </div>
              <div className="flex flex-wrap gap-2 mb-4 min-h-[28px]">
                {onboardingInfo?.goals?.length ? (
                  onboardingInfo.goals.map((g) => (
                    <span
                      key={g}
                      className="inline-flex items-center px-3 py-1 rounded-full bg-orange-500/10 text-xs font-medium text-orange-400 border border-orange-500/20"
                    >
                      {FITNESS_GOAL_OPTIONS.find((opt) => opt.id === g)
                        ?.label || g.replace(/-/g, " ")}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground flex flex-wrap items-center gap-2">
                    No goals set
                    <button
                      type="button"
                      onClick={() => setEditingGoals(true)}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-orange-500/15 text-orange-400 text-xs font-semibold border border-orange-500/25 hover:bg-orange-500/25 transition-colors"
                    >
                      + Add Goal
                    </button>
                  </span>
                )}
              </div>
              <div className="space-y-3 border-t border-border pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Experience
                  </span>
                  {onboardingInfo?.experience ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-card border border-border text-white">
                      {EXPERIENCE_LABELS[onboardingInfo.experience] ||
                        onboardingInfo.experience}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setEditingGoals(true)}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-orange-500/15 text-orange-400 text-xs font-semibold border border-orange-500/25 hover:bg-orange-500/25 transition-colors"
                    >
                      + Add
                    </button>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Monthly Target
                  </span>
                  <span className="text-sm font-semibold text-white">
                    {monthlyGoal} workouts
                  </span>
                </div>
                {onboardingInfo?.equipment && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Equipment
                    </span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-card border border-border text-white capitalize">
                      {onboardingInfo.equipment.replace(/-/g, " ")}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── Personal ── */}
        <section className="mt-5 sm:mt-7">
          <div className="rounded-2xl bg-card border border-border p-5 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
              Personal
            </h2>
            <div className="divide-y divide-border sm:divide-y-0 sm:divide-x sm:grid sm:grid-cols-3">
              <div className="py-3 sm:py-0 sm:px-4 first:pt-0 first:sm:pl-0 last:sm:pr-0">
                <p className="text-xs text-muted-foreground mb-1">Full Name</p>
                <p className="text-sm font-semibold text-white">
                  {profileInfo.name}
                </p>
              </div>
              <div className="py-3 sm:py-0 sm:px-4 first:pt-0 first:sm:pl-0 last:sm:pr-0">
                <p className="text-xs text-muted-foreground mb-1">Email</p>
                <p className="text-sm font-semibold text-white truncate">
                  {profileInfo.email || "—"}
                </p>
              </div>
              <div className="py-3 sm:py-0 sm:px-4 first:pt-0 first:sm:pl-0 last:sm:pr-0">
                <p className="text-xs text-muted-foreground mb-1">
                  Member Since
                </p>
                <p className="text-sm font-semibold text-white">
                  {workouts.length > 0 ? memberSinceLabel : "New member 🎉"}
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="h-6" />

        {/* Sign Out */}
        <div className="mt-12 mb-2">
          <Button
            variant="outline"
            className="w-full border-red-500/40 text-red-400 hover:bg-red-500/10 hover:border-red-500/60 font-medium text-base py-3"
            onClick={() => setSignOutConfirmOpen(true)}
          >
            Sign Out
          </Button>
        </div>

        {/* ── Edit Profile dialog ── */}
        <Dialog open={editing} onOpenChange={setEditing}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Profile</DialogTitle>
              <DialogDescription>
                Update your name and physical stats.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 pt-2">
              {/* Full Name */}
              <div className="flex flex-col gap-1">
                <Label
                  htmlFor="edit-name"
                  className="text-xs font-medium text-zinc-400 uppercase tracking-wide"
                >
                  Full Name
                </Label>
                <Input
                  id="edit-name"
                  value={profileInfo.name}
                  onChange={(e) =>
                    setProfileInfo((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  className="bg-zinc-900/50 border-white/10"
                />
              </div>

              <div className="border-t border-white/10" />

              {/* Age + Height */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <Label
                    htmlFor="edit-age"
                    className="text-xs font-medium text-zinc-400 uppercase tracking-wide"
                  >
                    Age
                  </Label>
                  <Input
                    id="edit-age"
                    type="number"
                    value={onboardingInfo?.age || ""}
                    onChange={(e) =>
                      updateOnboardingInfo({ age: e.target.value })
                    }
                    className="bg-zinc-900/50 border-white/10"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <Label
                    htmlFor="edit-height"
                    className="text-xs font-medium text-zinc-400 uppercase tracking-wide"
                  >
                    Height
                  </Label>
                  <div className="flex items-center rounded-md border border-white/10 bg-zinc-900/50 overflow-hidden focus-within:ring-1 focus-within:ring-ring">
                    <input
                      id="edit-height"
                      type="number"
                      value={onboardingInfo?.height || ""}
                      onChange={(e) =>
                        updateOnboardingInfo({ height: e.target.value })
                      }
                      placeholder={
                        onboardingInfo?.heightUnit === "ft" ? "5.9" : "175"
                      }
                      className="flex-1 min-w-0 bg-transparent px-3 py-2 text-sm text-white placeholder:text-muted-foreground outline-none"
                    />
                    <div className="flex items-center gap-0.5 pr-1.5 shrink-0">
                      {(["cm", "ft"] as const).map((unit) => (
                        <button
                          key={unit}
                          type="button"
                          onClick={() =>
                            updateOnboardingInfo({ heightUnit: unit })
                          }
                          className={`px-2 py-0.5 rounded text-xs font-semibold transition-all ${
                            onboardingInfo?.heightUnit === unit
                              ? "bg-orange-500 text-white"
                              : "text-zinc-500 hover:text-zinc-300"
                          }`}
                        >
                          {unit}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Current Weight + Goal Weight */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <Label
                    htmlFor="edit-weight"
                    className="text-xs font-medium text-zinc-400 uppercase tracking-wide"
                  >
                    Current Weight
                  </Label>
                  <div className="flex items-center rounded-md border border-white/10 bg-zinc-900/50 overflow-hidden focus-within:ring-1 focus-within:ring-ring">
                    <input
                      id="edit-weight"
                      type="number"
                      value={onboardingInfo?.currentWeight || ""}
                      onChange={(e) =>
                        updateOnboardingInfo({ currentWeight: e.target.value })
                      }
                      placeholder={
                        onboardingInfo?.weightUnit === "lbs" ? "165" : "75"
                      }
                      className="flex-1 min-w-0 bg-transparent px-3 py-2 text-sm text-white placeholder:text-muted-foreground outline-none"
                    />
                    <div className="flex items-center gap-0.5 pr-1.5 shrink-0">
                      {(["kg", "lbs"] as const).map((unit) => (
                        <button
                          key={unit}
                          type="button"
                          onClick={() =>
                            updateOnboardingInfo({ weightUnit: unit })
                          }
                          className={`px-2 py-0.5 rounded text-xs font-semibold transition-all ${
                            onboardingInfo?.weightUnit === unit
                              ? "bg-orange-500 text-white"
                              : "text-zinc-500 hover:text-zinc-300"
                          }`}
                        >
                          {unit}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <Label
                    htmlFor="edit-goal-weight"
                    className="text-xs font-medium text-zinc-400 uppercase tracking-wide"
                  >
                    Goal Weight
                  </Label>
                  <div className="flex items-center rounded-md border border-white/10 bg-zinc-900/50 overflow-hidden focus-within:ring-1 focus-within:ring-ring">
                    <input
                      id="edit-goal-weight"
                      type="number"
                      value={onboardingInfo?.goalWeight || ""}
                      onChange={(e) =>
                        updateOnboardingInfo({ goalWeight: e.target.value })
                      }
                      placeholder={
                        onboardingInfo?.weightUnit === "lbs" ? "165" : "75"
                      }
                      className="flex-1 min-w-0 bg-transparent px-3 py-2 text-sm text-white placeholder:text-muted-foreground outline-none"
                    />
                    <div className="flex items-center gap-0.5 pr-1.5 shrink-0">
                      {(["kg", "lbs"] as const).map((unit) => (
                        <button
                          key={unit}
                          type="button"
                          onClick={() =>
                            updateOnboardingInfo({ weightUnit: unit })
                          }
                          className={`px-2 py-0.5 rounded text-xs font-semibold transition-all ${
                            onboardingInfo?.weightUnit === unit
                              ? "bg-orange-500 text-white"
                              : "text-zinc-500 hover:text-zinc-300"
                          }`}
                        >
                          {unit}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <div className="flex w-full justify-end gap-3">
                <Button variant="outline" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    handleSaveProfile();
                    handleSaveDetails();
                    setEditing(false);
                  }}
                >
                  Save
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Goals & Training dialog ── */}
        <Dialog open={editingGoals} onOpenChange={setEditingGoals}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Goals & Training</DialogTitle>
              <DialogDescription>
                Update your fitness goals and experience level.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-5 pt-2">
              <div>
                <Label className="text-sm font-medium text-white mb-3 block">
                  Fitness Goals
                </Label>
                <div className="flex flex-wrap gap-2">
                  {TRAINING_GOAL_OPTIONS.map((opt) => {
                    const isSelected = onboardingInfo?.goals?.includes(opt.id);
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          // Single-select: selecting an option sets it as the sole
                          // goal; clicking the already-selected option clears it.
                          const next = isSelected ? [] : [opt.id];
                          updateOnboardingInfo({ goals: next });
                        }}
                        className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                          isSelected
                            ? "bg-orange-500/20 text-orange-400 border-orange-500/40"
                            : "bg-zinc-800 text-muted-foreground border-white/10 hover:border-white/25"
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-white mb-3 block">
                  Experience Level
                </Label>
                <div className="flex gap-2">
                  {["beginner", "intermediate", "advanced"].map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() =>
                        updateOnboardingInfo({ experience: level })
                      }
                      className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all capitalize ${
                        onboardingInfo?.experience === level
                          ? "bg-orange-500/20 text-orange-400 border-orange-500/40"
                          : "bg-zinc-800 text-muted-foreground border-white/10 hover:border-white/25"
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-white mb-3 block">
                  Equipment
                </Label>
                <div className="flex gap-2">
                  {[
                    { id: "full-gym", label: "Full Gym" },
                    { id: "home-gym", label: "Home Gym" },
                    { id: "bodyweight", label: "Bodyweight" },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() =>
                        updateOnboardingInfo({ equipment: opt.id })
                      }
                      className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${
                        onboardingInfo?.equipment === opt.id
                          ? "bg-orange-500/20 text-orange-400 border-orange-500/40"
                          : "bg-zinc-800 text-muted-foreground border-white/10 hover:border-white/25"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-white mb-3 block">
                  Monthly Target:{" "}
                  <span className="text-orange-400">
                    {monthlyGoal} workouts
                  </span>
                </Label>
                <input
                  type="range"
                  min={4}
                  max={30}
                  step={1}
                  value={monthlyGoal}
                  onChange={(e) =>
                    setMonthlyGoal(
                      Math.min(Math.max(Number(e.target.value), 4), 30),
                    )
                  }
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>4</span>
                  <span>30</span>
                </div>
              </div>
            </div>

            <DialogFooter>
              <div className="flex w-full justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setEditingGoals(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    handleSaveDetails();
                    setEditingGoals(false);
                  }}
                >
                  Save
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Avatar picker dialog ── */}
        <Dialog open={avatarDialogOpen} onOpenChange={setAvatarDialogOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Change Avatar</DialogTitle>
              <DialogDescription>
                Choose a photo from your gallery or take one.
              </DialogDescription>
            </DialogHeader>

            {/* Hidden file inputs */}
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                const reader = new FileReader();
                reader.onload = () =>
                  setTempAvatar(String(reader.result || ""));
                reader.readAsDataURL(f);
              }}
            />
            {/* Camera input — no capture attribute on desktop so it opens file picker;
                on mobile browsers, capture="user" opens the front camera */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="user"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                const reader = new FileReader();
                reader.onload = () =>
                  setTempAvatar(String(reader.result || ""));
                reader.readAsDataURL(f);
              }}
            />

            <div className="flex flex-col items-center gap-5 pt-2">
              {/* Avatar preview */}
              <div className="relative">
                <div className="h-28 w-28 rounded-full bg-orange-500/10 border-2 border-orange-500/25 overflow-hidden flex items-center justify-center">
                  {tempAvatar ? (
                    <img
                      src={tempAvatar}
                      alt="preview"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-4xl font-bold text-orange-400 select-none">
                      {profileInfo.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                {tempAvatar && (
                  <button
                    type="button"
                    onClick={() => setTempAvatar(null)}
                    className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-zinc-800 border border-white/20 flex items-center justify-center text-zinc-400 hover:text-white text-xs transition-colors"
                    aria-label="Remove photo"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Action buttons */}
              <div className="grid grid-cols-2 gap-3 w-full">
                <button
                  type="button"
                  onClick={openGallery}
                  className="flex flex-col items-center gap-2 px-4 py-4 rounded-2xl bg-zinc-800/60 border border-white/10 hover:bg-zinc-700/60 hover:border-white/20 transition-all"
                >
                  <div className="h-10 w-10 rounded-full bg-orange-500/15 flex items-center justify-center">
                    <Image className="h-5 w-5 text-orange-400" />
                  </div>
                  <span className="text-sm font-medium text-white">
                    Gallery
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Choose existing photo
                  </span>
                </button>

                <button
                  type="button"
                  onClick={openCamera}
                  className="flex flex-col items-center gap-2 px-4 py-4 rounded-2xl bg-zinc-800/60 border border-white/10 hover:bg-zinc-700/60 hover:border-white/20 transition-all"
                >
                  <div className="h-10 w-10 rounded-full bg-orange-500/15 flex items-center justify-center">
                    <Camera className="h-5 w-5 text-orange-400" />
                  </div>
                  <span className="text-sm font-medium text-white">Camera</span>
                  <span className="text-xs text-muted-foreground">
                    Take a new photo
                  </span>
                </button>
              </div>

              {tempAvatar && (
                <button
                  type="button"
                  onClick={() => setTempAvatar(null)}
                  className="text-xs text-zinc-500 hover:text-red-400 transition-colors"
                >
                  Remove current photo
                </button>
              )}
            </div>

            <DialogFooter className="mt-2">
              <div className="flex w-full justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setAvatarDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    const updated = { ...profileInfo, avatar: tempAvatar };
                    try {
                      localStorage.setItem(
                        "user:profile",
                        JSON.stringify(updated),
                      );
                    } catch (e) {}
                    setProfileInfo(updated);
                    setAvatarDialogOpen(false);
                    toast({ title: "Avatar updated" });
                  }}
                >
                  Save
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Sign Out confirm dialog ── */}
        <Dialog open={signOutConfirmOpen} onOpenChange={setSignOutConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Sign out?</DialogTitle>
              <DialogDescription>
                You will need to sign in again to access your account.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <div className="flex w-full justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setSignOutConfirmOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setSignOutConfirmOpen(false);
                    handleSignOut();
                  }}
                >
                  Sign Out
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </AppLayout>
  );
}

/* ── Helper subcomponents ── */
function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-card border border-border p-5 flex flex-col gap-3 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 min-h-[120px] sm:min-h-[130px]">
      <div className="p-2 rounded-xl bg-orange-500/10 w-fit">{icon}</div>
      <div>
        <div className="text-4xl font-black text-white tracking-tight">
          {value}
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
      </div>
    </div>
  );
}

function PhysicalStat({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  let main = value || "—";
  let unit = "";
  if (value && /\s/.test(value)) {
    const parts = value.split(/\s+/);
    main = parts[0];
    unit = parts.slice(1).join(" ");
  }
  return (
    <div className="flex flex-col">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="flex items-baseline gap-1 mt-0.5">
        <span className="text-2xl font-black text-white">{main}</span>
        {unit && (
          <span className="text-base font-semibold text-muted-foreground whitespace-nowrap">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}
