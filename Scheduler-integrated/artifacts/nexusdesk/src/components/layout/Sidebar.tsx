import { Link, useLocation } from "wouter";

const navItems = [
  { name: "DASHBOARD", path: "/dashboard" },
  { name: "COURSES", path: "/courses" },
  { name: "TASKS", path: "/tasks" },
  { name: "CGPA", path: "/cgpa" },
  { name: "PROJECTS", path: "/projects" },
  { name: "INGEST", path: "/ingest" },
  { name: "RESOURCES", path: "/resources" },
  { name: "PLANNER", path: "/planner" },
];

export function Sidebar() {
  const [location] = useLocation();

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-56 bg-surface border-r-2 border-ink flex flex-col justify-between">
      <div className="p-6 border-b-2 border-ink">
        <h1 className="text-2xl font-heading font-extrabold tracking-tighter text-ink uppercase">NexusDesk</h1>
        <p className="font-mono text-xs text-inkLight mt-1">v0.1.0 // NITK_ECE</p>
      </div>
      
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="flex flex-col gap-1 px-4">
          {navItems.map((item) => {
            const isActive = location.startsWith(item.path);
            return (
              <li key={item.path}>
                <Link 
                  href={item.path} 
                  className={`block px-4 py-2 font-mono text-sm font-bold tracking-wide border-2 transition-all ${
                    isActive 
                      ? "bg-ink text-paper border-ink" 
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
      
      <div className="p-4 border-t-2 border-ink">
        <Link 
          href="/ingest" 
          className="brutal-btn-primary w-full block text-center"
          data-testid="link-quick-paste"
        >
          + QUICK PASTE
        </Link>
      </div>
    </aside>
  );
}
