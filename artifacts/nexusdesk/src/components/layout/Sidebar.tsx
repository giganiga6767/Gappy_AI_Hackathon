import { Link, useLocation } from "wouter";

const navItems = [
  { name: "TODAY", path: "/today" },
  { name: "INBOX", path: "/inbox" },
  { name: "CALENDAR", path: "/planner" },
  { name: "COURSES", path: "/courses" },
  { name: "TASKS", path: "/tasks" },
  { name: "CGPA", path: "/cgpa" },
  { name: "PROJECTS", path: "/projects" },
  { name: "EXPORT", path: "/export" },
];

export function Sidebar() {
  const [location] = useLocation();

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-56 bg-surface border-r-2 border-ink flex flex-col justify-between">
      <div className="p-6 border-b-2 border-ink">
        <h1 className="text-lg font-heading font-extrabold tracking-tighter text-ink uppercase">NexusDesk</h1>
        <p className="font-mono text-[10px] text-inkLight mt-1">v1.0 // LOCAL-FIRST</p>
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="flex flex-col gap-1 px-4">
          {navItems.map((item) => {
            const isActive =
              location === item.path ||
              (item.path !== "/today" && location.startsWith(item.path)) ||
              (item.path === "/today" && location === "/");
            return (
              <li key={item.path}>
                <Link
                  href={item.path}
                  className={`block px-4 py-2 font-mono text-xs font-bold tracking-wide border-2 transition-all ${
                    isActive
                      ? "bg-ink text-paper border-ink"
                      : "bg-transparent text-ink border-transparent hover:border-ink hover:bg-surfaceHover"
                  }`}
                >
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-4 border-t-2 border-ink bg-surface">
        <Link
          href="/inbox"
          className="block text-center font-mono text-xs font-bold py-2 px-4 bg-sage text-paper border-2 border-ink"
        >
          + QUICK CAPTURE
        </Link>
      </div>
    </aside>
  );
}
