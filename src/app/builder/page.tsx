import { PageHeader } from "@/components/PageHeader";
import { BuilderTabs } from "@/components/builder/BuilderTabs";

export default function BuilderPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Visual builder"
        description="Assemble indicators and rules — no code. Use the Guided form or the Canvas; both compile to the strategy-JSON the backtest engine runs."
      />
      <BuilderTabs />
    </div>
  );
}
