import { PageHeader } from "@/components/PageHeader";
import { BacktestList } from "@/components/backtest/BacktestList";

export default function BacktestsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Backtests"
        description="Every historical simulation run, newest first."
      />
      <BacktestList />
    </div>
  );
}
