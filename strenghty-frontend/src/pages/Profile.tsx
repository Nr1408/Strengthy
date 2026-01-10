import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { User, Calendar, Target, TrendingUp, Award } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getWorkouts, getSets, updateAccount } from "@/lib/api";
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
        {/* Goals Section */}
        <Card>
    try {
      const raw = localStorage.getItem("user:monthlyGoal");
              <Target className="h-5 w-5 text-primary" />
              Fitness Goals
    } catch {
      return 16;
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
    }
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
                            heightUnit: e.target.value === "inch" ? "inch" : "cm",
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
                  <Input
                    id="detail-goals"
                    type="text"
                    value={
                      onboardingInfo.goals.length
                        ? onboardingInfo.goals.join(", ")
                        : ""
                    }
                    placeholder="e.g. Build muscle, Get stronger"
                    onChange={(e) =>
                      setOnboardingInfo((prev) => {
                        const base = prev ?? DEFAULT_ONBOARDING;
                        const goals = e.target.value
                          .split(",")
                          .map((g) => g.trim())
                          .filter(Boolean);
                        return { ...base, goals };
                      })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Separate multiple goals with commas.
                  </p>
                </div>
                <div className="sm:col-span-2 flex justify-end mt-2">
                  <Button size="sm" onClick={handleSaveDetails}>
                    Save Details
                  </Button>
                </div>
              </div>
            ) : (
        })
      );
      try {
        toast({
          title: "Profile saved",
          description: "Your changes were saved.",
        });
      } catch (e) {}
    } catch {}
  };

  const { toast } = useToast();

  // show confirmation when profile is saved
  useEffect(() => {
    // noop
  }, []);

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
        setProfileInfo({
          name,
          email,
        });
        setAccountEmail(email);
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

  const handleUpdateAccount = async () => {
    if (!currentPassword) {
      toast({
        title: "Current password required",
        description: "Enter your current password to update account settings.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      toast({
        title: "Passwords do not match",
        description: "New password and confirmation must match.",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await updateAccount({
        email: accountEmail || undefined,
        currentPassword,
        newPassword: newPassword || undefined,
      });

      const updatedEmail = result.email || accountEmail;

      setProfileInfo((prev) => ({
        ...prev,
        email: updatedEmail,
      }));

      try {
        localStorage.setItem(
          "user:profile",
          JSON.stringify({
            name: profileInfo.name,
            email: updatedEmail,
          })
        );
      } catch {}

      toast({
        title: "Account updated",
        description: "Your login details were updated.",
      });

      setShowAccountSettings(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e: any) {
      toast({
        title: "Update failed",
        description: e?.message || "Unable to update account settings.",
        variant: "destructive",
      });
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Profile</h1>
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

              <div className="mt-4 flex items-center justify-between gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowAccountSettings((v) => !v)}
                >
                  Account Settings
                </Button>
                <div className="flex gap-2">
                  <Button onClick={handleSaveProfile}>Save Changes</Button>
                  <Button variant="destructive" onClick={handleSignOut}>
                    Sign Out
                  </Button>
                </div>
              </div>

              {showAccountSettings && (
                <div className="mt-6 rounded-lg border border-border bg-secondary/40 p-4 space-y-4">
                  <h3 className="text-sm font-semibold text-white">
                    Account Settings
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Update your login email and password. You'll use these
                    next time you sign in.
                  </p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="account-email">Login Email</Label>
                      <Input
                        id="account-email"
                        type="email"
                        value={accountEmail}
                        onChange={(e) => setAccountEmail(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="current-password">
                        Current Password
                      </Label>
                      <Input
                        id="current-password"
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-password">New Password</Label>
                      <Input
                        id="new-password"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        minLength={6}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">
                        Confirm New Password
                      </Label>
                      <Input
                        id="confirm-password"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        minLength={6}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={handleUpdateAccount}>Update Account</Button>
                  </div>
                </div>
              )}
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
                    <p className="text-lg font-semibold">{memberSinceLabel}</p>
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
                  <Input
                    id="detail-goals"
                    type="text"
                    value={
                      onboardingInfo.goals.length
                        ? onboardingInfo.goals.join(", ")
                        : ""
                    }
                    placeholder="e.g. Build muscle, Get stronger"
                    onChange={(e) =>
                      setOnboardingInfo((prev) => {
                        const base = prev ?? DEFAULT_ONBOARDING;
                        const goals = e.target.value
                          .split(",")
                          .map((g) => g.trim())
                          .filter(Boolean);
                        return { ...base, goals };
                      })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Separate multiple goals with commas.
                  </p>
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
