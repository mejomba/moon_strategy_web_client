import { CardHeader } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { PageHeader } from "@/components/PageHeader";
import { StrategyList } from "@/components/strategy/StrategyList";
import { BacktestList } from "@/components/backtest/BacktestList";

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Build no-code trading strategies, backtest them on historical data, and review performance."
        action={<LinkButton href="/strategies/new">New strategy</LinkButton>}
      />

      <section className="space-y-3">
        <CardHeader
          title="Strategies"
          action={
            <LinkButton href="/strategies" variant="ghost" size="sm">
              View all
            </LinkButton>
          }
        />
        <StrategyList limit={4} />
      </section>

      <section className="space-y-3">
        <CardHeader
          title="Recent backtests"
          action={
            <LinkButton href="/backtests" variant="ghost" size="sm">
              View all
            </LinkButton>
          }
        />
        <BacktestList limit={5} />
      </section>
    </div>
  );
}
