import { Card } from "@/components/ui/Card";
import type { BacktestDTO } from "@/lib/api/types";
import {
  formatCurrency,
  formatNumber,
  formatPercent,
  formatPercentPlain,
  signClass,
} from "@/lib/format";
import { cn } from "@/lib/cn";

function Metric({
  label,
  value,
  valueClass,
  hint,
}: {
  label: string;
  value: string;
  valueClass?: string;
  hint?: string;
}) {
  return (
    <Card className="px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</p>
      <p className={cn("mt-1 text-xl font-semibold tabular-nums", valueClass)}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-zinc-400">{hint}</p>}
    </Card>
  );
}

/**
 * Headline performance metrics for a backtest. Trading costs are shown
 * alongside returns so results are never presented net-of-nothing (CLAUDE.md §7).
 */
export function MetricsReport({ backtest }: { backtest: BacktestDTO }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
      <Metric
        label="Total return"
        value={formatPercent(backtest.total_return_pct)}
        valueClass={signClass(backtest.total_return_pct)}
      />
      <Metric
        label="Final equity"
        value={formatCurrency(backtest.final_equity)}
        hint={`from ${formatCurrency(backtest.initial_capital)}`}
      />
      <Metric
        label="Max drawdown"
        value={formatPercentPlain(backtest.max_drawdown_pct)}
        valueClass="text-rose-600 dark:text-rose-400"
      />
      <Metric label="Sharpe ratio" value={formatNumber(backtest.sharpe_ratio)} />
      <Metric label="Win rate" value={formatPercentPlain(backtest.win_rate_pct)} />
      <Metric
        label="Cost assumptions"
        value={`${(backtest.commission_pct * 100).toFixed(3)}%`}
        hint={`commission · ${backtest.slippage_bps}bps slip · ${backtest.spread_bps}bps spread`}
      />
    </div>
  );
}
