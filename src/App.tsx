import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

/* MAIN HOME */
import HomeScreenPage from "./pages/HomeScreenPage";

/* LINE PLANNER MODULE */
import PlanHomePage from "./pages/LinePlanner/PlanHomePage";
import CreateLinePage from "./pages/LinePlanner/CreateLinePage";
import ViewLinesPage from "./pages/LinePlanner/ViewLinesPage";
import LinePlannerPage from "./pages/LinePlanner/LinePlannerPage";

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>

            {/* HOME */}
            <Route path="/" element={<HomeScreenPage />} />

            {/* LINE PLANNER MODULE */}
            <Route path="/line-planner" element={<PlanHomePage />} />
            <Route path="/line-planner/create" element={<CreateLinePage />} />
            <Route path="/line-planner/lines" element={<ViewLinesPage />} />
            <Route path="/line-planner/planner" element={<LinePlannerPage />} />

          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
