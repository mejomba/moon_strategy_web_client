/**
 * Strategy-JSON schema — the single source of truth for a strategy (CLAUDE.md §4b).
 *
 * This module defines the *intermediate representation* a strategy is built and
 * stored as on the client. Everything else in the app derives from it:
 *  - the no-code builder produces it,
 *  - the forms read/write it,
 *  - the API layer serialises it to/from the Django backend payload.
 *
 * It is deliberately framework-agnostic (no React, no fetch) so it can be unit
 * tested in isolation and reused anywhere. It is also *versioned* so the format
 * can evolve without breaking strategies persisted under an older shape.
 */

/** Current schema version. Bump when the strategy-JSON shape changes. */
export const STRATEGY_SCHEMA_VERSION = 1 as const;

/** Engine implementation that backs a strategy (mirrors backend `Strategy.kind`). */
export type StrategyKind = "sma_crossover" | "rsi";

/** Lifecycle status (mirrors backend `Strategy.Status`). */
export type StrategyStatus = "draft" | "active" | "archived";

/** A single tunable parameter value. */
export type ParamValue = number | boolean;

/** Normalised parameter bag for a strategy (engine-facing keys only). */
export type StrategyParameters = Record<string, ParamValue>;

/* -------------------------------------------------------------------------- */
/* Declarative parameter specs                                                */
/* -------------------------------------------------------------------------- */

/**
 * Declarative description of one parameter. Drives both the dynamic form UI and
 * validation, so the two can never drift apart.
 */
export interface ParamSpec {
  key: string;
  label: string;
  type: "int" | "float" | "bool";
  default: ParamValue;
  min?: number;
  max?: number;
  step?: number;
  help?: string;
}

/** Full spec for a strategy kind. */
export interface KindSpec {
  kind: StrategyKind;
  label: string;
  description: string;
  params: ParamSpec[];
}

/**
 * Registry of supported strategy kinds. Kept in sync with the backend engine
 * (`strategy_core/strategies/*`): keys, defaults and bounds mirror the Python
 * strategy classes so a strategy built here runs identically there.
 */
export const STRATEGY_KINDS: Record<StrategyKind, KindSpec> = {
  sma_crossover: {
    kind: "sma_crossover",
    label: "SMA Crossover",
    description:
      "Go long when the fast moving average crosses above the slow one. " +
      "Optionally go short on the opposite cross.",
    params: [
      {
        key: "fast",
        label: "Fast period",
        type: "int",
        default: 10,
        min: 1,
        max: 500,
        help: "Lookback of the fast moving average. Must be smaller than the slow period.",
      },
      {
        key: "slow",
        label: "Slow period",
        type: "int",
        default: 30,
        min: 2,
        max: 1000,
        help: "Lookback of the slow moving average.",
      },
      {
        key: "allow_short",
        label: "Allow short",
        type: "bool",
        default: false,
        help: "Go short on a bearish cross instead of moving to flat.",
      },
    ],
  },
  rsi: {
    kind: "rsi",
    label: "RSI Mean Reversion",
    description:
      "Buy when RSI is oversold and exit when it becomes overbought (long/flat).",
    params: [
      {
        key: "period",
        label: "RSI period",
        type: "int",
        default: 14,
        min: 2,
        max: 200,
        help: "RSI lookback period.",
      },
      {
        key: "oversold",
        label: "Oversold level",
        type: "float",
        default: 30,
        min: 0,
        max: 100,
        step: 0.5,
        help: "Enter long when RSI falls below this level.",
      },
      {
        key: "overbought",
        label: "Overbought level",
        type: "float",
        default: 70,
        min: 0,
        max: 100,
        step: 0.5,
        help: "Exit when RSI rises above this level.",
      },
    ],
  },
};

export const STRATEGY_KIND_LIST: KindSpec[] = Object.values(STRATEGY_KINDS);

/* -------------------------------------------------------------------------- */
/* Logic graph (Phase 2 — no-code visual builder)                             */
/* -------------------------------------------------------------------------- */

/** Category of a node in the visual logic graph. */
export type GraphNodeType = "indicator" | "condition" | "logic" | "signal";

/** A single node in the strategy logic graph. */
export interface GraphNode {
  id: string;
  type: GraphNodeType;
  /** Operation key, e.g. "sma", "rsi", "greater_than", "and", "enter_long". */
  op: string;
  /** Node-local parameters (e.g. indicator period, threshold value). */
  params: Record<string, ParamValue | string>;
  /** Canvas position for the builder UI. */
  position: { x: number; y: number };
  label?: string;
}

/** A directed connection between two nodes (source output → target input). */
export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  /** Optional named input port on the target node. */
  targetPort?: string;
}

/** The full visual logic graph for a strategy. */
export interface LogicGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export function emptyGraph(): LogicGraph {
  return { nodes: [], edges: [] };
}

/* -------------------------------------------------------------------------- */
/* The strategy model (single source of truth)                                */
/* -------------------------------------------------------------------------- */

/**
 * The canonical client-side strategy representation. This — not the API payload
 * and not any component state — is the single source of truth (CLAUDE.md §4b).
 *
 * In Phase 1 a strategy is a `kind` plus tuned `parameters`. In Phase 2 the
 * no-code builder fills in `graph`; the parametric form remains the compiled,
 * engine-ready view of that graph until the translator lands.
 */
export interface StrategyModel {
  schemaVersion: number;
  name: string;
  description: string;
  status: StrategyStatus;
  kind: StrategyKind;
  parameters: StrategyParameters;
  /** Visual logic graph (Phase 2). `null` while a strategy is purely parametric. */
  graph: LogicGraph | null;
}
