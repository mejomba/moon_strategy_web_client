"use client";

import { EmptyState } from "@/components/ui/Feedback";
import type { EquityPoint } from "@/lib/api/types";
import { monthlyReturns } from "@/lib/report/analytics";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** Tailwind background for a return cell, by sign and magnitude. */
function cellClass(pct: number | undefined): string {
  if (pct === undefined)
    return "bg-zinc-50 text-zinc-300 dark:bg-zinc-900 dark:text-zinc-700";
  const mag = Math.min(Math.abs(pct), 20) / 20; // saturate at ±20%
  if (pct >= 0) {
    if (mag > 0.66) return "bg-emerald-500/80 text-white";
    if (mag > 0.33) return "bg-emerald-400/60 text-emerald-950";
    return "bg-emerald-200/60 text-emerald-900 dark:text-emerald-200";
  }
  if (mag > 0.66) return "bg-rose-500/80 text-white";
  if (mag > 0.33) return "bg-rose-400/60 text-rose-950";
  return "bg-rose-200/60 text-rose-900 dark:text-rose-200";
}

/** Calendar heatmap of monthly returns derived from the equity curve. */
export function MonthlyReturns({
  points,
  initialCapital,
}: {
  points: EquityPoint[];
  initialCapital: number;
}) {
  const months = monthlyReturns(points, initialCapital);
  if (months.length === 0) {
    return <EmptyState title="No monthly data" />;
  }

  // Group by year → { monthIndex: returnPct }.
  const byYear = new Map<number, Record<number, number>>();
  for (const m of months) {
    const row = byYear.get(m.year) ?? {};
    row[m.monthIndex] = m.returnPct;
    byYear.set(m.year, row);
  }
  const years = [...byYear.keys()].sort();

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-1 text-center text-xs">
        <thead>
          <tr className="text-zinc-500">
            <th className="px-2 py-1 text-left font-medium">Year</th>
            {MONTHS.map((m) => (
              <th key={m} className="px-1 py-1 font-medium">
                {m}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {years.map((year) => {
            const row = byYear.get(year)!;
            return (
              <tr key={year}>
                <td className="px-2 py-1 text-left font-medium text-zinc-700 dark:text-zinc-300">
                  {year}
                </td>
                {MONTHS.map((_, i) => {
                  const pct = row[i + 1];
                  return (
                    <td
                      key={i}
                      className={`rounded px-1 py-1 tabular-nums ${cellClass(pct)}`}
                      title={pct !== undefined ? `${pct.toFixed(2)}%` : undefined}
                    >
                      {pct !== undefined ? pct.toFixed(1) : "·"}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-zinc-400">
        Monthly return %, derived from the equity curve.
      </p>
    </div>
  );
}
