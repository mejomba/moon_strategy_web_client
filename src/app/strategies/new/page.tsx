"use client";

import { useRouter } from "next/navigation";

import { PageHeader } from "@/components/PageHeader";
import { StrategyForm } from "@/components/strategy/StrategyForm";
import { createStrategy } from "@/lib/api/strategies";
import { createEmptyModel } from "@/lib/strategy/serialize";
import type { StrategyModel } from "@/lib/strategy/schema";

export default function NewStrategyPage() {
  const router = useRouter();

  async function handleSubmit(model: StrategyModel) {
    const created = await createStrategy(model);
    router.push(`/strategies/${created.id}`);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="New strategy" description="Define a strategy to backtest." />
      <StrategyForm
        initialModel={createEmptyModel()}
        submitLabel="Create strategy"
        onSubmit={handleSubmit}
      />
    </div>
  );
}
