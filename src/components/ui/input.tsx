import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <div className="relative w-full">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary font-mono select-none pointer-events-none">
          &gt;
        </span>
        <input
          type={type}
          className={cn(
            "flex h-10 w-full cyber-chamfer-sm border border-border bg-input pl-8 pr-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground placeholder:font-mono focus-visible:outline-none focus-visible:[border-color:hsl(var(--primary))] focus-visible:neon-glow disabled:cursor-not-allowed disabled:opacity-50 font-mono text-primary transition-all duration-200",
            className,
          )}
          ref={ref}
          {...props}
        />
      </div>
    );
  },
);
Input.displayName = "Input";

export { Input };
