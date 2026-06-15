/**
 * Derived analytics for the backtest report. Pure and unit-tested: everything
 * here is computed on the client from data the API already returns (the equity
 * curve and the trade log), so no extra endpoints are needed.
 */

import type { EquityPoint, TradeDTO } from "@/lib/api/types";

export interface DrawdownPoint {
  t: string;
  /** Drawdown from the running peak, as a non-positive percentage. */
  drawdown: number;
}

/** Per-bar drawdown from the running equity peak (0 at new highs, negative below). */
export function drawdownSeries(points: EquityPoint[]): DrawdownPoint[] {
  let peak = -Infinity;
  return points.map((p) => {
    peak = Math.max(peak, p.equity);
    const drawdown = peak > 0 ? (p.equity / peak - 1) * 100 : 0;
    return { t: p.t, drawdown };
  });
}

export interface MonthlyReturn {
  month: string; // "YYYY-MM"
  year: number;
  monthIndex: number; // 1–12
  returnPct: number;
}

/**
 * Calendar-month returns derived from the equity curve. Each month's return is
 * the change from the previous month's closing equity (the first month uses the
 * initial capital as its base).
 */
export function monthlyReturns(
  points: EquityPoint[],
  initialCapital: number,
): MonthlyReturn[] {
  if (points.length === 0) return [];

  const order: string[] = [];
  const lastEquity: Record<string, number> = {};
  for (const p of points) {
    const key = p.t.slice(0, 7);
    if (!(key in lastEquity)) order.push(key);
    lastEquity[key] = p.equity;
  }

  const result: MonthlyReturn[] = [];
  let prevEnd = initialCapital;
  for (const key of order) {
    const end = lastEquity[key];
    const returnPct = prevEnd ? (end / prevEnd - 1) * 100 : 0;
    result.push({
      month: key,
      year: Number(key.slice(0, 4)),
      monthIndex: Number(key.slice(5, 7)),
      returnPct,
    });
    prevEnd = end;
  }
  return result;
}

export interface TradeStats {
  total: number;
  wins: number;
  losses: number;
  winRatePct: number;
  profitFactor: number | null; // null when there are no losses
  avgWin: number;
  avgLoss: number; // positive magnitude
  expectancy: number; // average net PnL per trade
  largestWin: number;
  largestLoss: number; // negative
  avgHoldingHours: number | null;
  netPnl: number;
}

const num = (v: string | null): number | null =>
  v === null || v === "" ? null : Number(v);

/** Aggregate win/loss statistics from the closed trades of a backtest. */
export function computeTradeStats(trades: TradeDTO[]): TradeStats {
  const closed = trades
    .map((t) => ({ pnl: num(t.pnl), entry: t.entry_time, exit: t.exit_time }))
    .filter(
      (t): t is { pnl: number; entry: string; exit: string | null } => t.pnl !== null,
    );

  const pnls = closed.map((t) => t.pnl);
  const wins = pnls.filter((p) => p > 0);
  const losses = pnls.filter((p) => p < 0);
  const grossProfit = wins.reduce((s, p) => s + p, 0);
  const grossLoss = Math.abs(losses.reduce((s, p) => s + p, 0));
  const total = closed.length;

  const holdings = closed
    .filter((t) => t.exit)
    .map(
      (t) =>
        (new Date(t.exit as string).getTime() - new Date(t.entry).getTime()) / 3_600_000,
    )
    .filter((h) => Number.isFinite(h) && h >= 0);

  return {
    total,
    wins: wins.length,
    losses: losses.length,
    winRatePct: total ? (wins.length / total) * 100 : 0,
    profitFactor: grossLoss > 0 ? grossProfit / grossLoss : null,
    avgWin: wins.length ? grossProfit / wins.length : 0,
    avgLoss: losses.length ? grossLoss / losses.length : 0,
    expectancy: total ? pnls.reduce((s, p) => s + p, 0) / total : 0,
    largestWin: wins.length ? Math.max(...wins) : 0,
    largestLoss: losses.length ? Math.min(...losses) : 0,
    avgHoldingHours: holdings.length
      ? holdings.reduce((s, h) => s + h, 0) / holdings.length
      : null,
    netPnl: pnls.reduce((s, p) => s + p, 0),
  };
}
