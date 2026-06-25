import { Link, useLocation } from "wouter";
import { usePersona } from "@/context/PersonaContext";

const studentNavItems = [
  { name: "DASHBOARD", path: "/dashboard" },
  { name: "COURSES", path: "/courses" },
  { name: "TASKS", path: "/tasks" },
  { name: "CGPA", path: "/cgpa" },
  { name: "PROJECTS", path: "/projects" },
  { name: "INGEST", path: "/ingest" },
  { name: "RESOURCES", path: "/resources" },
  { name: "PLANNER", path: "/planner" },
];

const professionalNavItems = [
  { name: "DASHBOARD", path: "/dashboard" },
  { name: "TASKS", path: "/tasks" },
  { name: "PROJECTS", path: "/projects" },
  { name: "INGEST", path: "/ingest" },
  { name: "RESOURCES", path: "/resources" },
  { name: "PLANNER", path: "/planner" },
];

export function Sidebar() {
  const [location] = useLocation();
  const { mode, isStudent } = usePersona();

  const navItems = isStudent ? studentNavItems : professionalNavItems;
  const isPro = mode === "professional";

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-56 border-r-4 border-ink flex flex-col justify-between bg-surface">
      <div className="p-5 border-b-4 border-ink">
        <h1 className="text-2xl font-heading font-extrabold tracking-tighter uppercase text-ink">
          NexusDesk
        </h1>
        <p className="font-mono text-xs mt-1 text-inkLight">
          v0.1.0 // {isStudent ? "STUDENT" : "PROFESSIONAL"}
        </p>
        {isPro && (
          <div className="mt-2 font-mono text-[9px] border-2 border-ink bg-amberLight text-amber px-2 py-0.5 inline-block font-bold">
            CORP WORKSPACE
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-3">
        <ul className="flex flex-col gap-0.5 px-3">
          {navItems.map((item) => {
            const isActive = location.startsWith(item.path);
            return (
              <li key={item.path}>
                <Link
                  href={item.path}
                  className={`block px-3 py-2 font-mono text-xs font-bold tracking-wide border-2 transition-all ${
                    isActive
                      ? isPro
                        ? "bg-amber text-paper border-ink shadow-brutal-sm"
                        : "bg-ink text-paper border-ink"
                      : "bg-transparent text-ink border-transparent hover:border-ink hover:bg-surfaceHover"
                  }`}
                  data-testid={`link-nav-${item.name.toLowerCase()}`}
                >
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-4 border-t-4 border-ink">
        <Link
          href="/ingest"
          className={`w-full block text-center font-bold border-4 border-ink px-4 py-2 shadow-brutal transition-all duration-100 active:shadow-none active:translate-x-[2px] active:translate-y-[2px] hover:shadow-brutal-sm hover:-translate-x-[2px] hover:-translate-y-[2px] ${
            isPro
              ? "bg-amber text-paper"
              : "brutal-btn-primary"
          }`}
          data-testid="link-quick-paste"
        >
          + QUICK PASTE
        </Link>
      </div>
    </aside>
  );
}
