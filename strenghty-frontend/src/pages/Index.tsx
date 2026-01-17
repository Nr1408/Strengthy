// DashboardMock available at /pages/DashboardMock.tsx for preview
import { Link, useNavigate } from "react-router-dom";
import {
  Dumbbell,
  Trophy,
  Calendar,
  FolderOpen,
  ArrowRight,
  Check,
  TrendingUp,
  Flame,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import { getToken } from "@/lib/api";

const features = [
  {
    icon: Dumbbell,
    title: "Exercise Library",
    description:
      "Create and manage your own exercises with muscle groups and descriptions.",
  },
  {
    icon: Calendar,
    title: "Workout Logging",
    description:
      "Track every workout session with detailed sets, reps, and weights.",
  },
  {
    icon: Trophy,
    title: "PR Tracking",
    description:
      "Mark and celebrate your personal records as you get stronger.",
  },
  {
    icon: FolderOpen,
    title: "Routines",
    description: "Build reusable workout templates like Push, Pull, and Legs.",
  },
];

const benefits = [
  "Track every set, rep, and weight",
  "Never forget a personal record",
  "Create custom workout routines",
  "View your progress over time",
  "Clean, distraction-free interface",
];

export default function Index() {
  const navigate = useNavigate();

  useEffect(() => {
    try {
      if (getToken()) {
        navigate("/dashboard", { replace: true });
        return;
      }
    } catch {
      // ignore invalid storage state
    }
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg">
              <img
                src="/icons/logo.png"
                alt="Strengthy logo"
                className="h-9 w-9 rounded-lg"
              />
            </div>
            <span className="font-heading text-xl font-bold text-white">
              Strengthy
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/auth">
              <Button variant="ghost" className="text-white">
                Log in
              </Button>
            </Link>
            <Link to="/auth?signup=true">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-border py-20 md:py-32">
        <div className="container relative z-10">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="font-heading text-4xl font-bold tracking-tight md:text-6xl text-white">
              Track your lifts.
              <br />
              <span className="text-gradient">Hit new PRs.</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground md:text-xl">
              A clean, minimal workout tracker focused on what matters: logging
              workouts, tracking progress, and breaking personal records.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link to="/auth?signup=true">
                <Button size="lg" className="w-full sm:w-auto">
                  Start Tracking Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/auth">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto text-white"
                >
                  Log in to Your Account
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Background decoration */}
        <div className="absolute -right-40 -top-40 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-heading text-3xl font-bold md:text-4xl text-white">
              Everything you need to get stronger
            </h2>
            <p className="mt-4 text-muted-foreground">
              Simple tools to track your workouts without the bloat.
            </p>
          </div>

          <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="group rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/50 hover:shadow-lg"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-4 font-heading text-lg font-semibold text-white">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="border-y border-border bg-muted/30 py-20">
        <div className="container">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 className="font-heading text-3xl font-bold md:text-4xl text-white">
                Built for lifters who just want to lift
              </h2>
              <p className="mt-4 text-muted-foreground">
                No social feeds, no complicated analytics, no subscription
                tiers. Just a straightforward way to log your workouts and see
                your progress.
              </p>
              <ul className="mt-8 space-y-4">
                {benefits.map((benefit) => (
                  <li key={benefit} className="flex items-center gap-3">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Check className="h-4 w-4" />
                    </div>
                    <span className="text-white">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative">
              {/* Mock App UI */}
              <div className="aspect-video overflow-hidden rounded-xl border border-border bg-gradient-to-br from-card via-card to-secondary/30 shadow-2xl p-4">
                {/* Mock Header */}
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-primary" />
                    <div className="h-2 w-16 rounded bg-muted" />
                  </div>
                  <div className="flex gap-1">
                    <div className="h-2 w-2 rounded-full bg-muted" />
                    <div className="h-2 w-2 rounded-full bg-muted" />
                    <div className="h-2 w-2 rounded-full bg-muted" />
                  </div>
                </div>

                {/* Mock Stats Row */}
                <div className="mb-4 grid grid-cols-3 gap-2">
                  <div className="rounded-lg bg-secondary/50 p-2">
                    <div className="mb-1 flex items-center gap-1">
                      <Flame className="h-3 w-3 text-orange-500" />
                      <span className="text-[10px] text-muted-foreground">
                        Streak
                      </span>
                    </div>
                    <p className="font-heading text-sm font-bold">12 days</p>
                  </div>
                  <div className="rounded-lg bg-secondary/50 p-2">
                    <div className="mb-1 flex items-center gap-1">
                      <TrendingUp className="h-3 w-3 text-primary" />
                      <span className="text-[10px] text-muted-foreground">
                        This Week
                      </span>
                    </div>
                    <p className="font-heading text-sm font-bold">5 workouts</p>
                  </div>
                  <div className="rounded-lg bg-secondary/50 p-2">
                    <div className="mb-1 flex items-center gap-1">
                      <Trophy className="h-3 w-3 text-yellow-500" />
                      <span className="text-[10px] text-muted-foreground">
                        PRs
                      </span>
                    </div>
                    <p className="font-heading text-sm font-bold">3 new</p>
                  </div>
                </div>

                {/* Mock Workout List */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 rounded-lg bg-secondary/30 p-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded bg-primary/20">
                      <Dumbbell className="h-3 w-3 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="mb-1 h-2 w-20 rounded bg-foreground/20" />
                      <div className="h-1.5 w-12 rounded bg-muted" />
                    </div>
                    <div className="h-4 w-4 rounded-full bg-primary/20" />
                  </div>
                  <div className="flex items-center gap-2 rounded-lg bg-secondary/30 p-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded bg-primary/20">
                      <Dumbbell className="h-3 w-3 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="mb-1 h-2 w-24 rounded bg-foreground/20" />
                      <div className="h-1.5 w-16 rounded bg-muted" />
                    </div>
                    <div className="h-4 w-4 rounded-full bg-primary/20" />
                  </div>
                </div>
              </div>

              {/* Floating PR Card */}
              <div className="absolute -bottom-4 -right-4 animate-float rounded-lg border border-border bg-card/95 backdrop-blur-sm p-4 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 shadow-lg shadow-orange-500/30">
                    <Trophy className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">New PR!</p>
                    <p className="font-heading font-semibold">
                      Bench Press: 225 lbs
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-heading text-3xl font-bold md:text-4xl text-white">
              Ready to get stronger?
            </h2>
            <p className="mt-4 text-muted-foreground">
              Start tracking your workouts today. It's free, forever.
            </p>
            <div className="mt-8">
              <Link to="/auth?signup=true">
                <Button size="lg">
                  Create Your Account
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container flex flex-col items-center justify-between gap-4 md:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Dumbbell className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-heading font-bold text-white">Strenghty</span>
          </div>
          <p className="text-sm text-white">Built for lifters, by lifters.</p>
        </div>
      </footer>
    </div>
  );
}
