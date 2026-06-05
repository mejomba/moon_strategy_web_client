/**
 * Catalog of building blocks for the no-code visual builder (Phase 2).
 *
 * Each entry describes a node that can be dropped onto the canvas to assemble a
 * {@link LogicGraph}. This is intentionally data-only so the palette, canvas and
 * (future) graph→engine/MQL5 translators can all read from one place.
 */

import type { GraphNodeType, ParamValue } from "@/lib/strategy/schema";

export interface NodeBlueprint {
  op: string;
  type: GraphNodeType;
  label: string;
  description: string;
  defaults: Record<string, ParamValue | string>;
}

export const NODE_CATALOG: NodeBlueprint[] = [
  {
    op: "sma",
    type: "indicator",
    label: "SMA",
    description: "Simple moving average of price.",
    defaults: { period: 20, source: "close" },
  },
  {
    op: "rsi",
    type: "indicator",
    label: "RSI",
    description: "Relative strength index.",
    defaults: { period: 14 },
  },
  {
    op: "crosses_above",
    type: "condition",
    label: "Crosses above",
    description: "True when input A crosses above input B.",
    defaults: {},
  },
  {
    op: "less_than",
    type: "condition",
    label: "Less than",
    description: "True when input A is below a threshold.",
    defaults: { threshold: 30 },
  },
  {
    op: "and",
    type: "logic",
    label: "AND",
    description: "True when all inputs are true.",
    defaults: {},
  },
  {
    op: "enter_long",
    type: "signal",
    label: "Enter long",
    description: "Open or hold a long position while the input is true.",
    defaults: {},
  },
  {
    op: "exit",
    type: "signal",
    label: "Exit",
    description: "Close the position while the input is true.",
    defaults: {},
  },
];

export const NODE_TYPE_TONE: Record<GraphNodeType, string> = {
  indicator: "border-sky-300 bg-sky-50 dark:border-sky-800 dark:bg-sky-950/40",
  condition:
    "border-violet-300 bg-violet-50 dark:border-violet-800 dark:bg-violet-950/40",
  logic: "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40",
  signal:
    "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40",
};
