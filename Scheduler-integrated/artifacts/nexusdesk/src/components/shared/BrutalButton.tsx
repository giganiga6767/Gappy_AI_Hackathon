import { cn } from "@/lib/utils";
import React from "react";

interface BrutalButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "primary" | "sage";
}

export const BrutalButton = React.forwardRef<HTMLButtonElement, BrutalButtonProps>(
  ({ className, variant = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          variant === "default" && "brutal-btn",
          variant === "primary" && "brutal-btn-primary",
          variant === "sage" && "brutal-btn-sage",
          className
        )}
        {...props}
      />
    );
  }
);
BrutalButton.displayName = "BrutalButton";
