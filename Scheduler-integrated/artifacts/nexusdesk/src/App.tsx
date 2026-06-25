import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import { AuthProvider, useAuth } from "@/context/AuthContext";
import { PersonaProvider, usePersona } from "@/context/PersonaContext";
import { WebSocketProvider } from "@/components/websocket/WebSocketProvider";

import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";

import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import CoursesPage from "@/pages/CoursesPage";
import CourseDetailPage from "@/pages/CourseDetailPage";
import TasksPage from "@/pages/TasksPage";
import CGPAPage from "@/pages/CGPAPage";
import ProjectsPage from "@/pages/ProjectsPage";
import ProjectDetailPage from "@/pages/ProjectDetailPage";
import IngestPage from "@/pages/IngestPage";
import ResourcesPage from "@/pages/ResourcesPage";
import PlannerPage from "@/pages/PlannerPage";

const queryClient = new QueryClient();

function Layout({ children }: { children: React.ReactNode }) {
  const { mode } = usePersona();
  const isPro = mode === "professional";

  return (
    <div
      className={`min-h-screen flex transition-colors duration-300 ${
        isPro ? "bg-[#070f1e]" : "bg-paper"
      }`}
    >
      <Sidebar />
      <div className="flex-1 ml-56 flex flex-col h-screen overflow-hidden">
        <TopBar />
        <main className={`flex-1 overflow-y-auto ${isPro ? "bg-[#070f1e]" : "bg-paper"}`}>
          {children}
        </main>
      </div>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/">
        <Redirect to="/dashboard" />
      </Route>
      <Route path="/dashboard" component={DashboardPage} />
      <Route path="/courses" component={CoursesPage} />
      <Route path="/courses/:courseId" component={CourseDetailPage} />
      <Route path="/tasks" component={TasksPage} />
      <Route path="/cgpa" component={CGPAPage} />
      <Route path="/projects" component={ProjectsPage} />
      <Route path="/projects/:projectId" component={ProjectDetailPage} />
      <Route path="/ingest" component={IngestPage} />
      <Route path="/resources" component={ResourcesPage} />
      <Route path="/planner" component={PlannerPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppInner() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <WebSocketProvider>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <Layout>
          <Router />
        </Layout>
      </WouterRouter>
    </WebSocketProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <PersonaProvider>
            <AppInner />
            <Toaster />
          </PersonaProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
