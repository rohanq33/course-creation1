import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { DemoProvider } from "@/contexts/DemoContext";
import Index from "./pages/Index";
import InstructorDashboard from "./pages/InstructorDashboard";
import StudentDashboard from "./pages/StudentDashboard";
import CourseEditor from "./pages/CourseEditor";
import CourseLearning from "./pages/CourseLearning";
import AISearch from "./pages/AISearch";
import ExamTime from "./pages/ExamTime";
import StudentTime from "./pages/StudentTime";
import AdminDashboard from "./pages/AdminDashboard";
import Courses from "./pages/Courses";
import NotFound from "./pages/NotFound";
import { GlobalVoiceAssistant } from "@/components/voice/GlobalVoiceAssistant";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <DemoProvider>
          <GlobalVoiceAssistant />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/dashboard" element={<StudentDashboard />} />
            <Route path="/instructor" element={<InstructorDashboard />} />
            <Route path="/instructor/course/:courseId" element={<CourseEditor />} />
            <Route path="/student" element={<StudentDashboard />} />
            <Route path="/student-dashboard" element={<StudentDashboard />} />
            <Route path="/course/:courseId" element={<CourseLearning />} />
            <Route path="/ai-assistant" element={<AISearch />} />
            <Route path="/courses" element={<Courses />} />
            <Route path="/search" element={<AISearch />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/exam-time" element={<ExamTime />} />
            <Route path="/student-time" element={<StudentTime />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </DemoProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
