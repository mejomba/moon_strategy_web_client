/**
 * Validation for the canonical {@link StrategyModel}. Pure and UI-agnostic so it
 * can guard both the form and any programmatic strategy construction.
 */

import {
  STRATEGY_KINDS,
  type ParametricKind,
  type ParamSpec,
  type StrategyModel,
} from "@/lib/strategy/schema";

/** A single validation problem, keyed by the offending field. */
export interface ValidationError {
  field: string;
  message: string;
}

/** Validate a model, returning all problems found (empty array = valid). */
export function validateStrategy(model: StrategyModel): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!model.name.trim()) {
    errors.push({ field: "name", message: "Name is required." });
  } else if (model.name.trim().length > 120) {
    errors.push({ field: "name", message: "Name must be at most 120 characters." });
  }

  // Graph strategies are validated by the visual builder (validateBuilder), not
  // by the parametric spec — there are no scalar parameters to check here.
  if (model.kind === "graph") {
    return errors;
  }

  const spec = STRATEGY_KINDS[model.kind as ParametricKind];
  if (!spec) {
    errors.push({ field: "kind", message: `Unknown strategy kind "${model.kind}".` });
    return errors;
  }

  for (const p of spec.params) {
    const value = model.parameters[p.key];
    errors.push(...validateParam(p, value));
  }

  // Cross-field rule mirrored from the engine (fast period < slow period).
  if (model.kind === "sma_crossover") {
    const fast = model.parameters.fast;
    const slow = model.parameters.slow;
    if (typeof fast === "number" && typeof slow === "number" && fast >= slow) {
      errors.push({
        field: "fast",
        message: "Fast period must be smaller than slow period.",
      });
    }
  }

  if (model.kind === "rsi") {
    const os = model.parameters.oversold;
    const ob = model.parameters.overbought;
    if (typeof os === "number" && typeof ob === "number" && os >= ob) {
      errors.push({
        field: "oversold",
        message: "Oversold level must be below overbought level.",
      });
    }
  }

  return errors;
}

function validateParam(spec: ParamSpec, value: unknown): ValidationError[] {
  const errors: ValidationError[] = [];

  if (spec.type === "bool") {
    if (typeof value !== "boolean") {
      errors.push({ field: spec.key, message: `${spec.label} must be true or false.` });
    }
    return errors;
  }

  if (typeof value !== "number" || Number.isNaN(value)) {
    errors.push({ field: spec.key, message: `${spec.label} must be a number.` });
    return errors;
  }
  if (spec.type === "int" && !Number.isInteger(value)) {
    errors.push({ field: spec.key, message: `${spec.label} must be a whole number.` });
  }
  if (spec.min !== undefined && value < spec.min) {
    errors.push({ field: spec.key, message: `${spec.label} must be ≥ ${spec.min}.` });
  }
  if (spec.max !== undefined && value > spec.max) {
    errors.push({ field: spec.key, message: `${spec.label} must be ≤ ${spec.max}.` });
  }

  return errors;
}

/** Convenience: a model is valid when it produces no errors. */
export function isValidStrategy(model: StrategyModel): boolean {
  return validateStrategy(model).length === 0;
}
