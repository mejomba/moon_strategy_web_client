import { describe, expect, it } from "vitest";

import { STRATEGY_SCHEMA_VERSION } from "@/lib/strategy/schema";
import {
  META_KEY,
  createEmptyModel,
  defaultParameters,
  deserializeStrategy,
  migrate,
  serializeStrategy,
  withKind,
  type RawStrategy,
} from "@/lib/strategy/serialize";

describe("createEmptyModel", () => {
  it("seeds defaults from the kind spec", () => {
    const model = createEmptyModel("sma_crossover");
    expect(model.schemaVersion).toBe(STRATEGY_SCHEMA_VERSION);
    expect(model.kind).toBe("sma_crossover");
    expect(model.status).toBe("draft");
    expect(model.graph).toBeNull();
    expect(model.parameters).toEqual({ fast: 10, slow: 30, allow_short: false });
  });

  it("supports the rsi kind", () => {
    expect(defaultParameters("rsi")).toEqual({
      period: 14,
      oversold: 30,
      overbought: 70,
    });
  });
});

describe("withKind", () => {
  it("resets parameters to the new kind's defaults", () => {
    const model = createEmptyModel("sma_crossover");
    const next = withKind(model, "rsi");
    expect(next.kind).toBe("rsi");
    expect(next.parameters).toEqual({ period: 14, oversold: 30, overbought: 70 });
    // original is untouched (pure)
    expect(model.kind).toBe("sma_crossover");
  });

  it("is a no-op for the same kind", () => {
    const model = createEmptyModel("rsi");
    expect(withKind(model, "rsi")).toBe(model);
  });
});

describe("serialize / deserialize round-trip", () => {
  it("preserves the model through a backend round-trip", () => {
    const model = {
      ...createEmptyModel("sma_crossover"),
      name: "  My Strategy  ",
      description: "  desc  ",
      status: "active" as const,
      parameters: { fast: 5, slow: 20, allow_short: true },
    };

    const payload = serializeStrategy(model);
    // trims identity fields and embeds the metadata envelope
    expect(payload.name).toBe("My Strategy");
    expect(payload.description).toBe("desc");
    expect(payload.parameters.fast).toBe(5);
    expect(payload.parameters[META_KEY]).toEqual({
      schemaVersion: STRATEGY_SCHEMA_VERSION,
    });
    // No graph on a parametric strategy.
    expect(payload.parameters.graph).toBeUndefined();

    const back = deserializeStrategy({
      name: payload.name,
      description: payload.description,
      kind: payload.kind,
      status: payload.status,
      parameters: payload.parameters,
    });

    expect(back).toEqual({
      schemaVersion: STRATEGY_SCHEMA_VERSION,
      name: "My Strategy",
      description: "desc",
      status: "active",
      kind: "sma_crossover",
      parameters: { fast: 5, slow: 20, allow_short: true },
      graph: null,
    });
  });

  it("round-trips a Phase 2 logic graph", () => {
    const model = {
      ...createEmptyModel("rsi"),
      name: "Graph Strategy",
      graph: {
        nodes: [
          {
            id: "n1",
            type: "indicator" as const,
            op: "rsi",
            params: { period: 14 },
            position: { x: 0, y: 0 },
          },
        ],
        edges: [],
      },
    };

    const payload = serializeStrategy(model);
    // Graph is stored at the canonical top-level location for the engine.
    expect(payload.parameters.graph).toEqual(model.graph);

    const back = deserializeStrategy({ ...payload });
    expect(back.graph).toEqual(model.graph);
  });

  it("reads a graph from the legacy _meta.graph location", () => {
    const graph = { nodes: [], edges: [] };
    const model = deserializeStrategy({
      name: "Legacy graph",
      kind: "graph",
      parameters: { _meta: { schemaVersion: 1, graph } },
    });
    expect(model.kind).toBe("graph");
    expect(model.graph).toEqual(graph);
  });
});

describe("deserialize legacy data", () => {
  it("treats a strategy with no envelope as v0 and migrates it", () => {
    const raw: RawStrategy = {
      name: "Legacy",
      kind: "rsi",
      status: "draft",
      parameters: { period: 7, oversold: 25, overbought: 75 },
    };
    const model = deserializeStrategy(raw);
    expect(model.schemaVersion).toBe(STRATEGY_SCHEMA_VERSION);
    expect(model.graph).toBeNull();
    expect(model.parameters).toEqual({ period: 7, oversold: 25, overbought: 75 });
  });

  it("ignores non-scalar stray values in parameters", () => {
    const raw: RawStrategy = {
      name: "Weird",
      kind: "sma_crossover",
      parameters: { fast: 3, slow: 9, junk: { nested: true } as unknown as number },
    };
    const model = deserializeStrategy(raw);
    expect(model.parameters).toEqual({ fast: 3, slow: 9 });
  });

  it("falls back to safe defaults for unknown kind/status", () => {
    const model = deserializeStrategy({ name: "X", kind: "does_not_exist" });
    expect(model.kind).toBe("sma_crossover");
    expect(model.status).toBe("draft");
  });
});

describe("migrate", () => {
  it("bumps an old version up to the current one", () => {
    const old = { ...createEmptyModel("sma_crossover"), schemaVersion: 0, graph: null };
    const migrated = migrate(old);
    expect(migrated.schemaVersion).toBe(STRATEGY_SCHEMA_VERSION);
  });

  it("is idempotent on a current-version model", () => {
    const model = createEmptyModel("rsi");
    expect(migrate(model)).toEqual(model);
  });
});
