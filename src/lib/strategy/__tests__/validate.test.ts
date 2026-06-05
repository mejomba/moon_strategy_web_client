import { describe, expect, it } from "vitest";

import { createEmptyModel } from "@/lib/strategy/serialize";
import { isValidStrategy, validateStrategy } from "@/lib/strategy/validate";

function fieldsWithErrors(model: Parameters<typeof validateStrategy>[0]) {
  return validateStrategy(model).map((e) => e.field);
}

describe("validateStrategy", () => {
  it("accepts a well-formed default model with a name", () => {
    const model = { ...createEmptyModel("sma_crossover"), name: "Valid" };
    expect(validateStrategy(model)).toEqual([]);
    expect(isValidStrategy(model)).toBe(true);
  });

  it("requires a name", () => {
    const model = createEmptyModel("rsi");
    expect(fieldsWithErrors(model)).toContain("name");
  });

  it("enforces fast < slow for sma_crossover", () => {
    const model = {
      ...createEmptyModel("sma_crossover"),
      name: "X",
      parameters: { fast: 30, slow: 10, allow_short: false },
    };
    expect(fieldsWithErrors(model)).toContain("fast");
  });

  it("enforces oversold < overbought for rsi", () => {
    const model = {
      ...createEmptyModel("rsi"),
      name: "X",
      parameters: { period: 14, oversold: 80, overbought: 20 },
    };
    expect(fieldsWithErrors(model)).toContain("oversold");
  });

  it("flags out-of-range and wrong-type parameters", () => {
    const model = {
      ...createEmptyModel("rsi"),
      name: "X",
      parameters: { period: 1.5, oversold: -5, overbought: 70 },
    };
    const fields = fieldsWithErrors(model);
    expect(fields).toContain("period"); // not an integer
    expect(fields).toContain("oversold"); // below min
  });

  it("flags a non-boolean where a bool is expected", () => {
    const model = {
      ...createEmptyModel("sma_crossover"),
      name: "X",
      parameters: { fast: 5, slow: 20, allow_short: 1 as unknown as boolean },
    };
    expect(fieldsWithErrors(model)).toContain("allow_short");
  });
});
