import { cn } from "@/lib/utils";

interface StatPillProps {
  label: string;
  value: string | number;
  className?: string;
  variant?: "default" | "sage" | "terracotta" | "amber";
}

export function StatPill({ label, value, className, variant = "default" }: StatPillProps) {
  return (
    <div className={cn(
      "inline-flex items-center border-2 border-ink",
      className
    )}>
      <div className="bg-surface px-2 py-1 font-mono text-xs font-bold uppercase text-inkLight border-r-2 border-ink">
        {label}
      </div>
      <div className={cn(
        "px-3 py-1 font-mono text-sm font-bold",
        variant === "default" && "bg-paper text-ink",
        variant === "sage" && "bg-sageLight text-sageDark",
        variant === "terracotta" && "bg-terracottaLight text-terracottaDark",
        variant === "amber" && "bg-amberLight text-amber"
      )}>
        {value}
      </div>
    </div>
  );
}
