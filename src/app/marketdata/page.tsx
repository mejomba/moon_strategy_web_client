import { PageHeader } from "@/components/PageHeader";
import { MarketDataManager } from "@/components/marketdata/MarketDataManager";

export default function MarketDataPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Market data"
        description="Import historical OHLCV data so backtests run on real candles instead of a synthetic series."
      />
      <MarketDataManager />
    </div>
  );
}
