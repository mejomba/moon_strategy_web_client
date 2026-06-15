"use client";

import { use } from "react";
import Link from "next/link";

import { Badge, statusTone } from "@/components/ui/Badge";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ErrorState, Loading } from "@/components/ui/Feedback";
import { PageHeader } from "@/components/PageHeader";
import { LegalDisclaimer } from "@/components/LegalDisclaimer";
import { MetricsReport } from "@/components/backtest/MetricsReport";
import { EquityCurveChart } from "@/components/backtest/EquityCurveChart";
import { DrawdownChart } from "@/components/backtest/DrawdownChart";
import { MonthlyReturns } from "@/components/backtest/MonthlyReturns";
import { BacktestWarnings } from "@/components/backtest/BacktestWarnings";
import { TradeStats } from "@/components/backtest/TradeStats";
import { TradesTable } from "@/components/backtest/TradesTable";
import { useAsync } from "@/hooks/useAsync";
import { getBacktest, listTrades } from "@/lib/api/backtests";
import { formatDate } from "@/lib/format";

export default function BacktestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const backtestId = Number(id);

  const bt = useAsync((signal) => getBacktest(backtestId, signal), [backtestId]);
  const trades = useAsync((signal) => listTrades(backtestId, signal), [backtestId]);

  if (bt.loading) return <Loading label="Loading backtest…" />;
  if (bt.error) return <ErrorState message={bt.error} />;
  if (!bt.data) return <ErrorState message="Backtest not found." />;

  const backtest = bt.data;
  const isComplete = backtest.status === "completed";

  return (
    <div className="space-y-8">
      <PageHeader
        title={`${backtest.strategy_name ?? `Strategy #${backtest.strategy}`} · ${backtest.symbol}`}
        description={`${backtest.timeframe} · ${formatDate(backtest.start_date)} → ${formatDate(backtest.end_date)}`}
        action={<Badge tone={statusTone(backtest.status)}>{backtest.status}</Badge>}
      />

      {backtest.status === "failed" && backtest.error_message && (
        <ErrorState message={backtest.error_message} />
      )}

      {isComplete ? (
        <>
          <BacktestWarnings warnings={backtest.warnings} />
          <MetricsReport backtest={backtest} />
          <Card>
            <CardHeader
              title="Equity curve"
              subtitle="Portfolio value over time, net of trading costs."
            />
            <CardBody>
              <EquityCurveChart
                points={backtest.equity_curve}
                initialCapital={Number(backtest.initial_capital)}
              />
            </CardBody>
          </Card>
          <Card>
            <CardHeader
              title="Drawdown"
              subtitle="Decline from the running equity peak (downside risk)."
            />
            <CardBody>
              <DrawdownChart points={backtest.equity_curve} />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Monthly returns" />
            <CardBody>
              <MonthlyReturns
                points={backtest.equity_curve}
                initialCapital={Number(backtest.initial_capital)}
              />
            </CardBody>
          </Card>
        </>
      ) : (
        <Card>
          <CardBody>
            <p className="text-sm text-zinc-500">
              Metrics will appear here once the run completes.
            </p>
          </CardBody>
        </Card>
      )}

      <LegalDisclaimer />

      <Card>
        <CardHeader
          title="Trades"
          subtitle="Simulated trades, with commission shown net of costs."
          action={
            <Link
              href={`/strategies/${backtest.strategy}`}
              className="text-sm text-zinc-500 hover:text-zinc-800"
            >
              View strategy
            </Link>
          }
        />
        <CardBody className="space-y-5">
          {trades.loading ? (
            <Loading label="Loading trades…" />
          ) : trades.error ? (
            <ErrorState message={trades.error} />
          ) : (
            <>
              <TradeStats trades={trades.data ?? []} />
              <TradesTable trades={trades.data ?? []} />
            </>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
