import { describe, expect, it } from "vitest";

import {
  compileToGraph,
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
    entry: [{ ...newCondition("fast", "slow"), id: "e1", comparator: "crosses_above" }],
    exit: [{ ...newCondition("fast", "slow"), id: "x1", comparator: "crosses_below" }],
  };
}

describe("validateBuilder", () => {
  it("accepts a well-formed SMA-cross model", () => {
    expect(validateBuilder(smaCrossModel())).toEqual([]);
  });

  it("requires at least one entry condition", () => {
    const model = { ...smaCrossModel(), entry: [] };
    expect(validateBuilder(model).map((e) => e.field)).toContain("entry");
  });

  it("flags a condition referencing a missing indicator", () => {
    const model = smaCrossModel();
    model.entry = [{ ...newCondition("fast", "ghost"), id: "e1" }];
    expect(validateBuilder(model).some((e) => e.field === "e1")).toBe(true);
  });

  it("flags an invalid indicator period", () => {
    const model = smaCrossModel();
    model.indicators[0] = { ...model.indicators[0], period: 0 };
    expect(validateBuilder(model).some((e) => e.field === "fast")).toBe(true);
  });
});

describe("compileToGraph", () => {
  it("lowers a single-condition entry directly into enter_long", () => {
    const model: StrategyBuilderModel = {
      indicators: [
        { ...newIndicator("price"), id: "p" },
        { ...newIndicator("constant"), id: "c", value: 100 },
      ],
      entry: [{ id: "e1", left: "p", comparator: "greater_than", right: "c" }],
      exit: [],
    };
    const graph = compileToGraph(model);

    const ops = graph.nodes.map((n) => n.op).sort();
    expect(ops).toEqual(["constant", "enter_long", "greater_than", "price"]);
    // No AND node for a single condition; condition feeds the signal directly.
    expect(graph.nodes.find((n) => n.op === "and")).toBeUndefined();
    const enter = graph.nodes.find((n) => n.op === "enter_long")!;
    expect(graph.edges.some((e) => e.target === enter.id && e.source === "e1")).toBe(
      true,
    );
    // Condition wired to its two indicators on ports a/b.
    expect(graph.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: "p", target: "e1", targetPort: "a" }),
        expect.objectContaining({ source: "c", target: "e1", targetPort: "b" }),
      ]),
    );
  });

  it("AND-combines multiple entry conditions", () => {
    const model: StrategyBuilderModel = {
      indicators: [
        { ...newIndicator("price"), id: "p" },
        { ...newIndicator("constant"), id: "lo", value: 10 },
        { ...newIndicator("constant"), id: "hi", value: 20 },
      ],
      entry: [
        { id: "e1", left: "p", comparator: "greater_than", right: "lo" },
        { id: "e2", left: "p", comparator: "less_than", right: "hi" },
      ],
      exit: [],
    };
    const graph = compileToGraph(model);
    const andNode = graph.nodes.find((n) => n.op === "and");
    expect(andNode).toBeDefined();
    // Both conditions feed the AND, which feeds enter_long.
    expect(graph.edges.filter((e) => e.target === andNode!.id)).toHaveLength(2);
    const enter = graph.nodes.find((n) => n.op === "enter_long")!;
    expect(
      graph.edges.some((e) => e.source === andNode!.id && e.target === enter.id),
    ).toBe(true);
  });

  it("emits an exit signal only when exit conditions exist", () => {
    const withExit = compileToGraph(smaCrossModel());
    expect(withExit.nodes.some((n) => n.op === "exit")).toBe(true);

    const noExit = compileToGraph({ ...smaCrossModel(), exit: [] });
    expect(noExit.nodes.some((n) => n.op === "exit")).toBe(false);
  });
});
