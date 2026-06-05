/**
 * No-code builder model and its compiler/decompiler for the executable logic
 * graph (CLAUDE.md §4). The builder's UI model is intentionally separate from
 * the emitted {@link LogicGraph}: a non-coder defines named indicators and a few
 * entry/exit conditions (combined with AND/OR, optionally negated), picks a
 * direction (long or short), and `compileToGraph` lowers that into the shared,
 * backend-executable strategy-JSON. `decompileGraph` recovers the model from a
 * graph this compiler produced, so saved strategies can be re-edited.
 *
 * Pure and framework-agnostic so it can be unit tested in isolation.
 */

import {
  emptyGraph,
  type GraphEdge,
  type GraphNode,
  type LogicGraph,
  type ParamValue,
} from "@/lib/strategy/schema";

export type PriceSource = "open" | "high" | "low" | "close";
export type IndicatorOp = "price" | "sma" | "ema" | "rsi" | "constant";
export type Comparator = "greater_than" | "less_than" | "crosses_above" | "crosses_below";
export type Combinator = "and" | "or";
export type Direction = "long" | "short";

/** A named numeric input the user can reference in conditions. */
export interface BuilderIndicator {
  id: string;
  op: IndicatorOp;
  source: PriceSource; // price / sma / ema / rsi
  period: number; // sma / ema / rsi
  value: number; // constant
}

/** A single comparison between two indicators, optionally negated (NOT). */
export interface BuilderCondition {
  id: string;
  left: string; // indicator id
  comparator: Comparator;
  right: string; // indicator id
  negate: boolean;
}

/** A set of conditions combined with AND or OR. */
export interface RuleGroup {
  combinator: Combinator;
  conditions: BuilderCondition[];
}

/** The full builder model. */
export interface StrategyBuilderModel {
  indicators: BuilderIndicator[];
  direction: Direction;
  entry: RuleGroup;
  exit: RuleGroup;
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
  return { id: uid("cond"), left, comparator: "crosses_above", right, negate: false };
}

export function emptyRuleGroup(): RuleGroup {
  return { combinator: "and", conditions: [] };
}

export function emptyBuilderModel(): StrategyBuilderModel {
  return {
    indicators: [],
    direction: "long",
    entry: emptyRuleGroup(),
    exit: emptyRuleGroup(),
  };
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

  if (model.entry.conditions.length === 0) {
    errors.push({ field: "entry", message: "Add at least one entry condition." });
  }

  const checkConditions = (group: RuleGroup, where: string) => {
    for (const c of group.conditions) {
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
 * Lower the builder model into the shared {@link LogicGraph}. Each indicator is
 * an indicator node; each condition a condition node wired to its two indicators
 * (negated ones routed through a `not` node); a group's conditions are combined
 * with its AND/OR node and fed into the matching signal.
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

  // Returns the boolean output node id for a condition (through `not` if negated).
  const conditionOutput = (c: BuilderCondition, y: number): string => {
    nodes.push({
      id: c.id,
      type: "condition",
      op: c.comparator,
      params: {},
      position: { x: 1, y },
    });
    edge(c.left, c.id, "a");
    edge(c.right, c.id, "b");
    if (!c.negate) return c.id;
    const notId = `${c.id}_not`;
    nodes.push({
      id: notId,
      type: "logic",
      op: "not",
      params: {},
      position: { x: 2, y },
    });
    edge(c.id, notId);
    return notId;
  };

  // Combine a group's conditions into a single boolean output id (or null).
  const combine = (group: RuleGroup, tag: string, baseY: number): string | null => {
    const outs = group.conditions.map((c, i) => conditionOutput(c, baseY + i));
    if (outs.length === 0) return null;
    if (outs.length === 1) return outs[0];
    const logicId = `${tag}_${group.combinator}`;
    nodes.push({
      id: logicId,
      type: "logic",
      op: group.combinator,
      params: {},
      position: { x: 3, y: baseY },
    });
    for (const id of outs) edge(id, logicId);
    return logicId;
  };

  const entryOut = combine(model.entry, "entry", 0);
  if (entryOut) {
    const op = model.direction === "short" ? "enter_short" : "enter_long";
    nodes.push({ id: op, type: "signal", op, params: {}, position: { x: 4, y: 0 } });
    edge(entryOut, op, "in");
  }

  const exitOut = combine(model.exit, "exit", 100);
  if (exitOut) {
    nodes.push({
      id: "exit",
      type: "signal",
      op: "exit",
      params: {},
      position: { x: 4, y: 2 },
    });
    edge(exitOut, "exit", "in");
  }

  return { nodes, edges };
}

/* -------------------------------------------------------------------------- */
/* Decompilation (graph → builder model) for editing                          */
/* -------------------------------------------------------------------------- */

const COMPARATOR_SET = new Set<string>([
  "greater_than",
  "less_than",
  "crosses_above",
  "crosses_below",
]);

/**
 * Recover a builder model from a graph this compiler produced. Returns `null`
 * if the graph does not match the guided shape (e.g. it was hand-edited in the
 * canvas), so callers can fall back to the freeform editor.
 */
export function decompileGraph(
  graph: LogicGraph | null | undefined,
): StrategyBuilderModel | null {
  if (!graph) return null;
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const incoming = (id: string): GraphEdge[] =>
    graph.edges.filter((e) => e.target === id);
  const sourceOn = (id: string, port: string): string | undefined =>
    incoming(id).find((e) => e.targetPort === port)?.source;

  const indicators: BuilderIndicator[] = [];
  for (const n of graph.nodes) {
    if (n.type !== "indicator") continue;
    const p = n.params ?? {};
    indicators.push({
      id: n.id,
      op: n.op as IndicatorOp,
      source: (p.source as PriceSource) ?? "close",
      period: typeof p.period === "number" ? p.period : 20,
      value: typeof p.value === "number" ? p.value : 0,
    });
  }
  const indicatorIds = new Set(indicators.map((i) => i.id));

  // Resolve a boolean output node into a builder condition (handles `not`).
  const toCondition = (nodeId: string): BuilderCondition | null => {
    let node = byId.get(nodeId);
    if (!node) return null;
    let negate = false;
    if (node.type === "logic" && node.op === "not") {
      negate = true;
      const inner = incoming(node.id)[0]?.source;
      if (!inner) return null;
      node = byId.get(inner);
    }
    if (!node || node.type !== "condition" || !COMPARATOR_SET.has(node.op)) return null;
    const left = sourceOn(node.id, "a");
    const right = sourceOn(node.id, "b");
    if (!left || !right || !indicatorIds.has(left) || !indicatorIds.has(right))
      return null;
    return { id: node.id, left, comparator: node.op as Comparator, right, negate };
  };

  // Resolve a signal's input into a rule group (single condition or and/or).
  const toGroup = (signalId: string): RuleGroup | null => {
    const src = incoming(signalId)[0]?.source;
    if (!src) return null;
    const node = byId.get(src);
    if (!node) return null;
    if (node.type === "logic" && (node.op === "and" || node.op === "or")) {
      const conditions: BuilderCondition[] = [];
      for (const e of incoming(node.id)) {
        const c = toCondition(e.source);
        if (!c) return null;
        conditions.push(c);
      }
      return { combinator: node.op, conditions };
    }
    const single = toCondition(src);
    return single ? { combinator: "and", conditions: [single] } : null;
  };

  const longSignal = graph.nodes.find((n) => n.op === "enter_long");
  const shortSignal = graph.nodes.find((n) => n.op === "enter_short");
  const exitSignal = graph.nodes.find((n) => n.op === "exit");
  const entrySignal = longSignal ?? shortSignal;
  if (!entrySignal) return null;

  const entry = toGroup(entrySignal.id);
  if (!entry) return null;
  const exit = exitSignal ? toGroup(exitSignal.id) : emptyRuleGroup();
  if (!exit) return null;

  return {
    indicators,
    direction: shortSignal && !longSignal ? "short" : "long",
    entry,
    exit,
  };
}

/** Ensure a non-null graph for previews. */
export function safeGraph(graph: LogicGraph | null): LogicGraph {
  return graph ?? emptyGraph();
}
