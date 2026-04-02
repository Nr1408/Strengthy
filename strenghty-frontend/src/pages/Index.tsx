import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";
import { getToken } from "@/lib/api";
import { StrengthyWordmark } from "@/components/layout/StrengthyWordmark";
import { AuthStep } from "../AuthStep";
import { HeroStep } from "../../HeroSection";
import { WhySectionContent } from "../../WhySection";
import { ProofStep } from "../../ProofSection";

type AuthIntent = "login" | "signup";

const stepLabels = ["Hero", "Why", "Differentiators", "Proof", "Auth"] as const;
const TOTAL_STEPS = stepLabels.length;

const differentiators = [
  "Designed for strength training",
  "Readable progress, not noisy charts",
  "Fast logging, zero friction",
  "Built for lifters, not content",
];

export default function Index() {
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();
  const [step, setStep] = useState(0);
  const [authIntent] = useState<AuthIntent>("signup");

  const stepVariants = {
    enter: prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 12 },
    center: {
      opacity: 1,
      y: 0,
      transition: {
        duration: prefersReducedMotion ? 0.14 : 0.22,
        ease: [0.2, 0.0, 0.2, 1],
      },
    },
    exit: {
      opacity: 0,
      y: prefersReducedMotion ? 0 : -12,
      transition: {
        duration: prefersReducedMotion ? 0.1 : 0.18,
        ease: [0.4, 0.0, 1, 1],
      },
    },
  } as const;

  useEffect(() => {
    try {
      if (getToken()) {
        navigate("/dashboard", { replace: true });
      }
    } catch {
      // ignore invalid storage state
    }
  }, [navigate]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const goToStep = (next: number) => {
    setStep(Math.max(0, Math.min(4, next)));
  };

  const renderStepPager = (className = "") => (
    <div
      className={`flex items-center justify-center gap-1.5 ${className}`.trim()}
    >
      {Array.from({ length: TOTAL_STEPS }).map((_, index) => (
        <button
          key={index}
          type="button"
          onClick={() => goToStep(index)}
          className={`h-1.5 rounded-full transition-all duration-250 ${
            index === step
              ? "w-6 bg-primary"
              : "w-1.5 bg-muted-foreground/55 hover:bg-muted-foreground/75"
          }`}
          aria-label={`Go to ${stepLabels[index]} section`}
          aria-current={index === step}
        />
      ))}
    </div>
  );

  return (
    <div className="relative bg-background flex h-[100svh] min-h-[100svh] flex-col overflow-hidden">
      {/* Header */}
      <header className="border-b border-border pointer-events-auto">
        <div className="flex h-16 items-center justify-between px-4">
          <StrengthyWordmark />
        </div>
      </header>

      {/* Main: fixed-height, no-scroll step stack; page-level scrolling disabled */}
      <main className="relative flex-1 overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          {step === 0 && (
            <motion.section
              key="step-0"
              aria-label="Hero"
              className="absolute inset-0 transform-gpu overflow-hidden"
              style={{ willChange: "transform, opacity" }}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
            >
              <div className="flex h-full flex-col overflow-hidden">
                <div className="pt-3">{renderStepPager()}</div>
                <div className="flex flex-1 items-center justify-center overflow-hidden">
                  <HeroStep onNext={() => goToStep(1)} />
                </div>
              </div>
            </motion.section>
          )}

          {step === 1 && (
            <motion.section
              key="step-1"
              aria-label="Why Strengthy"
              className="absolute inset-0 transform-gpu overflow-hidden"
              style={{ willChange: "transform, opacity" }}
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
                stepPager={renderStepPager()}
              />
            </motion.section>
          )}

          {step === 2 && (
            <motion.section
              key="step-2"
              aria-label="Differentiators"
              className="absolute inset-0 transform-gpu overflow-hidden"
              style={{ willChange: "transform, opacity" }}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
            >
              <div className="flex h-full flex-col overflow-hidden">
                <div className="pt-3">{renderStepPager()}</div>
                <section className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6">
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
                        <button
                          type="button"
                          onClick={() => goToStep(3)}
                          className="w-full py-3 rounded-xl bg-orange-500 text-white font-bold text-sm hover:bg-orange-600 transition-colors"
                        >
                          See how it works
                        </button>
                      </div>
                    </div>

                    <p className="mt-5 text-center text-xs text-muted-foreground">
                      Your training log stays private and focused.
                    </p>
                  </div>
                </section>
              </div>
            </motion.section>
          )}

          {step === 3 && (
            <motion.section
              key="step-3"
              aria-label="Proof"
              className="absolute inset-0 transform-gpu overflow-hidden"
              style={{ willChange: "transform, opacity" }}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
            >
              <div className="flex h-full flex-col overflow-hidden">
                <div className="pt-3">{renderStepPager()}</div>
                <div className="flex flex-1 items-center justify-center overflow-hidden">
                  <ProofStep onNext={() => goToStep(4)} />
                </div>
              </div>
            </motion.section>
          )}

          {step === 4 && (
            <motion.section
              key="step-4"
              aria-label="Auth"
              className="absolute inset-0 transform-gpu overflow-hidden"
              style={{ willChange: "transform, opacity" }}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
            >
              <div className="flex h-full flex-col overflow-hidden">
                <div className="pt-3">{renderStepPager()}</div>
                <div className="flex flex-1 items-center justify-center overflow-hidden">
                  <AuthStep defaultSignup={authIntent === "signup"} />
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
