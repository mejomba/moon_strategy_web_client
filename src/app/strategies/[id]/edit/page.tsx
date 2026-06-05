"use client";

import { use } from "react";

import { Card, CardBody } from "@/components/ui/Card";
import { ErrorState, Loading } from "@/components/ui/Feedback";
import { LinkButton } from "@/components/ui/Button";
import { PageHeader } from "@/components/PageHeader";
import { StrategyBuilder } from "@/components/builder/StrategyBuilder";
import { GraphCanvas } from "@/components/builder/GraphCanvas";
import { useAsync } from "@/hooks/useAsync";
import { getStrategyModel } from "@/lib/api/strategies";
import { decompileGraph } from "@/lib/strategy/builder";
import { emptyGraph } from "@/lib/strategy/schema";

export default function EditStrategyPage({
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

  if (model.kind !== "graph") {
    return (
      <Card>
        <CardBody className="space-y-3">
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            Only visual (graph) strategies can be edited in the builder.
          </p>
          <LinkButton href={`/strategies/${strategyId}`} variant="secondary">
            Back to strategy
          </LinkButton>
        </CardBody>
      </Card>
    );
  }

  const builderModel = decompileGraph(model.graph);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit · ${model.name || `Strategy #${strategyId}`}`}
        description="Adjust the rules and save your changes."
      />
      {builderModel ? (
        <StrategyBuilder
          strategyId={strategyId}
          initialModel={builderModel}
          initialName={model.name}
          initialDescription={model.description}
          initialStatus={model.status}
        />
      ) : (
        // The graph isn't representable in the guided form — edit it on the canvas.
        <GraphCanvas
          strategyId={strategyId}
          initialGraph={model.graph ?? emptyGraph()}
          initialName={model.name}
          initialDescription={model.description}
          initialStatus={model.status}
        />
      )}
    </div>
  );
}
