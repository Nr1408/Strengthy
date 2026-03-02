import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import ScrollManager from "@/components/layout/ScrollManager";
import SwipeNavigator from "@/components/layout/SwipeNavigator";
import BackButtonHandler from "@/components/layout/BackButtonHandler";
import WorkoutNotificationHandler from "@/components/layout/WorkoutNotificationHandler";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/Dashboard";
import Onboarding from "./pages/Onboarding";
import Exercises from "./pages/Exercises";
import Workouts from "./pages/Workouts";
import Routines from "./pages/Routines";
import ViewRoutine from "./pages/ViewRoutine";
import Profile from "./pages/ProfilePage";
import AccountSettings from "./pages/AccountSettings";
import ExploreRoutines from "./pages/ExploreRoutines";
import NewWorkout from "./pages/NewWorkout";
import WorkoutPreview from "./pages/WorkoutPreview";
import WorkoutComplete from "./pages/WorkoutComplete";
import EditWorkout from "./pages/EditWorkout";
import ViewWorkout from "./pages/ViewWorkout";
import ExerciseHistory from "./pages/ExerciseHistory";
import NotFound from "./pages/NotFound";
import Settings from "./pages/Settings";
import GoogleRedirect from "./pages/GoogleRedirect";

const queryClient = new QueryClient();

const PageTransition = ({
  children,
  noVerticalShift,
}: {
  children: React.ReactNode;
  noVerticalShift?: boolean;
}) => (
  <motion.div
    className="h-full"
    initial={{
      opacity: 0,
      y: noVerticalShift ? 0 : 20,
      scale: noVerticalShift ? 1 : 0.98,
    }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{
      opacity: 0,
      y: noVerticalShift ? 0 : -20,
      scale: noVerticalShift ? 1 : 0.96,
    }}
    transition={{ duration: 0.25, ease: "easeOut" }}
  >
    {children}
  </motion.div>
);

const authFlowVariants = {
  enter: { opacity: 0, y: 24 },
  center: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.28,
      ease: [0.25, 0.1, 0.25, 1],
    },
  },
  exit: {
    opacity: 0,
    y: -24,
    transition: {
      duration: 0.25,
      ease: [0.25, 0.1, 0.25, 1],
    },
  },
} as const;

const AuthFlowTransition = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    className="h-full"
    variants={authFlowVariants}
    initial="enter"
    animate="center"
    exit="exit"
  >
    {children}
  </motion.div>
);

const OAuthPopupBridge = () => {
  useEffect(() => {
    const emitAndClose = () => {
      try {
        const hash = new URLSearchParams(
          window.location.hash.replace(/^#/, ""),
        );
        const accessToken = hash.get("access_token");
        const idToken = hash.get("id_token");

        if (accessToken) {
          try {
            if (window.opener) {
              window.opener.postMessage(
                {
                  type: "supabase-oauth-result",
                  accessToken,
                  idToken: idToken || null,
                },
                window.location.origin,
              );
            }
          } catch {}

          try {
            localStorage.setItem(
              "supabase:oauth_result",
              JSON.stringify({ accessToken, idToken: idToken || null }),
            );
          } catch {}

          try {
            const ch = new BroadcastChannel("supabase_oauth");
            ch.postMessage({
              type: "supabase-oauth-result",
              accessToken,
              idToken: idToken || null,
            });
            ch.close();
          } catch {}
        }
      } catch {}

      try {
        window.close();
      } catch {}
    };

    emitAndClose();
    const timer = setInterval(emitAndClose, 250);
    const stop = setTimeout(() => clearInterval(timer), 4000);
    return () => {
      clearInterval(timer);
      clearTimeout(stop);
    };
  }, []);

  return (
    <div className="h-screen flex items-center justify-center text-white">
      Finishing sign-in…
    </div>
  );
};

const AnimatedRoutes = () => {
  const location = useLocation();
  const isOAuthPopup = (() => {
    if (typeof window === "undefined") return false;
    try {
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const hasAccessToken = !!hash.get("access_token");
      const markedPopup = window.sessionStorage?.getItem("supabase_oauth_popup") === "1";
      return (
        window.name === "supabase_google_oauth" ||
        !!window.opener ||
        markedPopup ||
        hasAccessToken
      );
    } catch {
      return window.name === "supabase_google_oauth" || !!window.opener;
    }
  })();

  if (isOAuthPopup) {
    return <OAuthPopupBridge />;
  }

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route
          path="/"
          element={
            <PageTransition>
              <Index />
            </PageTransition>
          }
        />
        <Route
          path="/auth"
          element={
            <AuthFlowTransition>
              <Auth />
            </AuthFlowTransition>
          }
        />
        <Route
          path="/auth/google/redirect"
          element={
            <PageTransition>
              <GoogleRedirect />
            </PageTransition>
          }
        />
        <Route
          path="/auth/forgot-password"
          element={
            <AuthFlowTransition>
              <ForgotPassword />
            </AuthFlowTransition>
          }
        />
        <Route
          path="/onboarding"
          element={
            <PageTransition>
              <Onboarding />
            </PageTransition>
          }
        />
        <Route
          path="/dashboard"
          element={
            <PageTransition>
              <Dashboard />
            </PageTransition>
          }
        />
        <Route
          path="/exercises"
          element={
            <PageTransition>
              <Exercises />
            </PageTransition>
          }
        />
        <Route
          path="/workouts"
          element={
            <PageTransition>
              <Workouts />
            </PageTransition>
          }
        />
        <Route
          path="/workouts/new"
          element={
            <PageTransition noVerticalShift>
              <NewWorkout />
            </PageTransition>
          }
        />
        <Route
          path="/workouts/preview"
          element={
            <PageTransition>
              <WorkoutPreview />
            </PageTransition>
          }
        />
        <Route
          path="/workouts/complete"
          element={
            <PageTransition>
              <WorkoutComplete />
            </PageTransition>
          }
        />
        <Route
          path="/workouts/:id/view"
          element={
            <PageTransition>
              <ViewWorkout />
            </PageTransition>
          }
        />
        <Route
          path="/workouts/:id/edit"
          element={
            <PageTransition noVerticalShift>
              <EditWorkout />
            </PageTransition>
          }
        />
        <Route
          path="/exercises/:id/history"
          element={
            <PageTransition>
              <ExerciseHistory />
            </PageTransition>
          }
        />
        <Route
          path="/routines"
          element={
            <PageTransition>
              <Routines />
            </PageTransition>
          }
        />
        <Route
          path="/routines/explore"
          element={
            <PageTransition>
              <ExploreRoutines />
            </PageTransition>
          }
        />
        <Route
          path="/routines/:id/view"
          element={
            <PageTransition>
              <ViewRoutine />
            </PageTransition>
          }
        />
        <Route
          path="/profile"
          element={
            <PageTransition>
              <Profile />
            </PageTransition>
          }
        />
        <Route
          path="/profile/account"
          element={
            <PageTransition>
              <AccountSettings />
            </PageTransition>
          }
        />
        <Route
          path="/settings"
          element={
            <PageTransition>
              <Settings />
            </PageTransition>
          }
        />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route
          path="*"
          element={
            <PageTransition>
              <NotFound />
            </PageTransition>
          }
        />
      </Routes>
    </AnimatePresence>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <div className="dark">
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollManager />
          <SwipeNavigator />
          <BackButtonHandler />
          <WorkoutNotificationHandler />
          <AnimatedRoutes />
        </BrowserRouter>
      </div>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
