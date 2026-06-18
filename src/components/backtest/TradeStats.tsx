import type { TradeDTO } from "@/lib/api/types";
import { computeTradeStats } from "@/lib/report/analytics";
import {
  formatCurrency,
  formatNumber,
  formatPercentPlain,
  signClass,
} from "@/lib/format";
import { cn } from "@/lib/cn";

function Stat({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-900">
      <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
      <p className={cn("mt-0.5 font-semibold tabular-nums", valueClass)}>{value}</p>
    </div>
  );
}

/** Win/loss distribution and risk-reward statistics from the trade log. */
export function TradeStats({ trades }: { trades: TradeDTO[] }) {
  const s = computeTradeStats(trades);
  if (s.total === 0) {
    return <p className="text-sm text-zinc-500">No closed trades to analyse.</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      <Stat label="Closed trades" value={formatNumber(s.total, 0)} />
      <Stat
        label="Win rate"
        value={`${formatPercentPlain(s.winRatePct)} (${s.wins}/${s.total})`}
      />
      <Stat
        label="Profit factor"
        value={s.profitFactor === null ? "∞" : formatNumber(s.profitFactor)}
      />
      <Stat
        label="Expectancy / trade"
        value={formatCurrency(s.expectancy)}
        valueClass={signClass(s.expectancy)}
      />
      <Stat
        label="Avg win"
        value={formatCurrency(s.avgWin)}
        valueClass="text-emerald-600 dark:text-emerald-400"
      />
      <Stat
        label="Avg loss"
        value={formatCurrency(-s.avgLoss)}
        valueClass="text-rose-600 dark:text-rose-400"
      />
      <Stat
        label="Largest win"
        value={formatCurrency(s.largestWin)}
        valueClass="text-emerald-600 dark:text-emerald-400"
      />
      <Stat
        label="Largest loss"
        value={formatCurrency(s.largestLoss)}
        valueClass="text-rose-600 dark:text-rose-400"
      />
      <Stat
        label="Avg holding"
        value={
          s.avgHoldingHours === null ? "—" : `${formatNumber(s.avgHoldingHours, 1)}h`
        }
      />
      <Stat
        label="Net PnL"
        value={formatCurrency(s.netPnl)}
        valueClass={signClass(s.netPnl)}
      />
    </div>
  );
}
