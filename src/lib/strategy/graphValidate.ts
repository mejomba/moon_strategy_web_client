/**
 * Client-side validation of a {@link LogicGraph}, mirroring the backend
 * interpreter's rules (`strategy_core/graph.py`). Used by the canvas editor to
 * give immediate feedback before a strategy is saved/run. The backend remains
 * the source of truth and re-validates on execution.
 */

import type { GraphNode, LogicGraph } from "@/lib/strategy/schema";

export const NUMERIC_OPS = new Set(["price", "sma", "ema", "rsi", "constant"]);
export const CONDITION_OPS = new Set([
  "greater_than",
  "less_than",
  "crosses_above",
  "crosses_below",
]);
export const LOGIC_OPS = new Set(["and", "or", "not"]);
export const SIGNAL_OPS = new Set(["enter_long", "enter_short", "exit"]);

type Kind = "numeric" | "boolean";

/** Validate a graph, returning a list of human-readable problems (empty = ok). */
export function validateGraph(graph: LogicGraph): string[] {
  const errors: string[] = [];
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));

  const incoming = (id: string) => graph.edges.filter((e) => e.target === id);
  const label = (n: GraphNode) => n.label || `${n.op}`;

  // Edge endpoints must exist.
  for (const e of graph.edges) {
    if (!byId.has(e.source) || !byId.has(e.target)) {
      errors.push("An edge references a missing node.");
    }
  }

  // Output series kind of a node (by its type/op); signals produce no output.
  const kindOf = (id: string): Kind | null => {
    const n = byId.get(id);
    if (!n) return null;
    if (n.type === "indicator") return NUMERIC_OPS.has(n.op) ? "numeric" : null;
    if (n.type === "condition") return CONDITION_OPS.has(n.op) ? "boolean" : null;
    if (n.type === "logic") return LOGIC_OPS.has(n.op) ? "boolean" : null;
    return null;
  };

  if (hasCycle(graph)) errors.push("Graph contains a cycle.");

  for (const n of graph.nodes) {
    const ins = incoming(n.id);
    if (n.type === "indicator") {
      if (!NUMERIC_OPS.has(n.op)) errors.push(`Unknown indicator "${n.op}".`);
      if (n.op === "constant" && typeof n.params?.value !== "number") {
        errors.push(`${label(n)}: constant needs a numeric value.`);
      }
    } else if (n.type === "condition") {
      if (!CONDITION_OPS.has(n.op)) errors.push(`Unknown condition "${n.op}".`);
      for (const port of ["a", "b"]) {
        const onPort = ins.filter((e) => e.targetPort === port);
        if (onPort.length !== 1) {
          errors.push(`${label(n)}: needs exactly one input on port ${port}.`);
        } else if (kindOf(onPort[0].source) !== "numeric") {
          errors.push(`${label(n)}: port ${port} must be a number.`);
        }
      }
    } else if (n.type === "logic") {
      if (!LOGIC_OPS.has(n.op)) errors.push(`Unknown logic op "${n.op}".`);
      if (n.op === "not" && ins.length !== 1) {
        errors.push(`${label(n)}: NOT takes exactly one input.`);
      }
      if ((n.op === "and" || n.op === "or") && ins.length < 1) {
        errors.push(`${label(n)}: ${n.op.toUpperCase()} needs at least one input.`);
      }
      for (const e of ins) {
        if (kindOf(e.source) !== "boolean") {
          errors.push(`${label(n)}: inputs must be true/false conditions.`);
        }
      }
    } else if (n.type === "signal") {
      if (!SIGNAL_OPS.has(n.op)) errors.push(`Unknown signal "${n.op}".`);
      if (ins.length !== 1) {
        errors.push(`${label(n)}: needs exactly one input.`);
      } else if (kindOf(ins[0].source) !== "boolean") {
        errors.push(`${label(n)}: input must be a true/false condition.`);
      }
    }
  }

  const hasEntry = graph.nodes.some(
    (n) => n.op === "enter_long" || n.op === "enter_short",
  );
  if (!hasEntry) {
    errors.push("Add an entry signal (enter long or enter short).");
  }

  // De-duplicate while preserving order.
  return [...new Set(errors)];
}

export function isValidGraph(graph: LogicGraph): boolean {
  return validateGraph(graph).length === 0;
}

/** Detect a directed cycle over the graph's edges (DFS with a recursion stack). */
function hasCycle(graph: LogicGraph): boolean {
  const adjacency = new Map<string, string[]>();
  for (const e of graph.edges) {
    const list = adjacency.get(e.source) ?? [];
    list.push(e.target);
    adjacency.set(e.source, list);
  }
  const visited = new Set<string>();
  const stack = new Set<string>();

  const visit = (id: string): boolean => {
    if (stack.has(id)) return true;
    if (visited.has(id)) return false;
    visited.add(id);
    stack.add(id);
    for (const next of adjacency.get(id) ?? []) {
      if (visit(next)) return true;
    }
    stack.delete(id);
    return false;
  };

  return graph.nodes.some((n) => visit(n.id));
}
