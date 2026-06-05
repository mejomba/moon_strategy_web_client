import { LinkButton } from "@/components/ui/Button";
import { PageHeader } from "@/components/PageHeader";
import { StrategyList } from "@/components/strategy/StrategyList";

export default function StrategiesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Strategies"
        description="Your saved strategy definitions."
        action={<LinkButton href="/strategies/new">New strategy</LinkButton>}
      />
      <StrategyList />
    </div>
  );
}
