import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { deleteWorkout } from "@/lib/api";
import {
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

  // When navigating away from NewWorkout while a workout is in progress,
  // mark it paused and show a small dialog.
  useEffect(() => {
    try {
      const inProg = localStorage.getItem("workout:inProgress");
      const paused = localStorage.getItem("workout:paused");
      const isOnNewWorkout = location.pathname === "/workouts/new";
      if (inProg && !isOnNewWorkout) {
        // Ensure we persist a paused flag and show the paused dialog whenever
        // the user navigates away from the active workout page.
        try {
          localStorage.setItem("workout:paused", "1");
        } catch (e) {}
        setShowPausedDialog(true);
      } else if (isOnNewWorkout) {
        // clear paused dialog when on the new workout page
        localStorage.removeItem("workout:paused");
        setShowPausedDialog(false);
      }
    } catch (e) {
      // ignore
    }
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Top status bar shelf (minimal height) */}
      <div
        className="fixed top-0 left-0 w-full z-[100] h-px"
        style={{ backgroundColor: "#0E1115" }}
      />
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container relative h-16 flex items-center justify-center">
          <Link
            to="/dashboard"
            className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2"
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
          </Link>

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

          {!(
            location.pathname === "/workouts/new" ||
            location.pathname.startsWith("/routines/")
          ) && (
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

      {/* Mobile Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background md:hidden">
        <div className="flex items-center justify-around py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-lg px-4 py-2 text-xs font-medium transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Main Content */}
      <main className="w-full max-w-screen-lg mx-auto px-3 pb-24 pt-[50px] md:pb-6">
        {children}
      </main>
      {/* Paused workout small dialog (top) */}
      {showPausedDialog && (
        <div className="fixed left-1/2 top-16 z-50 -translate-x-1/2 w-[min(640px,75%)]">
          <div className="rounded-lg border border-border bg-neutral-900/95 p-4 shadow-lg">
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
        </div>
      )}

      {/* Discard confirmation dialog */}
      {showDiscardConfirm && (
        <div className="fixed left-1/2 top-1/3 z-[9999] -translate-x-1/2 w-[min(520px,90%)]">
          <div className="rounded-lg border border-border bg-neutral-900 p-6 shadow-lg">
            <div className="mb-4 text-center text-lg font-semibold text-white">
              Discard Workout?
            </div>
            <div className="text-sm text-muted-foreground mb-4 text-center">
              Are you sure you want to discard this in-progress workout? This
              cannot be undone.
            </div>
            <div className="flex items-center justify-center gap-6">
              <button
                className="px-4 py-2 rounded bg-red-600 text-white"
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
                className="px-4 py-2 rounded border border-border text-white bg-transparent"
                onClick={() => setShowDiscardConfirm(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
