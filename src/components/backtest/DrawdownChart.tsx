"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { EmptyState } from "@/components/ui/Feedback";
import type { EquityPoint } from "@/lib/api/types";
import { drawdownSeries } from "@/lib/report/analytics";
import { formatDate, formatDateTime } from "@/lib/format";

/**
 * Underwater (drawdown) curve: how far below the running equity peak the
 * portfolio sits at each point. Surfaces risk alongside returns (CLAUDE.md §8).
 */
export function DrawdownChart({ points }: { points: EquityPoint[] }) {
  if (!points || points.length === 0) {
    return <EmptyState title="No drawdown data" />;
  }
  const data = drawdownSeries(points);

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <defs>
            <linearGradient id="ddFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#e11d48" stopOpacity={0} />
              <stop offset="100%" stopColor="#e11d48" stopOpacity={0.3} />
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
            tickFormatter={(v: number) => `${v.toFixed(0)}%`}
            width={48}
            tick={{ fontSize: 12 }}
            stroke="currentColor"
            opacity={0.6}
          />
          <Tooltip
            formatter={(value) => [`${(value as number).toFixed(2)}%`, "Drawdown"]}
            labelFormatter={(label) => formatDateTime(label as string)}
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
          />
          <Area
            type="monotone"
            dataKey="drawdown"
            stroke="#e11d48"
            strokeWidth={1.5}
            fill="url(#ddFill)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
