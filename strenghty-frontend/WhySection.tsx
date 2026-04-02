import { Zap, Trophy, VolumeX, Dumbbell } from "lucide-react";
import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: Zap,
    title: "Log in seconds",
    description: "Tap, enter weight & reps, done. No friction.",
  },
  {
    icon: Trophy,
    title: "Automatic PR detection",
    description: "We track your bests so you never miss a milestone.",
  },
  {
    icon: VolumeX,
    title: "No social noise",
    description: "Zero feeds, zero likes. Just you and the iron.",
  },
  {
    icon: Dumbbell,
    title: "Designed for lifters",
    description: "Built around barbell, dumbbell, and bodyweight work.",
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.06 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: "easeOut" } },
} as const;

export default function WhySection() {
  return <WhySectionContent />;
}

type WhySectionProps = {
  mode?: "landing" | "step";
  onPrimaryAction?: () => void;
  primaryLabel?: string;
  trustLine?: string;
  stepPager?: ReactNode;
};

export function WhySectionContent({
  mode = "landing",
  onPrimaryAction,
  primaryLabel = "Continue",
  trustLine,
  stepPager,
}: WhySectionProps) {
  const isStep = mode === "step";
  const sectionSpacingClass = isStep ? "pt-3" : "pt-3 sm:pt-6";

  return (
    <section
      className={`relative flex flex-col items-center justify-start overflow-auto px-6 ${sectionSpacingClass} ${
        isStep ? "h-full min-h-0" : "min-h-screen"
      }`}
    >
      {/* Background glow to match ProofSection */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/6 blur-[80px] md:h-96 md:w-96 lg:h-[28rem] lg:w-[28rem]" />

      {stepPager && <div className="relative z-10 w-full">{stepPager}</div>}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="relative z-10 w-full max-w-lg text-center px-2 mt-3"
      >
        <h2 className="font-heading text-3xl font-bold md:text-4xl lg:text-5xl text-white whitespace-normal break-words leading-tight">
          Why Strengthy?
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Everything you need. Nothing you don't.
        </p>
      </motion.div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 mt-6 grid w-full max-w-lg md:max-w-xl lg:max-w-2xl grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 px-2"
      >
        {features.map(({ icon: Icon, title, description }) => (
          <motion.div
            key={title}
            variants={itemVariants}
            className="rounded-xl border border-border bg-secondary/30 p-4 md:p-5 backdrop-blur-sm transition-colors hover:border-primary/30"
          >
            <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="h-4.5 w-4.5" />
            </div>
            <h3 className="font-heading text-sm md:text-base font-semibold text-white">
              {title}
            </h3>
            <p className="mt-1 text-xs md:text-sm font-normal leading-relaxed text-muted-foreground">
              {description}
            </p>
          </motion.div>
        ))}
      </motion.div>

      {trustLine && (
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 0.75, y: 0 }}
          transition={{ duration: 0.2, ease: "easeOut", delay: 0.1 }}
          className="relative z-10 mt-5 text-center text-xs text-muted-foreground"
        >
          {trustLine}
        </motion.p>
      )}

      {isStep && (
        <div className="relative z-10 mt-3 mb-6 flex justify-center">
          <Button type="button" size="lg" onClick={onPrimaryAction}>
            {primaryLabel}
          </Button>
        </div>
      )}
    </section>
  );
}
