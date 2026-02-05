import { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  User,
  Calendar,
  Target,
  TrendingUp,
  Award,
  LogOut,
  Settings,
  Camera,
  Image,
} from "lucide-react";
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
      return sum + sets.reduce((inner, s) => inner + countPrTypesFromSet(s), 0);
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
    avatar?: string | null;
  }>(() => ({ name: "Strenghty User", email: "" }));
  const [onboardingInfo, setOnboardingInfo] = useState<OnboardingInfo | null>(
    null,
  );
  const [monthlyGoal, setMonthlyGoal] = useState<number>(getInitialMonthlyGoal);
  const [dialogOpen, setDialogOpen] = useState(false);

  // local editing state separated from display
  const [editing, setEditing] = useState(false);
  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);
  const [tempAvatar, setTempAvatar] = useState<string | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    try {
      const rawProfile = localStorage.getItem("user:profile");
      if (rawProfile) {
        const parsed = JSON.parse(rawProfile) as {
          name?: string;
          email?: string;
          avatar?: string | null;
        };
        const name = parsed.name || "Strenghty User";
        const email = parsed.email || "";
        const avatar = parsed.avatar || null;
        setProfileInfo({ name, email, avatar });
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
      localStorage.setItem("user:profile", JSON.stringify(profileInfo));
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
      <main className="w-full max-w-3xl mx-auto px-4 pb-32">
        {/* Compact header with avatar, info and actions */}
        <header className="pt-6 pb-4 flex flex-col md:flex-row items-start md:items-center gap-4">
          <div className="flex items-start gap-4 w-full">
            <div className="flex-shrink-0">
              <button
                type="button"
                onClick={() => {
                  setTempAvatar(profileInfo.avatar || null);
                  setAvatarDialogOpen(true);
                }}
                className="relative h-14 w-14 rounded-full bg-primary/12 flex items-center justify-center overflow-hidden"
                aria-label="Change avatar"
              >
                {profileInfo.avatar ? (
                  <img
                    src={profileInfo.avatar}
                    alt="avatar"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <div className="h-full w-full flex items-center justify-center bg-primary/15">
                      <span className="text-xl font-bold text-primary select-none">
                        S
                      </span>
                    </div>
                  </div>
                )}
              </button>
            </div>
            <div className="flex flex-col items-start w-full min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold text-white truncate">
                  {profileInfo.name}
                </span>
              </div>
              <div className="mt-1 text-sm text-muted-foreground truncate">
                {onboardingInfo?.experience
                  ? EXPERIENCE_LABELS[onboardingInfo.experience] || "Member"
                  : "Member"}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Member since {memberSinceLabel}
              </div>
              {/* Desktop actions inline with header (hidden on mobile) */}
              <div className="mt-3 hidden md:flex md:flex-row items-start gap-2 md:gap-4 w-full">
                <div className="w-full md:w-auto">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditing(true)}
                    className="w-full md:w-auto min-w-0 md:min-w-[120px]"
                  >
                    Edit Profile
                  </Button>
                </div>

                <div className="flex gap-2 w-full md:w-auto mt-1 md:mt-0">
                  <div className="flex-1 md:flex-none md:w-auto">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate("/profile/account")}
                      className="w-full md:w-auto min-w-0 md:min-w-[120px]"
                    >
                      Account Settings
                    </Button>
                  </div>

                  <div className="flex-1 md:flex-none md:w-auto">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={handleSignOut}
                      className="w-full md:w-auto min-w-0 md:min-w-[120px]"
                    >
                      Sign Out
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Mobile actions below header */}
        <div className="mt-4 pt-4 space-y-2 md:hidden">
          <div className="w-full">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setEditing(true)}
              className="w-full"
            >
              Edit Profile
            </Button>
          </div>

          <div className="flex gap-2 w-full">
            <div className="flex-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate("/profile/account")}
                className="w-full"
              >
                Account Settings
              </Button>
            </div>

            <div className="flex-1">
              <Button
                size="sm"
                variant="destructive"
                onClick={handleSignOut}
                className="w-full"
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>

        {/* Section 2 — Performance Bento Grid (2x2 square cards) */}
        <section className="mt-6">
          <div className="grid grid-cols-2 gap-3">
            <MetricCard
              label="Total Workouts"
              value={String(totalWorkouts)}
              icon={<Calendar className="h-5 w-5 text-primary" />}
            />
            <MetricCard
              label="Current Streak"
              value={`${streak}d`}
              icon={<TrendingUp className="h-5 w-5 text-primary" />}
            />
            <MetricCard
              label="This Month"
              value={String(workoutsThisMonth)}
              icon={<Calendar className="h-5 w-5 text-primary" />}
            />
            <MetricCard
              label="PRs"
              value={String(totalPRs)}
              icon={<Award className="h-5 w-5 text-primary" />}
            />
          </div>
        </section>

        {/* Section 3 — Goals + Physical Stats */}
        <section className="mt-6">
          <div className="rounded-2xl bg-surface/5 p-4">
            <h2 className="text-sm font-medium text-white">Goals & Physical</h2>
            <div className="mt-3">
              <div className="flex flex-wrap gap-2">
                {onboardingInfo?.goals && onboardingInfo.goals.length ? (
                  onboardingInfo.goals.map((g) => (
                    <span
                      key={g}
                      className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-sm text-white"
                    >
                      {g.replace(/-/g, " ")}
                    </span>
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground">—</div>
                )}
              </div>

              <div className="mt-4 flex items-center justify-between gap-6">
                <div className="flex-1 text-center">
                  <div className="text-sm text-muted-foreground">Height</div>
                  <div className="text-lg font-semibold text-white">
                    {onboardingInfo?.height || "—"}{" "}
                    {onboardingInfo?.heightUnit || ""}
                  </div>
                </div>
                <div className="flex-1 text-center">
                  <div className="text-sm text-muted-foreground">Weight</div>
                  <div className="text-lg font-semibold text-white">
                    {onboardingInfo?.currentWeight || "—"}
                  </div>
                </div>
                <div className="flex-1 text-center">
                  <div className="text-sm text-muted-foreground">Age</div>
                  <div className="text-lg font-semibold text-white">
                    {onboardingInfo?.age || "—"}
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <ProfileRow
                  label="Experience"
                  value={
                    onboardingInfo?.experience
                      ? EXPERIENCE_LABELS[onboardingInfo.experience]
                      : "—"
                  }
                />
                <ProfileRow
                  label="Monthly Target"
                  value={`${monthlyGoal} workouts`}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Section 4 — Personal Summary (read-only) */}
        <section className="mt-6">
          <div className="rounded-2xl bg-surface/6 p-4">
            <h2 className="text-sm font-medium text-white">Personal</h2>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="col-span-1">
                <div className="text-sm text-muted-foreground">Full name</div>
                <div className="text-sm font-medium text-white">
                  {profileInfo.name}
                </div>
              </div>
              <div>
                {/* Section 2 — Performance Bento Grid (2x2 square cards) */}
                <div className="text-sm font-medium text-white">
                  {profileInfo.email || "—"}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">
                  Member since
                </div>
                <div className="text-sm font-medium text-white">
                  {memberSinceLabel}
                </div>
              </div>
            </div>

            <div className="mt-4">
              <div className="text-sm text-muted-foreground">Physical</div>
              <div className="mt-2 flex gap-4">
                <div className="text-sm">
                  <div className="text-muted-foreground">Height</div>
                  <div className="font-medium text-white">
                    {onboardingInfo?.height || "—"}{" "}
                    {onboardingInfo?.heightUnit || ""}
                  </div>
                </div>
                <div className="text-sm">
                  <div className="text-muted-foreground">Weight</div>
                  <div className="font-medium text-white">
                    {onboardingInfo?.currentWeight || "—"}
                  </div>
                </div>
                <div className="text-sm">
                  <div className="text-muted-foreground">Age</div>
                  <div className="font-medium text-white">
                    {onboardingInfo?.age || "—"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* small spacer */}
        <div className="h-3" />

        {/* Edit dialog (small) */}
        <Dialog open={editing} onOpenChange={setEditing}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Profile</DialogTitle>
              <DialogDescription>Update personal details.</DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 pt-2">
              <div>
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

              <div>
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

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="edit-age">Age</Label>
                  <Input
                    id="edit-age"
                    value={onboardingInfo?.age || ""}
                    onChange={(e) =>
                      setOnboardingInfo((prev) =>
                        prev ? { ...prev, age: e.target.value } : prev,
                      )
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="edit-height">Height</Label>
                  <Input
                    id="edit-height"
                    value={onboardingInfo?.height || ""}
                    onChange={(e) =>
                      setOnboardingInfo((prev) =>
                        prev ? { ...prev, height: e.target.value } : prev,
                      )
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="edit-weight">Current Weight</Label>
                  <Input
                    id="edit-weight"
                    value={onboardingInfo?.currentWeight || ""}
                    onChange={(e) =>
                      setOnboardingInfo((prev) =>
                        prev
                          ? { ...prev, currentWeight: e.target.value }
                          : prev,
                      )
                    }
                  />
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

        {/* Avatar picker dialog */}
        <Dialog open={avatarDialogOpen} onOpenChange={setAvatarDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change Avatar</DialogTitle>
              <DialogDescription>
                Choose from gallery or take a photo.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 pt-2">
              <div className="flex items-center justify-center">
                <div className="h-36 w-36 rounded-full bg-surface/6 overflow-hidden">
                  {tempAvatar ? (
                    <img
                      src={tempAvatar}
                      alt="preview"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <User className="h-10 w-10 text-primary" />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files && e.target.files[0];
                    if (!f) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                      setTempAvatar(String(reader.result || ""));
                    };
                    reader.readAsDataURL(f);
                  }}
                />

                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files && e.target.files[0];
                    if (!f) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                      setTempAvatar(String(reader.result || ""));
                    };
                    reader.readAsDataURL(f);
                  }}
                />

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => galleryInputRef.current?.click()}
                  >
                    <Image className="mr-2 h-4 w-4" /> Gallery
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => cameraInputRef.current?.click()}
                  >
                    <Camera className="mr-2 h-4 w-4" /> Camera
                  </Button>
                  <Button variant="ghost" onClick={() => setTempAvatar(null)}>
                    Remove
                  </Button>
                </div>
              </div>
            </div>

            <DialogFooter>
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

        {/* Floating control removed — actions moved to header and dialog */}
      </main>
    </AppLayout>
  );
}

/* Helper subcomponents */
function MetricCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="relative w-full h-36 rounded-2xl bg-surface/6 p-4 flex items-center justify-center border border-surface/8">
      <div className="absolute left-4 top-1 p-2 rounded-md bg-primary/8 z-10">
        {icon}
      </div>
      <div className="text-center">
        <div className="text-3xl font-extrabold text-white">{value}</div>
        <div className="mt-1 text-sm text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="py-3 flex items-center justify-between gap-4">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="text-sm font-medium text-white text-right max-w-xs break-words">
        {value}
      </div>
    </div>
  );
}
