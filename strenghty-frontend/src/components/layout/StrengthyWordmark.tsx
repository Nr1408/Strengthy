import { cn } from "@/lib/utils";

type StrengthyWordmarkProps = {
  className?: string;
  textClassName?: string;
};

export function StrengthyWordmark({
  className,
  textClassName,
}: StrengthyWordmarkProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex h-9 w-9 items-center justify-center rounded-lg">
        <img
          src="/icons/logo.png"
          alt="Strengthy logo"
          className="h-9 w-9 rounded-lg"
        />
      </div>
      <span
        className={cn(
          "font-heading text-xl font-bold text-white",
          textClassName,
        )}
      >
        Strengthy
      </span>
    </div>
  );
}
