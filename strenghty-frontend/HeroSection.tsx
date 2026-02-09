import { Link } from "react-router-dom";
import { Dumbbell, Zap, Trophy, BarChart3, ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

const valueStrip = [
  { icon: Zap, label: "Log fast" },
  { icon: Trophy, label: "Auto PRs" },
  { icon: BarChart3, label: "Clean progress" },
];

const liftWords = ["Squats", "Deadlifts", "Bench", "Pull-ups", "OHP"] as const;

function LiftWordRotator() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % liftWords.length);
    }, 2000);

    return () => window.clearInterval(id);
  }, []);

  const word = liftWords[index];

  return (
    <span className="relative inline-block align-baseline">
      <span className="invisible block whitespace-nowrap font-heading font-bold text-primary">
        Deadlifts
      </span>
      <span className="absolute inset-0 flex items-center justify-center overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={word}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
            className="block whitespace-nowrap font-heading font-bold text-primary"
          >
            {word}
          </motion.span>
        </AnimatePresence>
      </span>
    </span>
  );
}

interface HeroStepProps {
  onNext: () => void;
}

export function HeroStep({ onNext }: HeroStepProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-6 -translate-y-8 scale-110 md:translate-y-0 md:scale-100">
      {/* Decorative glows */}
      <div className="pointer-events-none absolute -right-32 -top-32 h-72 w-72 rounded-full bg-primary/8 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-32 h-72 w-72 rounded-full bg-primary/8 blur-3xl" />

      <h1 className="font-heading text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl text-white">
        <span className="flex flex-wrap items-baseline justify-center gap-x-3 gap-y-1">
          <span>Track your</span>
          <LiftWordRotator />
        </span>
        <span className="bg-gradient-to-r from-blue-200/80 via-blue-100/70 to-blue-200/60 bg-clip-text text-transparent">
          Hit new PRs.
        </span>
      </h1>

      <p className="mx-auto mt-5 max-w-md text-base text-muted-foreground">
        A minimal workout tracker focused on lifting, not feeds.
      </p>

      <div className="mt-10 flex flex-col items-center gap-3">
        <Button size="lg" className="min-w-[200px]" onClick={onNext}>
          Start Tracking Free
        </Button>
        <button
          onClick={onNext}
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          Why Strenghty?
        </button>
      </div>
    </div>
  );
}

export default function HeroSection() {
  return (
    <section className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden px-6">
      {/* Background glows */}
      <div className="pointer-events-none absolute -right-32 -top-32 h-72 w-72 rounded-full bg-primary/8 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-32 h-72 w-72 rounded-full bg-primary/8 blur-3xl" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/5 blur-[100px]" />

      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8 flex items-center gap-2"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/25">
          <Dumbbell className="h-5 w-5 text-primary-foreground" />
        </div>
        <span className="font-heading text-xl font-bold">Strenghty</span>
      </motion.div>

      {/* Headline */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="text-center"
      >
        <h1 className="font-heading text-4xl font-bold tracking-tight md:text-6xl">
          Track your lifts.
          <br />
          <span className="bg-gradient-to-r from-blue-200/80 via-blue-100/70 to-blue-200/60 bg-clip-text text-transparent">
            Hit new PRs.
          </span>
        </h1>
        <p className="mx-auto mt-5 max-w-md text-base text-muted-foreground md:text-lg">
          A clean, minimal workout tracker focused on what matters: logging
          workouts, tracking progress, and breaking personal records.
        </p>
      </motion.div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="mt-8 flex flex-col items-center gap-3 sm:flex-row"
      >
        <Link to="/auth?signup=true">
          <Button size="lg" className="min-w-[180px]">
            Start Tracking Free
          </Button>
        </Link>
        <Link to="/auth">
          <Button variant="outline" size="lg" className="min-w-[180px]">
            Log In
          </Button>
        </Link>
      </motion.div>

      {/* Quick value strip */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.7 }}
        transition={{ duration: 0.6, delay: 0.5 }}
        className="mt-10 flex items-center gap-5"
      >
        {valueStrip.map(({ icon: Icon, label }) => (
          <div
            key={label}
            className="flex items-center gap-1.5 text-xs text-muted-foreground"
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{label}</span>
          </div>
        ))}
      </motion.div>

      {/* Scroll hint */}
      <motion.div
        className="absolute bottom-8 flex flex-col items-center gap-1"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.5 }}
        transition={{ delay: 1, duration: 0.6 }}
      >
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Scroll
        </span>
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </motion.div>
      </motion.div>
    </section>
  );
}
