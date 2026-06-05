"use client";

import Link from "next/link";

import { Badge, statusTone } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState, ErrorState, Loading } from "@/components/ui/Feedback";
import { LinkButton } from "@/components/ui/Button";
import { useAsync } from "@/hooks/useAsync";
import { listStrategies } from "@/lib/api/strategies";
import { STRATEGY_KINDS } from "@/lib/strategy/schema";

/** Client-rendered list of strategies with loading/error/empty states. */
export function StrategyList({ limit }: { limit?: number }) {
  const { data, loading, error } = useAsync((signal) => listStrategies(signal));

  if (loading) return <Loading label="Loading strategies…" />;
  if (error) return <ErrorState message={error} />;

  const strategies = (data ?? []).slice(0, limit);

  if (strategies.length === 0) {
    return (
      <EmptyState
        title="No strategies yet"
        description="Create your first strategy to start backtesting."
        action={<LinkButton href="/strategies/new">New strategy</LinkButton>}
      />
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {strategies.map((s) => (
        <Link key={s.id} href={`/strategies/${s.id}`} className="block">
          <Card className="h-full px-4 py-3 transition hover:border-zinc-300 hover:shadow dark:hover:border-zinc-700">
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium text-zinc-900 dark:text-zinc-50">{s.name}</p>
              <Badge tone={statusTone(s.status)}>{s.status}</Badge>
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              {STRATEGY_KINDS[s.kind]?.label ?? s.kind}
            </p>
            {s.description && (
              <p className="mt-2 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
                {s.description}
              </p>
            )}
          </Card>
        </Link>
      ))}
    </div>
  );
}
