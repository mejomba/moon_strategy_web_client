"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { EmptyState } from "@/components/ui/Feedback";
import type { EquityPoint } from "@/lib/api/types";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";

/** Compact axis label, e.g. "$12.3k". */
function compactCurrency(value: number): string {
  if (Math.abs(value) >= 1000) return `$${(value / 1000).toFixed(1)}k`;
  return `$${value.toFixed(0)}`;
}

/**
 * Equity curve for a backtest: portfolio value over time, with a dashed
 * reference line at the starting capital. Net of trading costs (the backend
 * marks the portfolio to market through the cost model).
 */
export function EquityCurveChart({
  points,
  initialCapital,
}: {
  points: EquityPoint[];
  initialCapital: number;
}) {
  if (!points || points.length === 0) {
    return (
      <EmptyState
        title="No equity curve"
        description="The equity curve will appear here once the run has completed."
      />
    );
  }

  const last = points[points.length - 1]?.equity ?? initialCapital;
  const up = last >= initialCapital;
  const stroke = up ? "#059669" : "#e11d48"; // emerald-600 / rose-600

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <defs>
            <linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity={0.25} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
          <XAxis
            dataKey="t"
            tickFormatter={formatDate}
            minTickGap={48}
            tick={{ fontSize: 12 }}
            stroke="currentColor"
            opacity={0.6}
          />
          <YAxis
            domain={["auto", "auto"]}
            tickFormatter={compactCurrency}
            width={56}
            tick={{ fontSize: 12 }}
            stroke="currentColor"
            opacity={0.6}
          />
          <Tooltip
            formatter={(value) => [formatCurrency(value as number), "Equity"]}
            labelFormatter={(label) => formatDateTime(label as string)}
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
          />
          <ReferenceLine
            y={initialCapital}
            stroke="currentColor"
            strokeDasharray="4 4"
            opacity={0.4}
            label={{ value: "Start", position: "insideTopLeft", fontSize: 11 }}
          />
          <Area
            type="monotone"
            dataKey="equity"
            stroke={stroke}
            strokeWidth={2}
            fill="url(#equityFill)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
