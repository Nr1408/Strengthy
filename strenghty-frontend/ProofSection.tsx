import { Trophy, TrendingUp, Calendar, Flame, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const stats = [
  {
    icon: TrendingUp,
    label: "Total Volume",
    value: "142,300 lbs",
    change: "+12%",
  },
  { icon: Calendar, label: "Workouts", value: "48", change: "this month" },
  { icon: Flame, label: "Streak", value: "14 days", change: "on fire" },
  { icon: Trophy, label: "New PRs", value: "6", change: "this week" },
];

const stepStats = [
  { icon: TrendingUp, label: "Volume", value: "142,300 lbs", sub: "+12%" },
  { icon: Calendar, label: "Workouts", value: "48", sub: "this month" },
  { icon: Flame, label: "Streak", value: "14 days", sub: "on fire" },
  { icon: Trophy, label: "New PRs", value: "6", sub: "this week" },
];

type ProofStepProps = {
  onNext: () => void;
};

export function ProofStep({ onNext }: ProofStepProps) {
  return (
    <div className="flex flex-col items-center justify-center px-6 pt-10 -translate-y-6 scale-110 sm:pt-0 md:translate-y-0 md:scale-100">
      <h2 className="font-heading text-2xl font-bold md:text-3xl text-center text-white">
        See it in action
      </h2>

      {/* Mock dashboard card */}
      <div className="relative mt-8 w-full max-w-sm">
        {/* Background glow */}
        <div className="pointer-events-none absolute inset-0 -m-8 rounded-full bg-primary/5 blur-[60px]" />

        <div className="relative rounded-2xl border border-border bg-card p-4 shadow-2xl shadow-primary/5">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-heading text-xs font-semibold text-white">
              Weekly Overview
            </span>
            <span className="text-[10px] text-muted-foreground">Feb 2–8</span>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {stepStats.map(({ icon: Icon, label, value, sub }) => (
              <div key={label} className="rounded-xl bg-secondary/40 p-3">
                <div className="flex items-center gap-1.5">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Icon className="h-3 w-3" />
                  </div>
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {label}
                  </span>
                </div>
                <p className="mt-1.5 font-heading text-base font-medium text-white">
                  {value}
                </p>
                <p className="text-[10px] text-primary">{sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* PR toast */}
        <div className="absolute -bottom-4 -right-2 rounded-xl border border-border bg-card p-2.5 shadow-lg md:-right-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent shadow-md">
              <Trophy className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <div>
              <p className="text-[9px] text-muted-foreground">New PR!</p>
              <p className="font-heading text-xs font-semibold text-white">
                Bench: 225 lbs
              </p>
            </div>
          </div>
        </div>
      </div>

      <Button size="sm" className="mt-10 px-4 text-xs" onClick={onNext}>
        Create your account
        <ArrowRight className="ml-2 h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

export default function ProofSection() {
  return (
    <section className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden px-6">
      {/* Background glow */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/6 blur-[80px]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 text-center"
      >
        <h2 className="font-heading text-3xl font-bold md:text-4xl">
          See it in action
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Your dashboard, always up to date.
        </p>
      </motion.div>

      {/* Mock stats card */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.6, delay: 0.15 }}
        className="relative z-10 mt-10 w-full max-w-md"
      >
        <div className="rounded-2xl border border-border bg-card p-5 shadow-2xl shadow-primary/5">
          <div className="mb-4 flex items-center justify-between">
            <span className="font-heading text-sm font-semibold">
              Weekly Overview
            </span>
            <span className="text-xs text-muted-foreground">Feb 2–8</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {stats.map(({ icon: Icon, label, value, change }) => (
              <div key={label} className="rounded-xl bg-secondary/40 p-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {label}
                  </span>
                </div>
                <p className="mt-2 font-heading text-lg font-medium text-white">
                  {value}
                </p>
                <p className="text-[10px] text-primary">{change}</p>
              </div>
            ))}
          </div>
        </div>

        {/* PR toast overlay */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="absolute -bottom-5 -right-3 rounded-xl border border-border bg-card p-3 shadow-lg md:-right-8"
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent shadow-md">
              <Trophy className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">New PR!</p>
              <p className="font-heading text-sm font-semibold text-white">
                Bench Press: 225 lbs
              </p>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Caption */}
      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 0.6 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.6 }}
        className="relative z-10 mt-12 max-w-xs text-center text-xs text-muted-foreground"
      >
        Everything updates automatically as you log sets.
      </motion.p>
    </section>
  );
}
