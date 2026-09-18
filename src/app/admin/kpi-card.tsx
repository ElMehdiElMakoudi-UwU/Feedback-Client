"use client";

import type { ReactElement } from "react";

type IconComponent = (props: { className?: string }) => ReactElement;

export function KpiCard({
  label,
  value,
  accent,
  icon: Icon,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  accent?: boolean;
  icon?: IconComponent;
  tone?: "neutral" | "good" | "warn" | "bad";
}) {
  const toneClass =
    tone === "good"
      ? "text-green-700"
      : tone === "warn"
        ? "text-amber-700"
        : tone === "bad"
          ? "text-red-600"
          : accent
            ? "text-[var(--sindibad-maroon)]"
            : "text-neutral-900";

  return (
    <div className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
      {Icon && (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-white text-neutral-500 shadow-sm ring-1 ring-neutral-200">
          <Icon className="h-5 w-5" />
        </div>
      )}
      <div className="min-w-0">
        <p className={`text-xl font-semibold leading-tight tracking-tight sm:text-2xl ${toneClass}`}>
          {value}
        </p>
        <p className="mt-0.5 truncate text-xs text-neutral-500">{label}</p>
      </div>
    </div>
  );
}
