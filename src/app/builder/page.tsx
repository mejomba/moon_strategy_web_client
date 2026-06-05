import { PageHeader } from "@/components/PageHeader";
import { BuilderCanvas } from "@/components/builder/BuilderCanvas";
import { LegalDisclaimer } from "@/components/LegalDisclaimer";

export default function BuilderPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Visual builder"
        description="No-code strategy builder (Phase 2 skeleton). Assemble a logic graph from blocks; it compiles to the strategy-JSON source of truth."
      />
      <LegalDisclaimer />
      <BuilderCanvas />
    </div>
  );
}
