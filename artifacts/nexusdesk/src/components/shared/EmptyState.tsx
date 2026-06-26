import { cn } from "@/lib/utils";
import { BrutalButton } from "./BrutalButton";

interface EmptyStateProps {
  label: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({ label, actionLabel, onAction, className }: EmptyStateProps) {
  return (
    <div className={cn(
      "border-2 border-dashed border-inkFaint bg-surface/50 p-8 flex flex-col items-center justify-center text-center",
      className
    )}>
      <p className="font-mono text-sm font-bold uppercase tracking-widest text-inkLight mb-4">
        {label}
      </p>
      {actionLabel && onAction && (
        <BrutalButton variant="primary" onClick={onAction} data-testid={`empty-action`}>
          {actionLabel}
        </BrutalButton>
      )}
    </div>
  );
}
