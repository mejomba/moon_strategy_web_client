"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Field, Input, Select } from "@/components/ui/Field";
import { ErrorState } from "@/components/ui/Feedback";
import { LegalDisclaimer } from "@/components/LegalDisclaimer";
import { useAsync } from "@/hooks/useAsync";
import { createBacktest } from "@/lib/api/backtests";
import { listDatasets } from "@/lib/api/marketdata";
import { clampDate, dateOnly } from "@/lib/dateRange";
import { formatDate } from "@/lib/format";
import type { CreateBacktestPayload } from "@/lib/api/types";

/** Default cost assumptions mirror the backend `Backtest` model defaults (§7). */
const DEFAULTS = {
  symbol: "BTCUSDT",
  timeframe: "1d",
  initial_capital: 10000,
  commission_pct: 0.0004,
  slippage_bps: 1,
  spread_bps: 1,
  funding_rate: 0,
  funding_interval_hours: 8,
};

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

/** Form to launch a backtest run for a given strategy. */
export function BacktestForm({ strategyId }: { strategyId: number }) {
  const router = useRouter();
  const [form, setForm] = useState({
    ...DEFAULTS,
    start_date: isoDaysAgo(365),
    end_date: isoDaysAgo(0),
  });
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const datasets = useAsync((signal) => listDatasets(signal));

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  // Coverage of the dataset matching the current symbol/timeframe (if any).
  const selectedDataset = (datasets.data ?? []).find(
    (d) => d.symbol === form.symbol && d.timeframe === form.timeframe,
  );
  const coverageStart = dateOnly(selectedDataset?.start);
  const coverageEnd = dateOnly(selectedDataset?.end);

  function pickDataset(value: string) {
    const ds = (datasets.data ?? []).find((d) => `${d.symbol}|${d.timeframe}` === value);
    if (!ds) return;
    // Auto-clamp the run window to the dataset's available coverage.
    const start = dateOnly(ds.start);
    const end = dateOnly(ds.end);
    setForm((f) => ({
      ...f,
      symbol: ds.symbol,
      timeframe: ds.timeframe,
      start_date: start ?? f.start_date,
      end_date: end ?? f.end_date,
    }));
  }

  function setDate(key: "start_date" | "end_date", value: string) {
    set(key, clampDate(value, coverageStart, coverageEnd));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setRunning(true);
    setError(null);
    const payload: CreateBacktestPayload = {
      strategy: strategyId,
      symbol: form.symbol,
      timeframe: form.timeframe,
      start_date: form.start_date,
      end_date: form.end_date,
      // Decimal field: the schema types it as a string.
      initial_capital: String(form.initial_capital),
      commission_pct: form.commission_pct,
      slippage_bps: form.slippage_bps,
      spread_bps: form.spread_bps,
      funding_rate: form.funding_rate,
      funding_interval_hours: form.funding_interval_hours,
    };
    try {
      const created = await createBacktest(payload);
      router.push(`/backtests/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start backtest.");
      setRunning(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader title="Market & period" />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          {(datasets.data ?? []).length > 0 && (
            <div className="sm:col-span-2">
              <Field
                label="Use stored dataset"
                htmlFor="dataset"
                hint="Pick imported data, or type a symbol below for the synthetic fallback."
              >
                <Select
                  id="dataset"
                  value={`${form.symbol}|${form.timeframe}`}
                  onChange={(e) => pickDataset(e.target.value)}
                >
                  <option value="">— Custom / synthetic —</option>
                  {(datasets.data ?? []).map((d) => (
                    <option
                      key={`${d.symbol}|${d.timeframe}`}
                      value={`${d.symbol}|${d.timeframe}`}
                    >
                      {d.symbol} · {d.timeframe} ({formatDate(d.start)}–
                      {formatDate(d.end)})
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          )}
          <Field label="Symbol" htmlFor="symbol" hint="Crypto pair, e.g. BTCUSDT">
            <Input
              id="symbol"
              value={form.symbol}
              onChange={(e) => set("symbol", e.target.value)}
            />
          </Field>
          <Field label="Timeframe" htmlFor="timeframe" hint="e.g. 1m, 1h, 1d">
            <Input
              id="timeframe"
              value={form.timeframe}
              onChange={(e) => set("timeframe", e.target.value)}
            />
          </Field>
          <Field
            label="Start date"
            htmlFor="start_date"
            hint={coverageStart ? `Data from ${formatDate(coverageStart)}` : undefined}
          >
            <Input
              id="start_date"
              type="date"
              min={coverageStart}
              max={coverageEnd}
              value={form.start_date}
              onChange={(e) => setDate("start_date", e.target.value)}
            />
          </Field>
          <Field
            label="End date"
            htmlFor="end_date"
            hint={coverageEnd ? `Data to ${formatDate(coverageEnd)}` : undefined}
          >
            <Input
              id="end_date"
              type="date"
              min={coverageStart}
              max={coverageEnd}
              value={form.end_date}
              onChange={(e) => setDate("end_date", e.target.value)}
            />
          </Field>
          <Field label="Initial capital" htmlFor="capital">
            <Input
              id="capital"
              type="number"
              min={1}
              value={form.initial_capital}
              onChange={(e) => set("initial_capital", Number(e.target.value))}
            />
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Trading costs"
          subtitle="Realistic costs keep results honest — never backtest cost-free (§7)."
        />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Commission (fraction/side)"
            htmlFor="commission"
            hint="0.0004 = 0.04%"
          >
            <Input
              id="commission"
              type="number"
              step="any"
              min={0}
              value={form.commission_pct}
              onChange={(e) => set("commission_pct", Number(e.target.value))}
            />
          </Field>
          <Field label="Slippage (bps/side)" htmlFor="slippage">
            <Input
              id="slippage"
              type="number"
              step="any"
              min={0}
              value={form.slippage_bps}
              onChange={(e) => set("slippage_bps", Number(e.target.value))}
            />
          </Field>
          <Field label="Spread (bps/side)" htmlFor="spread">
            <Input
              id="spread"
              type="number"
              step="any"
              min={0}
              value={form.spread_bps}
              onChange={(e) => set("spread_bps", Number(e.target.value))}
            />
          </Field>
          <Field label="Funding rate (fraction/interval)" htmlFor="funding">
            <Input
              id="funding"
              type="number"
              step="any"
              value={form.funding_rate}
              onChange={(e) => set("funding_rate", Number(e.target.value))}
            />
          </Field>
          <Field label="Funding interval (hours)" htmlFor="funding_h">
            <Input
              id="funding_h"
              type="number"
              step="any"
              min={0}
              value={form.funding_interval_hours}
              onChange={(e) => set("funding_interval_hours", Number(e.target.value))}
            />
          </Field>
        </CardBody>
      </Card>

      <LegalDisclaimer />

      {error && <ErrorState message={error} />}

      <div className="flex justify-end">
        <Button type="submit" disabled={running}>
          {running ? "Running…" : "Run backtest"}
        </Button>
      </div>
    </form>
  );
}
