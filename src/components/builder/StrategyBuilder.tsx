"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Field, Input, Select } from "@/components/ui/Field";
import { ErrorState } from "@/components/ui/Feedback";
import { LegalDisclaimer } from "@/components/LegalDisclaimer";
import { createStrategy } from "@/lib/api/strategies";
import { createEmptyModel } from "@/lib/strategy/serialize";
import {
  COMPARATORS,
  INDICATOR_OPS,
  PRICE_SOURCES,
  type BuilderCondition,
  type BuilderIndicator,
  type Comparator,
  type IndicatorOp,
  type PriceSource,
  type StrategyBuilderModel,
  compileToGraph,
  indicatorLabel,
  newCondition,
  newIndicator,
  validateBuilder,
} from "@/lib/strategy/builder";

/** A runnable starting point so non-coders see a working example (§8). */
function seedModel(): StrategyBuilderModel {
  const fast: BuilderIndicator = { ...newIndicator("sma"), id: "fast", period: 10 };
  const slow: BuilderIndicator = { ...newIndicator("sma"), id: "slow", period: 30 };
  return {
    indicators: [fast, slow],
    entry: [{ ...newCondition("fast", "slow"), comparator: "crosses_above" }],
    exit: [{ ...newCondition("fast", "slow"), comparator: "crosses_below" }],
  };
}

export function StrategyBuilder() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [model, setModel] = useState<StrategyBuilderModel>(seedModel);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const errors = useMemo(() => validateBuilder(model), [model]);
  const errorFields = useMemo(() => new Set(errors.map((e) => e.field)), [errors]);
  const graph = useMemo(() => compileToGraph(model), [model]);

  // -- indicator editing ------------------------------------------------------
  function addIndicator() {
    setModel((m) => ({ ...m, indicators: [...m.indicators, newIndicator("sma")] }));
  }
  function updateIndicator(id: string, patch: Partial<BuilderIndicator>) {
    setModel((m) => ({
      ...m,
      indicators: m.indicators.map((i) => (i.id === id ? { ...i, ...patch } : i)),
    }));
  }
  function removeIndicator(id: string) {
    setModel((m) => ({
      ...m,
      indicators: m.indicators.filter((i) => i.id !== id),
      entry: m.entry.filter((c) => c.left !== id && c.right !== id),
      exit: m.exit.filter((c) => c.left !== id && c.right !== id),
    }));
  }

  // -- condition editing ------------------------------------------------------
  function addCondition(group: "entry" | "exit") {
    const first = model.indicators[0]?.id ?? "";
    const second = model.indicators[1]?.id ?? first;
    setModel((m) => ({ ...m, [group]: [...m[group], newCondition(first, second)] }));
  }
  function updateCondition(
    group: "entry" | "exit",
    id: string,
    patch: Partial<BuilderCondition>,
  ) {
    setModel((m) => ({
      ...m,
      [group]: m[group].map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));
  }
  function removeCondition(group: "entry" | "exit", id: string) {
    setModel((m) => ({ ...m, [group]: m[group].filter((c) => c.id !== id) }));
  }

  async function handleSave() {
    setSubmitted(true);
    setError(null);
    if (!name.trim()) {
      setError("Give your strategy a name.");
      return;
    }
    if (errors.length > 0) return;

    setSaving(true);
    try {
      const strategy = {
        ...createEmptyModel("graph"),
        name,
        description,
        graph: compileToGraph(model),
      };
      const created = await createStrategy(strategy);
      router.push(`/strategies/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save strategy.");
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <div className="space-y-6">
        <Card>
          <CardHeader title="Strategy" subtitle="Name your strategy" />
          <CardBody className="space-y-4">
            <Field
              label="Name"
              htmlFor="name"
              error={submitted && !name.trim() ? "Required" : undefined}
            >
              <Input
                id="name"
                value={name}
                maxLength={120}
                placeholder="e.g. SMA 10/30 crossover"
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            <Field label="Description" htmlFor="desc">
              <Input
                id="desc"
                value={description}
                placeholder="Optional"
                onChange={(e) => setDescription(e.target.value)}
              />
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Indicators"
            subtitle="The building blocks your rules compare"
            action={
              <Button variant="secondary" size="sm" onClick={addIndicator}>
                Add indicator
              </Button>
            }
          />
          <CardBody className="space-y-3">
            {model.indicators.map((ind) => (
              <IndicatorRow
                key={ind.id}
                indicator={ind}
                invalid={errorFields.has(ind.id)}
                onChange={(patch) => updateIndicator(ind.id, patch)}
                onRemove={() => removeIndicator(ind.id)}
              />
            ))}
            {model.indicators.length === 0 && (
              <p className="text-sm text-zinc-500">Add an indicator to get started.</p>
            )}
          </CardBody>
        </Card>

        <RuleGroup
          title="Entry rules"
          subtitle="Go long when ALL of these are true"
          group="entry"
          conditions={model.entry}
          indicators={model.indicators}
          errorFields={errorFields}
          onAdd={() => addCondition("entry")}
          onUpdate={(id, patch) => updateCondition("entry", id, patch)}
          onRemove={(id) => removeCondition("entry", id)}
        />

        <RuleGroup
          title="Exit rules"
          subtitle="Close the position when ALL of these are true (optional)"
          group="exit"
          conditions={model.exit}
          indicators={model.indicators}
          errorFields={errorFields}
          onAdd={() => addCondition("exit")}
          onUpdate={(id, patch) => updateCondition("exit", id, patch)}
          onRemove={(id) => removeCondition("exit", id)}
        />

        <LegalDisclaimer />

        {submitted && errors.length > 0 && (
          <ErrorState message={errors.map((e) => e.message).join(" ")} />
        )}
        {error && <ErrorState message={error} />}

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save strategy"}
          </Button>
        </div>
      </div>

      <Card className="h-fit lg:sticky lg:top-20">
        <CardHeader title="Strategy-JSON" subtitle="Live executable graph" />
        <CardBody>
          <pre className="max-h-[28rem] overflow-auto rounded-lg bg-zinc-950 p-3 text-xs text-zinc-100">
            {JSON.stringify(graph, null, 2)}
          </pre>
        </CardBody>
      </Card>
    </div>
  );
}

function IndicatorRow({
  indicator,
  invalid,
  onChange,
  onRemove,
}: {
  indicator: BuilderIndicator;
  invalid: boolean;
  onChange: (patch: Partial<BuilderIndicator>) => void;
  onRemove: () => void;
}) {
  const showPeriod =
    indicator.op === "sma" || indicator.op === "ema" || indicator.op === "rsi";
  const showSource = indicator.op !== "constant";

  return (
    <div className="flex flex-wrap items-end gap-2 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
      <label className="grow basis-40 text-sm">
        <span className="mb-1 block text-xs text-zinc-500">Type</span>
        <Select
          value={indicator.op}
          onChange={(e) => onChange({ op: e.target.value as IndicatorOp })}
        >
          {INDICATOR_OPS.map((o) => (
            <option key={o.op} value={o.op}>
              {o.label}
            </option>
          ))}
        </Select>
      </label>

      {showPeriod && (
        <label className="basis-24 text-sm">
          <span className="mb-1 block text-xs text-zinc-500">Period</span>
          <Input
            type="number"
            min={1}
            value={indicator.period}
            className={invalid ? "border-rose-400" : undefined}
            onChange={(e) => onChange({ period: Number(e.target.value) })}
          />
        </label>
      )}

      {showSource && (
        <label className="basis-28 text-sm">
          <span className="mb-1 block text-xs text-zinc-500">Source</span>
          <Select
            value={indicator.source}
            onChange={(e) => onChange({ source: e.target.value as PriceSource })}
          >
            {PRICE_SOURCES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </label>
      )}

      {indicator.op === "constant" && (
        <label className="basis-28 text-sm">
          <span className="mb-1 block text-xs text-zinc-500">Value</span>
          <Input
            type="number"
            step="any"
            value={indicator.value}
            className={invalid ? "border-rose-400" : undefined}
            onChange={(e) => onChange({ value: Number(e.target.value) })}
          />
        </label>
      )}

      <span className="basis-full text-xs text-zinc-400 sm:basis-auto sm:grow">
        {indicatorLabel(indicator)}
      </span>
      <Button variant="ghost" size="sm" onClick={onRemove}>
        Remove
      </Button>
    </div>
  );
}

function RuleGroup({
  title,
  subtitle,
  group,
  conditions,
  indicators,
  errorFields,
  onAdd,
  onUpdate,
  onRemove,
}: {
  title: string;
  subtitle: string;
  group: "entry" | "exit";
  conditions: BuilderCondition[];
  indicators: BuilderIndicator[];
  errorFields: Set<string>;
  onAdd: () => void;
  onUpdate: (id: string, patch: Partial<BuilderCondition>) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <Card>
      <CardHeader
        title={title}
        subtitle={subtitle}
        action={
          <Button
            variant="secondary"
            size="sm"
            onClick={onAdd}
            disabled={indicators.length === 0}
          >
            Add condition
          </Button>
        }
      />
      <CardBody className="space-y-2">
        {conditions.map((c) => (
          <div
            key={c.id}
            className={`flex flex-wrap items-center gap-2 rounded-lg border p-2 ${
              errorFields.has(c.id)
                ? "border-rose-300 dark:border-rose-900/50"
                : "border-zinc-200 dark:border-zinc-800"
            }`}
          >
            <Select
              className="grow basis-32"
              value={c.left}
              onChange={(e) => onUpdate(c.id, { left: e.target.value })}
            >
              {indicators.map((i) => (
                <option key={i.id} value={i.id}>
                  {indicatorLabel(i)}
                </option>
              ))}
            </Select>
            <Select
              className="grow basis-36"
              value={c.comparator}
              onChange={(e) =>
                onUpdate(c.id, { comparator: e.target.value as Comparator })
              }
            >
              {COMPARATORS.map((o) => (
                <option key={o.op} value={o.op}>
                  {o.label}
                </option>
              ))}
            </Select>
            <Select
              className="grow basis-32"
              value={c.right}
              onChange={(e) => onUpdate(c.id, { right: e.target.value })}
            >
              {indicators.map((i) => (
                <option key={i.id} value={i.id}>
                  {indicatorLabel(i)}
                </option>
              ))}
            </Select>
            <Button variant="ghost" size="sm" onClick={() => onRemove(c.id)}>
              Remove
            </Button>
          </div>
        ))}
        {conditions.length === 0 && (
          <p className="text-sm text-zinc-500">
            {group === "entry"
              ? "Add at least one entry condition."
              : "No exit rule yet."}
          </p>
        )}
      </CardBody>
    </Card>
  );
}
