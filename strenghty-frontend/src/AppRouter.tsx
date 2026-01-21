import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/auth/google/redirect" element={<GoogleRedirect />} />
            <Route path="/auth/forgot-password" element={<ForgotPassword />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/exercises" element={<Exercises />} />
            <Route path="/workouts" element={<Workouts />} />
            <Route path="/workouts/new" element={<NewWorkout />} />
            <Route path="/workouts/preview" element={<WorkoutPreview />} />
            <Route path="/workouts/complete" element={<WorkoutComplete />} />
            <Route path="/workouts/:id/view" element={<ViewWorkout />} />
            <Route path="/workouts/:id/edit" element={<EditWorkout />} />
            <Route
              path="/exercises/:id/history"
              element={<ExerciseHistory />}
            />
            <Route path="/routines" element={<Routines />} />
            <Route path="/routines/explore" element={<ExploreRoutines />} />
            <Route path="/routines/:id/view" element={<ViewRoutine />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/profile/account" element={<AccountSettings />} />
            <Route path="/settings" element={<Settings />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </div>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
