import { describe, expect, it } from "vitest";

import { compileToGraph, newCondition, newIndicator } from "@/lib/strategy/builder";
import { isValidGraph, validateGraph } from "@/lib/strategy/graphValidate";
import type { StrategyBuilderModel } from "@/lib/strategy/builder";

function validModel(): StrategyBuilderModel {
  const fast = { ...newIndicator("sma"), id: "fast", period: 10 };
  const slow = { ...newIndicator("sma"), id: "slow", period: 30 };
  return {
    indicators: [fast, slow],
    direction: "long",
    entry: {
      combinator: "and",
      conditions: [{ ...newCondition("fast", "slow"), comparator: "crosses_above" }],
    },
    exit: { combinator: "and", conditions: [] },
  };
}

describe("validateGraph", () => {
  it("accepts a graph produced by the compiler", () => {
    expect(validateGraph(compileToGraph(validModel()))).toEqual([]);
    expect(isValidGraph(compileToGraph(validModel()))).toBe(true);
  });

  it("requires an entry signal", () => {
    const graph = {
      nodes: [
        {
          id: "p",
          type: "indicator" as const,
          op: "price",
          params: {},
          position: { x: 0, y: 0 },
        },
      ],
      edges: [],
    };
    expect(validateGraph(graph)).toContain(
      "Add an entry signal (enter long or enter short).",
    );
  });

  it("flags a condition missing an input port", () => {
    const graph = {
      nodes: [
        {
          id: "p",
          type: "indicator" as const,
          op: "price",
          params: {},
          position: { x: 0, y: 0 },
        },
        {
          id: "gt",
          type: "condition" as const,
          op: "greater_than",
          params: {},
          position: { x: 1, y: 0 },
        },
        {
          id: "enter",
          type: "signal" as const,
          op: "enter_long",
          params: {},
          position: { x: 2, y: 0 },
        },
      ],
      edges: [
        { id: "1", source: "p", target: "gt", targetPort: "a" },
        { id: "2", source: "gt", target: "enter", targetPort: "in" },
      ],
    };
    // Port "b" of the condition is unconnected.
    expect(validateGraph(graph).some((m) => m.includes("port b"))).toBe(true);
  });

  it("detects a cycle", () => {
    const graph = {
      nodes: [
        {
          id: "a",
          type: "logic" as const,
          op: "not",
          params: {},
          position: { x: 0, y: 0 },
        },
        {
          id: "b",
          type: "logic" as const,
          op: "not",
          params: {},
          position: { x: 1, y: 0 },
        },
        {
          id: "enter",
          type: "signal" as const,
          op: "enter_long",
          params: {},
          position: { x: 2, y: 0 },
        },
      ],
      edges: [
        { id: "1", source: "a", target: "b" },
        { id: "2", source: "b", target: "a" },
        { id: "3", source: "b", target: "enter", targetPort: "in" },
      ],
    };
    expect(validateGraph(graph)).toContain("Graph contains a cycle.");
  });
});
