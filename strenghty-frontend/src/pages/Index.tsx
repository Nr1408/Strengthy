import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getToken } from "@/lib/api";
import Auth from "./Auth";
import { HeroStep } from "../../HeroSection";
import { WhySectionContent } from "../../WhySection";
import { ProofStep } from "../../ProofSection";

type AuthIntent = "login" | "signup";

const stepVariants = {
  enter: { opacity: 0, y: 24 },
  center: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.28, ease: "easeOut" },
  },
  exit: {
    opacity: 0,
    y: -24,
    transition: { duration: 0.28, ease: "easeOut" },
  },
} as const;

const stepLabels = ["Hero", "Why", "Differentiators", "Proof", "Auth"] as const;
const TOTAL_STEPS = stepLabels.length;

export default function Index() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [authIntent] = useState<AuthIntent>("signup");

  useEffect(() => {
    try {
      if (getToken()) {
        navigate("/dashboard", { replace: true });
      }
    } catch {
      // ignore invalid storage state
    }
  }, [navigate]);

  const goToStep = (next: number) => {
    setStep(Math.max(0, Math.min(4, next)));
  };

  const differentiators = useMemo(
    () => [
      "Designed for strength training",
      "Readable progress, not noisy charts",
      "Fast logging, zero friction",
      "Built for lifters, not content",
    ],
    [],
  );

  return (
    <div className="relative bg-background flex h-[100svh] min-h-[100svh] flex-col overflow-hidden">
      {/* Header (visible for steps 0–3; fades out on step 4) */}
      <motion.header
        className="border-b border-border pointer-events-auto"
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: "easeOut" }}
        aria-hidden={false}
      >
        <div
          className={`flex items-center justify-between px-4 ${
            step === 4 ? "h-20" : "h-16"
          }`}
        >
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
        </div>
      </motion.header>

      {/* Main: fixed-height, no-scroll step stack */}
      <main className="relative flex-1 overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          {step === 0 && (
            <motion.section
              key="step-0"
              aria-label="Hero"
              className="absolute inset-0 flex items-center justify-center"
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
            >
              <HeroStep onNext={() => goToStep(1)} />
            </motion.section>
          )}

          {step === 1 && (
            <motion.section
              key="step-1"
              aria-label="Why Strengthy"
              className="absolute inset-0"
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
            >
              <WhySectionContent
                mode="step"
                trustLine="No feeds · No subscriptions · Offline-first"
                primaryLabel="See what's different"
                onPrimaryAction={() => goToStep(2)}
              />
            </motion.section>
          )}

          {step === 2 && (
            <motion.section
              key="step-2"
              aria-label="Differentiators"
              className="absolute inset-0"
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
            >
              <section className="relative flex h-full flex-col items-center justify-center overflow-hidden px-6">
                <div className="pointer-events-none absolute -right-32 -top-32 h-72 w-72 rounded-full bg-primary/8 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-32 -left-32 h-72 w-72 rounded-full bg-primary/8 blur-3xl" />
                <div className="pointer-events-none absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/5 blur-[110px]" />

                <div className="relative z-10 w-full max-w-lg">
                  <div className="text-center">
                    <h2 className="font-heading text-3xl font-bold md:text-4xl text-white">
                      Built for lifting.
                    </h2>
                    <p className="mt-3 text-sm text-muted-foreground">
                      The simplest tracker that still feels serious.
                    </p>
                  </div>

                  <div className="mt-8 rounded-2xl border border-border bg-card/70 p-5 shadow-xl shadow-black/40">
                    <div className="space-y-3">
                      {differentiators.map((text) => (
                        <div key={text} className="flex items-center gap-3">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Check className="h-4 w-4" />
                          </div>
                          <p className="text-sm text-white/90 leading-snug">
                            {text}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 flex justify-center">
                      <Button
                        type="button"
                        size="lg"
                        variant="outline"
                        onClick={() => goToStep(3)}
                      >
                        See how it works
                      </Button>
                    </div>
                  </div>

                  <p className="mt-5 text-center text-xs text-muted-foreground">
                    Your training log stays private and focused.
                  </p>
                </div>
              </section>
            </motion.section>
          )}

          {step === 3 && (
            <motion.section
              key="step-3"
              aria-label="Proof"
              className="absolute inset-0 flex items-center justify-center"
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
            >
              <ProofStep onNext={() => goToStep(4)} />
            </motion.section>
          )}

          {step === 4 && (
            <motion.section
              key="step-4"
              aria-label="Auth"
              className="absolute inset-0"
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
            >
              <section className="relative flex h-full flex-col items-center justify-center overflow-hidden px-4">
                <div className="pointer-events-none absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/6 blur-[90px]" />
                <div className="w-full max-w-md">
                  <Auth embedded defaultSignup={authIntent === "signup"} />
                </div>
              </section>
            </motion.section>
          )}
        </AnimatePresence>

        <div className="relative z-20 flex items-center justify-center gap-1.5 py-3">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goToStep(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step
                  ? "w-6 bg-primary"
                  : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50"
              }`}
              aria-label={`Go to step ${i + 1}`}
              aria-current={i === step}
            />
          ))}
        </div>
      </main>
    </div>
  );
}