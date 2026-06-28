import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";

import TodayPage from "@/pages/TodayPage";
import CoursesPage from "@/pages/CoursesPage";
import CourseDetailPage from "@/pages/CourseDetailPage";
import SessionDetailPage from "@/pages/SessionDetailPage";
import InboxPage from "@/pages/InboxPage";
import ExportPage from "@/pages/ExportPage";
import PlannerPage from "@/pages/PlannerPage";
import TasksPage from "@/pages/TasksPage";
import CGPAPage from "@/pages/CGPAPage";
import ProjectsPage from "@/pages/ProjectsPage";
import ResourcesPage from "@/pages/ResourcesPage";
import TracesPage from "@/pages/TracesPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-paper flex">
      <Sidebar />
      <div className="flex-1 ml-56 flex flex-col h-screen overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto">
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
        <Redirect to="/today" />
      </Route>
      <Route path="/today" component={TodayPage} />
      <Route path="/inbox" component={InboxPage} />
      <Route path="/planner" component={PlannerPage} />
      <Route path="/courses" component={CoursesPage} />
      <Route path="/courses/:courseId" component={CourseDetailPage} />
      <Route path="/courses/:courseId/session/:sessionId" component={SessionDetailPage} />
      <Route path="/tasks" component={TasksPage} />
      <Route path="/cgpa" component={CGPAPage} />
      <Route path="/projects" component={ProjectsPage} />
      <Route path="/resources" component={ResourcesPage} />
      <Route path="/traces" component={TracesPage} />
      <Route path="/export" component={ExportPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Layout>
            <Router />
          </Layout>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
