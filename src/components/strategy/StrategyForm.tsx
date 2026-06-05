"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { ErrorState } from "@/components/ui/Feedback";
import { ParamFields } from "@/components/strategy/ParamFields";
import { LegalDisclaimer } from "@/components/LegalDisclaimer";
import {
  STRATEGY_KIND_LIST,
  type ParamValue,
  type StrategyKind,
  type StrategyModel,
  type StrategyStatus,
} from "@/lib/strategy/schema";
import { withKind } from "@/lib/strategy/serialize";
import { validateStrategy } from "@/lib/strategy/validate";

const STATUSES: StrategyStatus[] = ["draft", "active", "archived"];

/**
 * Create/edit form bound to the canonical {@link StrategyModel}. All edits flow
 * through the model (the single source of truth); the parent decides how to
 * persist via `onSubmit`.
 */
export function StrategyForm({
  initialModel,
  submitLabel,
  onSubmit,
}: {
  initialModel: StrategyModel;
  submitLabel: string;
  onSubmit: (model: StrategyModel) => Promise<void>;
}) {
  const [model, setModel] = useState<StrategyModel>(initialModel);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const errors = useMemo(() => validateStrategy(model), [model]);
  const errorMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const e of errors) if (!map[e.field]) map[e.field] = e.message;
    return map;
  }, [errors]);

  function patch(partial: Partial<StrategyModel>) {
    setModel((m) => ({ ...m, ...partial }));
  }

  function setParam(key: string, value: ParamValue) {
    setModel((m) => ({ ...m, parameters: { ...m.parameters, [key]: value } }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    setSubmitError(null);
    if (errors.length > 0) return;

    setSaving(true);
    try {
      await onSubmit(model);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to save strategy.");
      setSaving(false);
    }
  }

  const show = (field: string) => (submitted ? errorMap[field] : undefined);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader title="Definition" subtitle="Name and lifecycle status" />
        <CardBody className="space-y-4">
          <Field label="Name" htmlFor="name" error={show("name")}>
            <Input
              id="name"
              value={model.name}
              maxLength={120}
              placeholder="e.g. BTC fast/slow crossover"
              onChange={(e) => patch({ name: e.target.value })}
            />
          </Field>
          <Field label="Description" htmlFor="description">
            <Textarea
              id="description"
              value={model.description}
              placeholder="What is the idea behind this strategy?"
              onChange={(e) => patch({ description: e.target.value })}
            />
          </Field>
          <Field label="Status" htmlFor="status">
            <Select
              id="status"
              value={model.status}
              onChange={(e) => patch({ status: e.target.value as StrategyStatus })}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Logic" subtitle="Strategy kind and its parameters" />
        <CardBody className="space-y-4">
          <Field label="Kind" htmlFor="kind">
            <Select
              id="kind"
              value={model.kind}
              onChange={(e) =>
                setModel((m) => withKind(m, e.target.value as StrategyKind))
              }
            >
              {STRATEGY_KIND_LIST.map((k) => (
                <option key={k.kind} value={k.kind}>
                  {k.label}
                </option>
              ))}
            </Select>
          </Field>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {STRATEGY_KIND_LIST.find((k) => k.kind === model.kind)?.description}
          </p>
          <ParamFields
            kind={model.kind}
            values={model.parameters}
            errors={submitted ? errorMap : {}}
            onChange={setParam}
          />
        </CardBody>
      </Card>

      <LegalDisclaimer />

      {submitError && <ErrorState message={submitError} />}

      <div className="flex justify-end gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
