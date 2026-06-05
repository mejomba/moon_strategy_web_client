/**
 * No-code builder model and its compiler to the executable logic graph
 * (CLAUDE.md §4). The builder's UI model is intentionally separate from the
 * emitted {@link LogicGraph}: a non-coder defines named indicators and a few
 * entry/exit conditions, and `compileToGraph` lowers that into the shared,
 * backend-executable strategy-JSON.
 *
 * Pure and framework-agnostic so it can be unit tested in isolation.
 */

import {
  type GraphNode,
  type GraphEdge,
  type LogicGraph,
  type ParamValue,
} from "@/lib/strategy/schema";

export type PriceSource = "open" | "high" | "low" | "close";
export type IndicatorOp = "price" | "sma" | "ema" | "rsi" | "constant";
export type Comparator = "greater_than" | "less_than" | "crosses_above" | "crosses_below";

/** A named numeric input the user can reference in conditions. */
export interface BuilderIndicator {
  id: string;
  op: IndicatorOp;
  source: PriceSource; // price / sma / ema / rsi
  period: number; // sma / ema / rsi
  value: number; // constant
}

/** A single comparison between two indicators. */
export interface BuilderCondition {
  id: string;
  left: string; // indicator id
  comparator: Comparator;
  right: string; // indicator id
}

/** The full builder model: indicators plus AND-combined entry/exit rules. */
export interface StrategyBuilderModel {
  indicators: BuilderIndicator[];
  entry: BuilderCondition[];
  exit: BuilderCondition[];
}

export const INDICATOR_OPS: { op: IndicatorOp; label: string }[] = [
  { op: "price", label: "Price" },
  { op: "sma", label: "SMA (simple MA)" },
  { op: "ema", label: "EMA (exponential MA)" },
  { op: "rsi", label: "RSI" },
  { op: "constant", label: "Constant value" },
];

export const COMPARATORS: { op: Comparator; label: string }[] = [
  { op: "greater_than", label: "is greater than" },
  { op: "less_than", label: "is less than" },
  { op: "crosses_above", label: "crosses above" },
  { op: "crosses_below", label: "crosses below" },
];

export const PRICE_SOURCES: PriceSource[] = ["open", "high", "low", "close"];

let seq = 0;
const uid = (prefix: string) => `${prefix}_${Date.now().toString(36)}_${seq++}`;

export function newIndicator(op: IndicatorOp = "sma"): BuilderIndicator {
  return { id: uid("ind"), op, source: "close", period: 20, value: 0 };
}

export function newCondition(left = "", right = ""): BuilderCondition {
  return { id: uid("cond"), left, comparator: "crosses_above", right };
}

export function emptyBuilderModel(): StrategyBuilderModel {
  return { indicators: [], entry: [], exit: [] };
}

/** Trader-friendly label for an indicator, e.g. "SMA(20) close" or "100". */
export function indicatorLabel(ind: BuilderIndicator): string {
  switch (ind.op) {
    case "price":
      return `Price (${ind.source})`;
    case "constant":
      return `${ind.value}`;
    default:
      return `${ind.op.toUpperCase()}(${ind.period}) ${ind.source}`;
  }
}

/* -------------------------------------------------------------------------- */
/* Validation                                                                 */
/* -------------------------------------------------------------------------- */

export interface ValidationError {
  field: string;
  message: string;
}

export function validateBuilder(model: StrategyBuilderModel): ValidationError[] {
  const errors: ValidationError[] = [];
  const ids = new Set(model.indicators.map((i) => i.id));

  for (const ind of model.indicators) {
    if (ind.op === "constant") {
      if (!Number.isFinite(ind.value)) {
        errors.push({ field: ind.id, message: "Constant needs a number." });
      }
    } else if (ind.op !== "price") {
      if (!Number.isInteger(ind.period) || ind.period < 1) {
        errors.push({
          field: ind.id,
          message: `${ind.op.toUpperCase()} period must be a whole number ≥ 1.`,
        });
      }
    }
  }

  if (model.entry.length === 0) {
    errors.push({ field: "entry", message: "Add at least one entry condition." });
  }

  const checkConditions = (conds: BuilderCondition[], where: string) => {
    for (const c of conds) {
      if (!ids.has(c.left) || !ids.has(c.right)) {
        errors.push({
          field: c.id,
          message: `${where} condition references a missing indicator.`,
        });
      }
    }
  };
  checkConditions(model.entry, "Entry");
  checkConditions(model.exit, "Exit");

  return errors;
}

export function isValidBuilder(model: StrategyBuilderModel): boolean {
  return validateBuilder(model).length === 0;
}

/* -------------------------------------------------------------------------- */
/* Compilation to the executable logic graph                                  */
/* -------------------------------------------------------------------------- */

function indicatorParams(ind: BuilderIndicator): Record<string, ParamValue | string> {
  if (ind.op === "constant") return { value: ind.value };
  if (ind.op === "price") return { source: ind.source };
  return { period: ind.period, source: ind.source };
}

/**
 * Lower the builder model into the shared {@link LogicGraph}. Each indicator
 * becomes an indicator node; each condition a condition node wired to its two
 * indicators; entry/exit conditions are AND-combined into the matching signal.
 */
export function compileToGraph(model: StrategyBuilderModel): LogicGraph {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  let edgeSeq = 0;
  const edge = (source: string, target: string, targetPort?: string): void => {
    edges.push({ id: `e${edgeSeq++}`, source, target, targetPort });
  };

  model.indicators.forEach((ind, i) => {
    nodes.push({
      id: ind.id,
      type: "indicator",
      op: ind.op,
      params: indicatorParams(ind),
      position: { x: 0, y: i },
      label: indicatorLabel(ind),
    });
  });

  const conditionNode = (c: BuilderCondition, y: number): string => {
    nodes.push({
      id: c.id,
      type: "condition",
      op: c.comparator,
      params: {},
      position: { x: 1, y },
    });
    edge(c.left, c.id, "a");
    edge(c.right, c.id, "b");
    return c.id;
  };

  // Combine a list of condition nodes into a single boolean output id.
  const combine = (
    conds: BuilderCondition[],
    tag: string,
    baseY: number,
  ): string | null => {
    const condIds = conds.map((c, i) => conditionNode(c, baseY + i));
    if (condIds.length === 0) return null;
    if (condIds.length === 1) return condIds[0];
    const andId = `${tag}_and`;
    nodes.push({
      id: andId,
      type: "logic",
      op: "and",
      params: {},
      position: { x: 2, y: baseY },
    });
    for (const id of condIds) edge(id, andId);
    return andId;
  };

  const entryOut = combine(model.entry, "entry", 0);
  if (entryOut) {
    const enterId = "enter_long";
    nodes.push({
      id: enterId,
      type: "signal",
      op: "enter_long",
      params: {},
      position: { x: 3, y: 0 },
    });
    edge(entryOut, enterId, "in");
  }

  const exitOut = combine(model.exit, "exit", 100);
  if (exitOut) {
    const exitId = "exit";
    nodes.push({
      id: exitId,
      type: "signal",
      op: "exit",
      params: {},
      position: { x: 3, y: 2 },
    });
    edge(exitOut, exitId, "in");
  }

  return { nodes, edges };
}
