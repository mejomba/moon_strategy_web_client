/**
 * Shared API types — the typed contract between this client and the Django
 * backend. These mirror the backend domain models (`backtester/models.py`):
 * `Strategy`, `Backtest`, `Trade`. They are the agreed shape even before the
 * REST endpoints exist; the fetch layer in `client.ts` speaks exactly this.
 *
 * Conventions:
 *  - Money/quantity decimals arrive as strings (Django `DecimalField`), so they
 *    are typed `string` and converted at the edge with the helpers in
 *    `lib/format.ts`.
 *  - Nullable metrics are populated only once a backtest completes.
 */

import type { StrategyKind, StrategyStatus } from "@/lib/strategy/schema";

export type BacktestStatus = "pending" | "running" | "completed" | "failed";
export type TradeSide = "long" | "short";

/** A persisted strategy as returned by the backend. */
export interface StrategyDTO {
  id: number;
  name: string;
  description: string;
  kind: StrategyKind;
  status: StrategyStatus;
  parameters: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/** A backtest run with its cost assumptions and (once complete) metrics. */
export interface BacktestDTO {
  id: number;
  strategy: number;
  strategy_name?: string;
  symbol: string;
  timeframe: string;
  start_date: string;
  end_date: string;
  initial_capital: string;

  // Trading-cost assumptions applied by the engine (CLAUDE.md §7).
  commission_pct: number;
  slippage_bps: number;
  spread_bps: number;
  funding_rate: number;
  funding_interval_hours: number;

  status: BacktestStatus;

  // Aggregate metrics — null until the run completes.
  final_equity: string | null;
  total_return_pct: number | null;
  max_drawdown_pct: number | null;
  sharpe_ratio: number | null;
  win_rate_pct: number | null;

  error_message: string;
  created_at: string;
  completed_at: string | null;
}

/** An individual simulated trade produced by a backtest. */
export interface TradeDTO {
  id: number;
  backtest: number;
  side: TradeSide;
  quantity: string;
  entry_time: string;
  entry_price: string;
  exit_time: string | null;
  exit_price: string | null;
  gross_pnl: string | null;
  commission: string;
  funding: string;
  pnl: string | null;
}

/** Payload to create a backtest run. Cost fields are optional (backend defaults). */
export interface CreateBacktestPayload {
  strategy: number;
  symbol: string;
  timeframe: string;
  start_date: string;
  end_date: string;
  initial_capital: number;
  commission_pct?: number;
  slippage_bps?: number;
  spread_bps?: number;
  funding_rate?: number;
  funding_interval_hours?: number;
}

/** DRF-style paginated envelope (the client also accepts a bare array). */
export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
