"use client";

import { use } from "react";
import Link from "next/link";

import { Badge, statusTone } from "@/components/ui/Badge";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ErrorState, Loading } from "@/components/ui/Feedback";
import { PageHeader } from "@/components/PageHeader";
import { BacktestForm } from "@/components/backtest/BacktestForm";
import { BacktestList } from "@/components/backtest/BacktestList";
import { useAsync } from "@/hooks/useAsync";
import { getStrategyModel } from "@/lib/api/strategies";
import { kindLabel } from "@/lib/strategy/schema";

export default function StrategyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const strategyId = Number(id);

  const { data, loading, error } = useAsync(
    (signal) => getStrategyModel(strategyId, signal),
    [strategyId],
  );

  if (loading) return <Loading label="Loading strategy…" />;
  if (error) return <ErrorState message={error} />;
  if (!data) return <ErrorState message="Strategy not found." />;

  const { model } = data;
  const isGraph = model.kind === "graph";

  return (
    <div className="space-y-8">
      <PageHeader
        title={model.name || `Strategy #${strategyId}`}
        description={model.description || undefined}
        action={<Badge tone={statusTone(model.status)}>{model.status}</Badge>}
      />

      <Card>
        <CardHeader title="Definition" subtitle={kindLabel(model.kind)} />
        <CardBody>
          {isGraph ? (
            <p className="text-sm text-zinc-500">
              Built with the visual builder · {model.graph?.nodes.length ?? 0} blocks. The
              logic graph is the executable strategy-JSON the engine runs.
            </p>
          ) : (
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {Object.entries(model.parameters).map(([key, value]) => (
                <div
                  key={key}
                  className="rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-900"
                >
                  <dt className="text-xs uppercase tracking-wide text-zinc-500">{key}</dt>
                  <dd className="font-medium tabular-nums">{String(value)}</dd>
                </div>
              ))}
            </dl>
          )}
        </CardBody>
      </Card>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Run a backtest</h2>
        <BacktestForm strategyId={strategyId} />
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">History</h2>
          <Link href="/backtests" className="text-sm text-zinc-500 hover:text-zinc-800">
            All backtests
          </Link>
        </div>
        <BacktestList strategyId={strategyId} />
      </section>
    </div>
  );
}
