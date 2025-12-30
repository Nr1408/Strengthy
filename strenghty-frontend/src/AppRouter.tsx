import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Onboarding from "./pages/Onboarding";
import Exercises from "./pages/Exercises";
import Workouts from "./pages/Workouts";
import Routines from "./pages/Routines";
import ViewRoutine from "./pages/ViewRoutine";
import Profile from "./pages/Profile";
import ExploreRoutines from "./pages/ExploreRoutines";
import NewWorkout from "./pages/NewWorkout";
import EditWorkout from "./pages/EditWorkout";
import ViewWorkout from "./pages/ViewWorkout";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <div className="dark">
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/exercises" element={<Exercises />} />
            <Route path="/workouts" element={<Workouts />} />
            <Route path="/workouts/new" element={<NewWorkout />} />
            <Route path="/workouts/:id/view" element={<ViewWorkout />} />
            <Route path="/workouts/:id/edit" element={<EditWorkout />} />
            <Route path="/routines" element={<Routines />} />
            <Route path="/routines/explore" element={<ExploreRoutines />} />
            <Route path="/routines/:id/view" element={<ViewRoutine />} />
            <Route path="/profile" element={<Profile />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </div>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
