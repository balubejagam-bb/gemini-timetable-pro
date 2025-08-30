import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import TimetableView from "./pages/TimetableView";
import GenerateTimetable from "./pages/GenerateTimetable";
import CollegeTimings from "./pages/CollegeTimings";
import Subjects from "./pages/Subjects";
import Sections from "./pages/Sections";
import Departments from "./pages/Departments";
import Rooms from "./pages/Rooms";
import Staff from "./pages/Staff";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import { AppLayout } from "./components/layout/AppLayout";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/timetables" element={<AppLayout><TimetableView /></AppLayout>} />
          <Route path="/generate" element={<AppLayout><GenerateTimetable /></AppLayout>} />
          <Route path="/timings" element={<AppLayout><CollegeTimings /></AppLayout>} />
          <Route path="/subjects" element={<AppLayout><Subjects /></AppLayout>} />
          <Route path="/sections" element={<AppLayout><Sections /></AppLayout>} />
          <Route path="/departments" element={<AppLayout><Departments /></AppLayout>} />
          <Route path="/rooms" element={<AppLayout><Rooms /></AppLayout>} />
          <Route path="/staff" element={<AppLayout><Staff /></AppLayout>} />
          <Route path="/settings" element={<AppLayout><Settings /></AppLayout>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
