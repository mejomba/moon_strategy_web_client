"use client";

import Link from "next/link";

import { Badge, statusTone } from "@/components/ui/Badge";
import { EmptyState, ErrorState, Loading } from "@/components/ui/Feedback";
import { useAsync } from "@/hooks/useAsync";
import { listBacktests } from "@/lib/api/backtests";
import { formatDate, formatPercent, signClass } from "@/lib/format";

/** Client-rendered list of backtest runs. */
export function BacktestList({
  limit,
  strategyId,
}: {
  limit?: number;
  strategyId?: number;
}) {
  const { data, loading, error } = useAsync(
    (signal) => listBacktests(strategyId ? { strategy: strategyId } : undefined, signal),
    [strategyId],
  );

  if (loading) return <Loading label="Loading backtests…" />;
  if (error) return <ErrorState message={error} />;

  const runs = (data ?? []).slice(0, limit);

  if (runs.length === 0) {
    return (
      <EmptyState
        title="No backtests yet"
        description="Run a backtest from a strategy page to see results here."
      />
    );
  }

  return (
    <div className="divide-y divide-zinc-100 overflow-hidden rounded-xl border border-zinc-200 dark:divide-zinc-900 dark:border-zinc-800">
      {runs.map((b) => (
        <Link
          key={b.id}
          href={`/backtests/${b.id}`}
          className="flex items-center justify-between gap-4 bg-white px-4 py-3 transition hover:bg-zinc-50 dark:bg-zinc-950 dark:hover:bg-zinc-900"
        >
          <div className="min-w-0">
            <p className="truncate font-medium text-zinc-900 dark:text-zinc-50">
              {b.strategy_name ?? `Strategy #${b.strategy}`} · {b.symbol}
            </p>
            <p className="text-xs text-zinc-500">
              {b.timeframe} · {formatDate(b.start_date)} → {formatDate(b.end_date)}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <span
              className={`text-sm font-medium tabular-nums ${signClass(b.total_return_pct)}`}
            >
              {formatPercent(b.total_return_pct)}
            </span>
            <Badge tone={statusTone(b.status)}>{b.status}</Badge>
          </div>
        </Link>
      ))}
    </div>
  );
}
