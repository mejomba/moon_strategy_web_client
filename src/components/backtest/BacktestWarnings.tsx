import type { QualityWarning } from "@/lib/api/types";
import { cn } from "@/lib/cn";

/**
 * Reliability / overfitting warnings for a backtest (CLAUDE.md §3/§8). These are
 * honest caveats from the API — e.g. in-sample-only, too few trades — shown
 * prominently so results are never read as a promise of future returns.
 */
export function BacktestWarnings({ warnings }: { warnings: QualityWarning[] }) {
  if (!warnings || warnings.length === 0) return null;

  // Most severe first so the strongest caveat leads.
  const sorted = [...warnings].sort((a, b) => rank(b.severity) - rank(a.severity));

  return (
    <ul className="space-y-2" aria-label="Reliability warnings">
      {sorted.map((w) => (
        <li
          key={w.code}
          className={cn(
            "flex items-start gap-2 rounded-lg border px-4 py-3 text-sm",
            w.severity === "warning"
              ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300"
              : "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-300",
          )}
        >
          <span aria-hidden className="mt-0.5">
            {w.severity === "warning" ? "⚠️" : "ℹ️"}
          </span>
          <span>{w.message}</span>
        </li>
      ))}
    </ul>
  );
}

function rank(severity: string): number {
  return severity === "warning" ? 1 : 0;
}
