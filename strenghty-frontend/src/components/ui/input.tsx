import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, onTouchStart, onClick, inputMode, ...props }, ref) => {
    // Ensure numeric inputs hint a numeric keyboard on mobile and
    // aggressively focus on touch to work around browsers that don't
    // automatically open the keyboard inside some webviews.
    const derivedInputMode =
      inputMode ?? (type === "number" ? "numeric" : undefined);

    const handleTouchStart: React.TouchEventHandler<HTMLInputElement> = (e) => {
      try {
        (e.target as HTMLInputElement).focus();
      } catch {}
      if (onTouchStart) onTouchStart(e);
    };

    const handleClick: React.MouseEventHandler<HTMLInputElement> = (e) => {
      try {
        (e.target as HTMLInputElement).focus();
      } catch {}
      if (onClick) onClick(e);
    };

    return (
      <input
        type={type}
        inputMode={derivedInputMode}
        pattern={type === "number" ? "[0-9]*" : undefined}
        className={cn(
          "flex h-10 min-w-0 w-full rounded-md border border-white/10 bg-neutral-900/60 backdrop-blur-md text-white px-2 py-2 text-base ring-offset-background placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:cursor-not-allowed disabled:opacity-50 md:text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-white/70",
          className,
        )}
        ref={ref}
        onTouchStart={handleTouchStart}
        onClick={handleClick}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
