/**
 * Serialisation between the canonical {@link StrategyModel} (single source of
 * truth) and the Django backend payload.
 *
 * The backend stores a strategy as `kind` + a free-form `parameters` JSON blob.
 * To keep the strategy-JSON the source of truth — including its version and the
 * Phase 2 logic graph, for which the backend has no dedicated columns — we embed
 * an envelope under the reserved {@link META_KEY} key inside `parameters`. The
 * engine-facing keys stay flat alongside it, so the Python runner reads them
 * exactly as before and simply ignores the metadata.
 */

import {
  STRATEGY_KINDS,
  STRATEGY_SCHEMA_VERSION,
  emptyGraph,
  isStrategyKind,
  type LogicGraph,
  type ParametricKind,
  type ParamValue,
  type StrategyKind,
  type StrategyModel,
  type StrategyParameters,
  type StrategyStatus,
} from "@/lib/strategy/schema";

/** Reserved key under `parameters` that carries schema metadata. */
export const META_KEY = "_meta" as const;
/** Reserved key under `parameters` holding the executable logic graph. */
export const GRAPH_KEY = "graph" as const;

/**
 * Schema metadata envelope persisted inside `parameters[META_KEY]`. Older
 * payloads also nested the graph here (`_meta.graph`); it is now stored at the
 * canonical top-level `parameters.graph`, but legacy data is still read.
 */
interface MetaEnvelope {
  schemaVersion: number;
  graph?: LogicGraph | null;
}

/** Backend-facing payload for creating/updating a strategy. */
export interface StrategyPayload {
  name: string;
  description: string;
  kind: StrategyKind;
  status: StrategyStatus;
  parameters: Record<string, unknown>;
}

/** Build a fresh model populated with a kind's default parameters. */
export function createEmptyModel(kind: StrategyKind = "sma_crossover"): StrategyModel {
  return {
    schemaVersion: STRATEGY_SCHEMA_VERSION,
    name: "",
    description: "",
    status: "draft",
    kind,
    parameters: defaultParameters(kind),
    graph: null,
  };
}

/** Default engine parameters for a kind, derived from its declarative spec. */
export function defaultParameters(kind: StrategyKind): StrategyParameters {
  // Graph strategies carry no scalar parameters — the logic lives in the graph.
  if (!(kind in STRATEGY_KINDS)) return {};
  const spec = STRATEGY_KINDS[kind as ParametricKind];
  const params: StrategyParameters = {};
  for (const p of spec.params) {
    params[p.key] = p.default;
  }
  return params;
}

/**
 * Switch a model to a different kind, resetting parameters to that kind's
 * defaults while preserving identity fields. Returns a new model (pure).
 */
export function withKind(model: StrategyModel, kind: StrategyKind): StrategyModel {
  if (kind === model.kind) return model;
  return { ...model, kind, parameters: defaultParameters(kind) };
}

/** Serialise the canonical model into the backend create/update payload. */
export function serializeStrategy(model: StrategyModel): StrategyPayload {
  const meta: MetaEnvelope = {
    schemaVersion: model.schemaVersion || STRATEGY_SCHEMA_VERSION,
  };
  const parameters: Record<string, unknown> = {
    ...model.parameters,
    [META_KEY]: meta,
  };
  // The executable logic graph lives at the canonical top-level key, which the
  // backend engine reads directly for graph strategies.
  if (model.graph) {
    parameters[GRAPH_KEY] = model.graph;
  }
  return {
    name: model.name.trim(),
    description: model.description.trim(),
    kind: model.kind,
    status: model.status,
    parameters,
  };
}

/**
 * Raw strategy as returned by the backend. `parameters` is intentionally
 * `unknown` to match the schema's free-form JSON field; it is narrowed on read.
 */
export interface RawStrategy {
  id?: number;
  name?: string;
  description?: string;
  kind?: string;
  status?: string;
  parameters?: unknown;
}

/**
 * Parse a backend strategy back into the canonical model, splitting the flat
 * engine parameters from the metadata envelope and migrating older versions.
 */
export function deserializeStrategy(raw: RawStrategy): StrategyModel {
  const allParams =
    raw.parameters && typeof raw.parameters === "object"
      ? (raw.parameters as Record<string, unknown>)
      : {};
  const { [META_KEY]: rawMeta, [GRAPH_KEY]: rawGraph, ...flat } = allParams;

  const parameters: StrategyParameters = {};
  for (const [key, value] of Object.entries(flat)) {
    if (typeof value === "number" || typeof value === "boolean") {
      parameters[key] = value as ParamValue;
    }
  }

  const meta = (rawMeta ?? {}) as Partial<MetaEnvelope>;
  // Canonical location first, then the legacy `_meta.graph` fallback.
  const graph = (rawGraph as LogicGraph | undefined) ?? meta.graph ?? null;
  const model: StrategyModel = {
    schemaVersion: meta.schemaVersion ?? 0,
    name: raw.name ?? "",
    description: raw.description ?? "",
    status: normalizeStatus(raw.status),
    kind: normalizeKind(raw.kind),
    parameters,
    graph,
  };

  return migrate(model);
}

/* -------------------------------------------------------------------------- */
/* Versioning / migrations                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Ordered migration steps. Each entry `n` upgrades a model from version `n` to
 * `n + 1`. Strategies persisted under an older shape are migrated forward on
 * read so the rest of the app only ever sees the current version.
 */
const MIGRATIONS: Record<number, (m: StrategyModel) => StrategyModel> = {
  // v0 → v1: legacy strategies (no envelope) gain an explicit empty graph slot.
  0: (m) => ({ ...m, graph: m.graph ?? null }),
};

/** Migrate a model forward to {@link STRATEGY_SCHEMA_VERSION}. */
export function migrate(model: StrategyModel): StrategyModel {
  let current = model;
  while (current.schemaVersion < STRATEGY_SCHEMA_VERSION) {
    const step = MIGRATIONS[current.schemaVersion];
    const next = step ? step(current) : current;
    current = { ...next, schemaVersion: current.schemaVersion + 1 };
  }
  return current;
}

function normalizeKind(kind: string | undefined): StrategyKind {
  return isStrategyKind(kind) ? kind : "sma_crossover";
}

function normalizeStatus(status: string | undefined): StrategyStatus {
  return status === "active" || status === "archived" ? status : "draft";
}

/** Stable JSON string of the strategy-JSON, handy for export/diffing. */
export function toJSON(model: StrategyModel): string {
  return JSON.stringify(serializeStrategy(model), null, 2);
}

/** Build a model from a fresh graph (Phase 2 builder entry point). */
export function modelFromGraph(
  kind: StrategyKind,
  graph: LogicGraph = emptyGraph(),
): StrategyModel {
  return { ...createEmptyModel(kind), graph };
}
