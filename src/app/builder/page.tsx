import { PageHeader } from "@/components/PageHeader";
import { StrategyBuilder } from "@/components/builder/StrategyBuilder";

export default function BuilderPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Visual builder"
        description="Assemble indicators and rules — no code. It compiles to the strategy-JSON the backtest engine runs, then save and backtest it."
      />
      <StrategyBuilder />
    </div>
  );
}
