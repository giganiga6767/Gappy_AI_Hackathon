import { useLocation } from "wouter";
import { format } from "date-fns";

export function TopBar() {
  const [location] = useLocation();
  const currentPath = location.split('/')[1] || 'dashboard';
  
  return (
    <header className="h-16 border-b-2 border-ink bg-paper flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-4">
        <div className="font-mono text-sm font-bold uppercase bg-ink text-paper px-3 py-1 border-2 border-ink shadow-brutal-sm">
          /{currentPath}
        </div>
      </div>
      <div className="font-mono text-sm font-bold border-2 border-ink px-3 py-1 bg-surface">
        {format(new Date(), "yyyy-MM-dd HH:mm:ss")}
      </div>
    </header>
  );
}
