import React from "react";
import { muscleGroupColors } from "@/data/mockData";

type Props = {
  muscle?: string | null;
};

export default function MuscleTag({ muscle }: Props) {
  const mg = muscle || "";
  // preserve semantic text color from the existing mapping when possible
  const raw = (muscleGroupColors as any)[mg] || "";
  const parts = raw.split(" ");
  const textClass =
    parts.find((p: string) => p.startsWith("text-")) || "text-orange-400";

  const display = mg === "other" ? "calves" : mg;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1.5 text-sm font-semibold bg-[#3a2315] ${textClass} mt-1`}
    >
      {display}
    </span>
  );
}
