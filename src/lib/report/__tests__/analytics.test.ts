import { describe, expect, it } from "vitest";

import {
  computeTradeStats,
  drawdownSeries,
  monthlyReturns,
} from "@/lib/report/analytics";
import type { EquityPoint, TradeDTO } from "@/lib/api/types";

const eq = (t: string, equity: number): EquityPoint => ({ t, equity });

describe("drawdownSeries", () => {
  it("is zero at new highs and negative below the peak", () => {
    const dd = drawdownSeries([
      eq("2023-01-01", 100),
      eq("2023-01-02", 120),
      eq("2023-01-03", 90),
      eq("2023-01-04", 130),
    ]);
    expect(dd[0].drawdown).toBe(0);
    expect(dd[1].drawdown).toBe(0); // new high
    expect(dd[2].drawdown).toBeCloseTo((90 / 120 - 1) * 100); // -25%
    expect(dd[3].drawdown).toBe(0); // recovered to new high
  });
});

describe("monthlyReturns", () => {
  it("computes month-over-month returns from the equity curve", () => {
    const points = [
      eq("2023-01-10", 10500),
      eq("2023-01-31", 11000),
      eq("2023-02-15", 10000),
      eq("2023-02-28", 9900),
    ];
    const m = monthlyReturns(points, 10000);
    expect(m).toHaveLength(2);
    // Jan: 11000 / 10000 - 1 = +10%
    expect(m[0]).toMatchObject({ month: "2023-01", year: 2023, monthIndex: 1 });
    expect(m[0].returnPct).toBeCloseTo(10);
    // Feb: 9900 / 11000 - 1 = -10%
    expect(m[1].returnPct).toBeCloseTo(-10);
  });

  it("returns empty for no points", () => {
    expect(monthlyReturns([], 10000)).toEqual([]);
  });
});

function trade(
  pnl: string | null,
  entry = "2023-01-01T00:00:00Z",
  exit: string | null = "2023-01-02T00:00:00Z",
): TradeDTO {
  return {
    id: 1,
    backtest: 1,
    side: "long",
    quantity: "1",
    entry_time: entry,
    entry_price: "100",
    exit_time: exit,
    exit_price: "100",
    gross_pnl: pnl,
    commission: "0",
    funding: "0",
    pnl,
  };
}

describe("computeTradeStats", () => {
  it("summarises wins, losses and ratios", () => {
    const stats = computeTradeStats([
      trade("100"),
      trade("50"),
      trade("-30"),
      trade(null), // open trade, ignored
    ]);
    expect(stats.total).toBe(3);
    expect(stats.wins).toBe(2);
    expect(stats.losses).toBe(1);
    expect(stats.winRatePct).toBeCloseTo((2 / 3) * 100);
    expect(stats.profitFactor).toBeCloseTo(150 / 30);
    expect(stats.avgWin).toBeCloseTo(75);
    expect(stats.avgLoss).toBeCloseTo(30);
    expect(stats.expectancy).toBeCloseTo(120 / 3);
    expect(stats.largestWin).toBe(100);
    expect(stats.largestLoss).toBe(-30);
    expect(stats.netPnl).toBe(120);
    expect(stats.avgHoldingHours).toBeCloseTo(24);
  });

  it("reports null profit factor when there are no losses", () => {
    const stats = computeTradeStats([trade("10"), trade("20")]);
    expect(stats.profitFactor).toBeNull();
  });

  it("handles an empty trade log", () => {
    const stats = computeTradeStats([]);
    expect(stats.total).toBe(0);
    expect(stats.avgHoldingHours).toBeNull();
  });
});
