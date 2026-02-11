import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
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

const AnimatedRoutes = () => {
  const location = useLocation();

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
