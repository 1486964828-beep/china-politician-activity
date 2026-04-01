import type { ReactNode } from "react";
import clsx from "clsx";

export function Badge({
  children,
  tone = "default"
}: {
  children: ReactNode;
  tone?: "default" | "green" | "amber" | "ink";
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
        tone === "green" && "bg-green-100 text-green-800",
        tone === "amber" && "bg-amber-100 text-amber-800",
        tone === "ink" && "bg-ink/10 text-ink",
        tone === "default" && "bg-slate-100 text-slate-700"
      )}
    >
      {children}
    </span>
  );
}
