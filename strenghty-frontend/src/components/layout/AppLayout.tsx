import { deleteWorkout, getWorkouts } from "@/lib/api";
import { ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Dumbbell,
  Home,
  ListChecks,
  FolderOpen,
  User,
  LogOut,
  Settings as SettingsIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogPortal, DialogOverlay } from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";

interface AppLayoutProps {
  children: ReactNode;
}
const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/workouts", label: "Workouts", icon: ListChecks },
  { href: "/exercises", label: "Exercises", icon: Dumbbell },
  { href: "/routines", label: "Routines", icon: FolderOpen },
];

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [showPausedDialog, setShowPausedDialog] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const { toast } = useToast();

  const isWorkoutBuilderRoute =
    location.pathname === "/workouts/new" ||
    (location.pathname.startsWith("/workouts/") &&
      location.pathname.endsWith("/edit"));

  const isOnboardingRoutineView =
    !!(location.state as any)?.fromOnboarding &&
    location.pathname.startsWith("/routines/") &&
    location.pathname.endsWith("/view");

  const hideNav = isWorkoutBuilderRoute || isOnboardingRoutineView;

  // When navigating away from NewWorkout while a workout is in progress,
  // mark it paused and show a small dialog.
  useEffect(() => {
    try {
      const inProg = localStorage.getItem("workout:inProgress");
      const paused = localStorage.getItem("workout:paused");
      const isOnNewWorkout = location.pathname === "/workouts/new";
      // Suppress the dialog when on ExerciseInfo opened from the picker
      const isPickerExerciseInfo =
        location.pathname.includes("/exercises/") &&
        location.pathname.endsWith("/info") &&
        (location.state as any)?.fromPicker === true;
      if (inProg && !isOnNewWorkout && !isPickerExerciseInfo) {
        // Ensure we persist a paused flag and show the paused dialog whenever
        // the user navigates away from the active workout page.
        try {
          localStorage.setItem("workout:paused", "1");
        } catch (e) {}
        setShowPausedDialog(true);
      } else if (isOnNewWorkout || isPickerExerciseInfo) {
        // clear paused dialog when on the new workout page or picker exercise info
        if (isOnNewWorkout) localStorage.removeItem("workout:paused");
        setShowPausedDialog(false);
      }
    } catch (e) {
      // ignore
    }
  }, [location.pathname, location.state]);

  // On app start, check backend for workouts and set localStorage flag if any exist
  useEffect(() => {
    async function syncFirstWorkoutFlag() {
      try {
        const workouts = await getWorkouts();
        if (workouts && workouts.length > 0) {
          localStorage.setItem("user:firstWorkoutCompleted", "1");
        }
      } catch (e) {
        // ignore errors
      }
    }
    syncFirstWorkoutFlag();
  }, []);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden isolate">
      {/* Top status bar shelf (minimal height) */}
      <div
        className="fixed top-0 left-0 w-full z-[100] h-px"
        style={{ backgroundColor: "#0E1115" }}
      />
      {/* Header (hidden on NewWorkout/EditWorkout where a custom bar is used) */}
      {!hideNav && (
        <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="w-full px-3 md:max-w-7xl md:mx-auto md:px-6 relative h-16 flex items-center justify-center">
            <div
              className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2"
              role="presentation"
              aria-hidden="true"
              tabIndex={-1}
            >
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

            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-secondary text-foreground"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {!location.pathname.startsWith("/routines/") && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <Link
                  to="/settings"
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  <SettingsIcon className="h-5 w-5" />
                </Link>
                <Link
                  to="/profile"
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  <User className="h-5 w-5" />
                </Link>
                {/* Sign out moved to Profile page */}
              </div>
            )}
          </div>
        </header>
      )}

      {/* Mobile Navigation */}
      {!hideNav && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background rounded-t-2xl md:hidden">
          <div className="flex items-center justify-around py-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              const firstWorkoutDone = !!localStorage.getItem(
                "user:firstWorkoutCompleted",
              );
              const isWorkoutsLocked =
                item.href === "/workouts" && !firstWorkoutDone;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-lg px-4 py-2 text-xs font-medium transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground",
                    isWorkoutsLocked && "pointer-events-none opacity-40",
                  )}
                  aria-disabled={isWorkoutsLocked || undefined}
                  tabIndex={isWorkoutsLocked ? -1 : undefined}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      )}

      {/* Main Content */}
      <main
        className={cn(
          "w-full px-3 md:max-w-7xl md:mx-auto md:px-6 pb-24 md:pb-6",
          hideNav ? "pt-0" : "pt-[50px]",
        )}
      >
        {children}
      </main>
      {/* Paused workout small dialog (top) */}
      {showPausedDialog &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed left-1/2 top-16 z-50 -translate-x-1/2 w-[min(640px,75%)]">
            <div className="rounded-2xl border border-white/5 bg-neutral-900/95 p-4 shadow-lg">
              <div className="mb-1 text-center text-lg font-semibold text-muted-foreground">
                Workout in Progress
              </div>
              <div className="flex items-center justify-center gap-6">
                <button
                  className="flex items-center gap-2 text-blue-400 hover:underline"
                  onClick={() => {
                    try {
                      const raw = localStorage.getItem("workout:inProgress");
                      if (raw) {
                        const obj = JSON.parse(raw);
                        localStorage.setItem("workout:resumeRequested", "1");
                        localStorage.removeItem("workout:paused");
                        setShowPausedDialog(false);
                        // Navigate to NewWorkout to restore state
                        if (obj && obj.id) {
                          navigate(`/workouts/new`);
                          return;
                        }
                      }
                    } catch (e) {}
                    setShowPausedDialog(false);
                    navigate("/workouts/new");
                  }}
                >
                  <span className="text-2xl">▶</span>
                  <span className="font-medium">Resume</span>
                </button>

                <button
                  className="flex items-center gap-2 text-red-400 hover:underline"
                  onClick={() => setShowDiscardConfirm(true)}
                >
                  <span className="text-2xl">✕</span>
                  <span className="font-medium">Discard</span>
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* Discard confirmation dialog */}
      <Dialog open={showDiscardConfirm} onOpenChange={setShowDiscardConfirm}>
        <DialogPortal>
          <DialogOverlay className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-none [backdrop-filter:none]" />
          <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-[10000] -translate-x-1/2 -translate-y-1/2 w-[420px] max-w-[92vw] rounded-[18px] border border-white/10 bg-neutral-900/95 p-7 shadow-2xl">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-destructive/15 text-destructive">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <DialogPrimitive.Title className="mb-3 text-center text-lg font-semibold text-white">
              Discard Workout?
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="text-sm text-muted-foreground mb-6 text-center">
              Are you sure you want to discard this in-progress workout? This
              cannot be undone.
            </DialogPrimitive.Description>
            <div className="flex items-center justify-center gap-3">
              <button
                className="px-5 py-2.5 rounded-lg bg-red-600 text-white shadow-md shadow-red-600/20 hover:bg-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/60"
                onClick={async () => {
                  try {
                    const raw = localStorage.getItem("workout:inProgress");
                    if (raw) {
                      const obj = JSON.parse(raw);
                      if (obj && obj.id) {
                        try {
                          await deleteWorkout(String(obj.id));
                        } catch (e: any) {
                          // If server returned 401, show a friendly toast but
                          // do not force a navigation to login here.
                          if (e && (e as any).status === 401) {
                            toast({
                              title: "Not authorized",
                              description:
                                "Your session may have expired. Please sign in to complete this action.",
                              variant: "destructive",
                            });
                          } else {
                            toast({
                              title: "Delete failed",
                              description: String(e || ""),
                              variant: "destructive",
                            });
                          }
                        }
                      }
                      // remove saved state for this workout id
                      try {
                        localStorage.removeItem(`workout:state:${obj.id}`);
                      } catch (e) {}
                    }
                  } catch (e) {}
                  try {
                    localStorage.removeItem("workout:inProgress");
                    localStorage.removeItem("workout:paused");
                  } catch (e) {}
                  setShowDiscardConfirm(false);
                  setShowPausedDialog(false);
                }}
              >
                Discard
              </button>
              <button
                className="px-5 py-2.5 rounded-lg border border-white/10 text-white/90 bg-transparent hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
                onClick={() => setShowDiscardConfirm(false)}
              >
                Cancel
              </button>
            </div>
          </DialogPrimitive.Content>
        </DialogPortal>
      </Dialog>
    </div>
  );
}
