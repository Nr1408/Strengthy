import { Zap, Trophy, VolumeX, Dumbbell } from "lucide-react";
import { motion } from "framer-motion";
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
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45 } },
};

export default function WhySection() {
  return <WhySectionContent />;
}

type WhySectionProps = {
  mode?: "landing" | "step";
  onPrimaryAction?: () => void;
  primaryLabel?: string;
  trustLine?: string;
};

export function WhySectionContent({
  mode = "landing",
  onPrimaryAction,
  primaryLabel = "Continue",
  trustLine,
}: WhySectionProps) {
  const isStep = mode === "step";

  return (
    <section
      className={`relative flex flex-col items-center justify-center overflow-hidden px-6 ${
        isStep ? "h-full min-h-0 pt-10 sm:pt-0" : "min-h-[100svh]"
      }`}
    >
      {/* Background accent */}
      <div className="pointer-events-none absolute inset-0 bg-muted/30" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-lg text-center"
      >
        <h2 className="font-heading text-3xl font-bold md:text-4xl text-white">
          Why Strengthy?
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Everything you need. Nothing you don't.
        </p>
      </motion.div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        className="relative z-10 mt-10 grid w-full max-w-lg grid-cols-2 gap-3"
      >
        {features.map(({ icon: Icon, title, description }) => (
          <motion.div
            key={title}
            variants={itemVariants}
            className="rounded-xl border border-border bg-secondary/30 p-4 backdrop-blur-sm transition-colors hover:border-primary/30"
          >
            <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="h-4.5 w-4.5" />
            </div>
            <h3 className="font-heading text-sm font-semibold text-white">
              {title}
            </h3>
            <p className="mt-1 text-xs font-normal leading-relaxed text-muted-foreground">
              {description}
            </p>
          </motion.div>
        ))}
      </motion.div>

      {trustLine && (
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 0.75, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut", delay: 0.1 }}
          className="relative z-10 mt-5 text-center text-xs text-muted-foreground"
        >
          {trustLine}
        </motion.p>
      )}

      {isStep && (
        <div className="relative z-10 mt-8 flex justify-center">
          <Button type="button" size="lg" onClick={onPrimaryAction}>
            {primaryLabel}
          </Button>
        </div>
      )}
    </section>
  );
}
