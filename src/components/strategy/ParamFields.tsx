"use client";

import { Field, Input } from "@/components/ui/Field";
import {
  STRATEGY_KINDS,
  type ParamValue,
  type StrategyKind,
  type StrategyParameters,
} from "@/lib/strategy/schema";

/**
 * Renders the parameter inputs for a strategy kind from its declarative spec.
 * The spec is the single source of fields, so UI and validation never drift.
 */
export function ParamFields({
  kind,
  values,
  errors,
  onChange,
}: {
  kind: StrategyKind;
  values: StrategyParameters;
  errors: Record<string, string>;
  onChange: (key: string, value: ParamValue) => void;
}) {
  const spec = STRATEGY_KINDS[kind];

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {spec.params.map((p) => {
        if (p.type === "bool") {
          return (
            <label
              key={p.key}
              className="flex items-center gap-2 self-end pb-2 text-sm text-zinc-800 dark:text-zinc-200"
            >
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-zinc-300"
                checked={Boolean(values[p.key])}
                onChange={(e) => onChange(p.key, e.target.checked)}
              />
              {p.label}
            </label>
          );
        }

        return (
          <Field
            key={p.key}
            label={p.label}
            htmlFor={p.key}
            hint={p.help}
            error={errors[p.key]}
          >
            <Input
              id={p.key}
              type="number"
              inputMode={p.type === "int" ? "numeric" : "decimal"}
              step={p.step ?? (p.type === "int" ? 1 : "any")}
              min={p.min}
              max={p.max}
              value={Number(values[p.key] ?? 0)}
              onChange={(e) => onChange(p.key, Number(e.target.value))}
            />
          </Field>
        );
      })}
    </div>
  );
}
