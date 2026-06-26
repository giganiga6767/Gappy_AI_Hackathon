import { cn } from "@/lib/utils";

interface BrutalBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
  variant?: "default" | "terracotta" | "sage" | "amber";
}

export function BrutalBadge({ children, variant = "default", className, ...props }: BrutalBadgeProps) {
  return (
    <span 
      className={cn(
        "font-mono text-[10px] font-bold uppercase border-2 border-ink px-2 py-0.5",
        variant === "default" && "bg-surface text-ink",
        variant === "terracotta" && "bg-terracottaLight text-terracottaDark",
        variant === "sage" && "bg-sageLight text-sageDark",
        variant === "amber" && "bg-amberLight text-amber",
        className
      )} 
      {...props}
    >
      {children}
    </span>
  );
}
