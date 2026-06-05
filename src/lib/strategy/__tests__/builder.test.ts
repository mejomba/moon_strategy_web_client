import { describe, expect, it } from "vitest";

import {
  compileToGraph,
  decompileGraph,
  newCondition,
  newIndicator,
  validateBuilder,
  type StrategyBuilderModel,
} from "@/lib/strategy/builder";

function smaCrossModel(): StrategyBuilderModel {
  const fast = { ...newIndicator("sma"), id: "fast", period: 10 };
  const slow = { ...newIndicator("sma"), id: "slow", period: 30 };
  return {
    indicators: [fast, slow],
    direction: "long",
    entry: {
      combinator: "and",
      conditions: [
        { ...newCondition("fast", "slow"), id: "e1", comparator: "crosses_above" },
      ],
    },
    exit: {
      combinator: "and",
      conditions: [
        { ...newCondition("fast", "slow"), id: "x1", comparator: "crosses_below" },
      ],
    },
  };
}

describe("validateBuilder", () => {
  it("accepts a well-formed SMA-cross model", () => {
    expect(validateBuilder(smaCrossModel())).toEqual([]);
  });

  it("requires at least one entry condition", () => {
    const model = {
      ...smaCrossModel(),
      entry: { combinator: "and" as const, conditions: [] },
    };
    expect(validateBuilder(model).map((e) => e.field)).toContain("entry");
  });

  it("flags a condition referencing a missing indicator", () => {
    const model = smaCrossModel();
    model.entry.conditions = [{ ...newCondition("fast", "ghost"), id: "e1" }];
    expect(validateBuilder(model).some((e) => e.field === "e1")).toBe(true);
  });
});

describe("compileToGraph", () => {
  it("lowers a single-condition long entry directly into enter_long", () => {
    const model: StrategyBuilderModel = {
      indicators: [
        { ...newIndicator("price"), id: "p" },
        { ...newIndicator("constant"), id: "c", value: 100 },
      ],
      direction: "long",
      entry: {
        combinator: "and",
        conditions: [
          { id: "e1", left: "p", comparator: "greater_than", right: "c", negate: false },
        ],
      },
      exit: { combinator: "and", conditions: [] },
    };
    const graph = compileToGraph(model);
    const ops = graph.nodes.map((n) => n.op).sort();
    expect(ops).toEqual(["constant", "enter_long", "greater_than", "price"]);
    expect(graph.nodes.find((n) => n.op === "and")).toBeUndefined();
  });

  it("emits enter_short when the direction is short", () => {
    const model = { ...smaCrossModel(), direction: "short" as const };
    const graph = compileToGraph(model);
    expect(graph.nodes.some((n) => n.op === "enter_short")).toBe(true);
    expect(graph.nodes.some((n) => n.op === "enter_long")).toBe(false);
  });

  it("uses an OR node for an or-combined group", () => {
    const model = smaCrossModel();
    model.entry = {
      combinator: "or",
      conditions: [
        { ...newCondition("fast", "slow"), id: "a", comparator: "greater_than" },
        { ...newCondition("fast", "slow"), id: "b", comparator: "crosses_above" },
      ],
    };
    const graph = compileToGraph(model);
    expect(graph.nodes.some((n) => n.op === "or")).toBe(true);
  });

  it("routes a negated condition through a not node", () => {
    const model = smaCrossModel();
    model.entry.conditions = [
      {
        ...newCondition("fast", "slow"),
        id: "e1",
        comparator: "greater_than",
        negate: true,
      },
    ];
    const graph = compileToGraph(model);
    const notNode = graph.nodes.find((n) => n.op === "not");
    expect(notNode).toBeDefined();
    // not wraps the condition, which feeds enter_long.
    expect(graph.edges.some((e) => e.source === "e1" && e.target === notNode!.id)).toBe(
      true,
    );
    const enter = graph.nodes.find((n) => n.op === "enter_long")!;
    expect(
      graph.edges.some((e) => e.source === notNode!.id && e.target === enter.id),
    ).toBe(true);
  });
});

describe("decompileGraph round-trip", () => {
  it("recovers the model from a compiled graph", () => {
    const model = smaCrossModel();
    const back = decompileGraph(compileToGraph(model));
    expect(back).not.toBeNull();
    expect(back!.direction).toBe("long");
    expect(back!.indicators.map((i) => i.id).sort()).toEqual(["fast", "slow"]);
    expect(back!.entry.conditions[0].comparator).toBe("crosses_above");
    expect(back!.exit.conditions[0].comparator).toBe("crosses_below");
  });

  it("recovers OR + NOT + short", () => {
    const model = smaCrossModel();
    model.direction = "short";
    model.entry = {
      combinator: "or",
      conditions: [
        {
          ...newCondition("fast", "slow"),
          id: "a",
          comparator: "greater_than",
          negate: true,
        },
        { ...newCondition("fast", "slow"), id: "b", comparator: "less_than" },
      ],
    };
    const back = decompileGraph(compileToGraph(model));
    expect(back).not.toBeNull();
    expect(back!.direction).toBe("short");
    expect(back!.entry.combinator).toBe("or");
    const negated = back!.entry.conditions.find((c) => c.negate);
    expect(negated?.comparator).toBe("greater_than");
  });

  it("returns null for a graph it cannot represent", () => {
    const back = decompileGraph({
      nodes: [
        {
          id: "x",
          type: "indicator",
          op: "sma",
          params: { period: 5 },
          position: { x: 0, y: 0 },
        },
      ],
      edges: [],
    });
    expect(back).toBeNull(); // no entry signal
  });
});
