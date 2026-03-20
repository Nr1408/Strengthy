import React from "react";
import { muscleGroupColors } from "@/data/mockData";
import { titleCase } from "@/lib/utils";

type Props = {
  muscle?: string | null;
};

export default function MuscleTag({ muscle }: Props) {
  const mg = muscle || "";
  const raw = (muscleGroupColors as any)[mg];
  const classes = raw ? raw : "bg-[#3a2315] text-orange-400";

  const displayRaw = mg === "other" ? "calves" : mg;

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${classes} mt-1`}
    >
      {titleCase(displayRaw)}
    </span>
  );
}
