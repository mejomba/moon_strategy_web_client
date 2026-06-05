import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/Feedback";
import type { TradeDTO } from "@/lib/api/types";
import { formatCurrency, formatDateTime, formatNumber, signClass } from "@/lib/format";

export function TradesTable({ trades }: { trades: TradeDTO[] }) {
  if (trades.length === 0) {
    return (
      <EmptyState
        title="No trades"
        description="This backtest produced no closed trades for the selected period and parameters."
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800">
            <th className="px-3 py-2 font-medium">Side</th>
            <th className="px-3 py-2 font-medium">Qty</th>
            <th className="px-3 py-2 font-medium">Entry</th>
            <th className="px-3 py-2 font-medium">Exit</th>
            <th className="px-3 py-2 text-right font-medium">Commission</th>
            <th className="px-3 py-2 text-right font-medium">Net PnL</th>
          </tr>
        </thead>
        <tbody>
          {trades.map((t) => (
            <tr
              key={t.id}
              className="border-b border-zinc-100 last:border-0 dark:border-zinc-900"
            >
              <td className="px-3 py-2">
                <Badge tone={t.side === "long" ? "success" : "danger"}>{t.side}</Badge>
              </td>
              <td className="px-3 py-2 tabular-nums">{formatNumber(t.quantity, 4)}</td>
              <td className="px-3 py-2">
                <div className="tabular-nums">{formatCurrency(t.entry_price)}</div>
                <div className="text-xs text-zinc-400">
                  {formatDateTime(t.entry_time)}
                </div>
              </td>
              <td className="px-3 py-2">
                <div className="tabular-nums">{formatCurrency(t.exit_price)}</div>
                <div className="text-xs text-zinc-400">{formatDateTime(t.exit_time)}</div>
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-zinc-500">
                {formatCurrency(t.commission)}
              </td>
              <td
                className={`px-3 py-2 text-right tabular-nums font-medium ${signClass(t.pnl)}`}
              >
                {formatCurrency(t.pnl)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
