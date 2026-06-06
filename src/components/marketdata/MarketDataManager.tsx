"use client";

import { useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Field";
import { EmptyState, ErrorState, Loading } from "@/components/ui/Feedback";
import { useAsync } from "@/hooks/useAsync";
import {
  deleteDataset,
  importCandles,
  listDatasets,
  type ImportResultDTO,
} from "@/lib/api/marketdata";
import { formatDate, formatNumber } from "@/lib/format";

export function MarketDataManager() {
  const { data, loading, error, reload } = useAsync((signal) => listDatasets(signal));
  const [symbol, setSymbol] = useState("BTCUSDT");
  const [timeframe, setTimeframe] = useState("1d");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResultDTO | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleDelete(sym: string, tf: string) {
    const key = `${sym}|${tf}`;
    if (!window.confirm(`Delete all ${sym} · ${tf} candles? This cannot be undone.`)) {
      return;
    }
    setDeleting(key);
    try {
      await deleteDataset(sym, tf);
      reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setDeleting(null);
    }
  }

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setResult(null);
    if (!symbol.trim() || !timeframe.trim() || !file) {
      setFormError("Symbol, timeframe and a CSV file are required.");
      return;
    }
    setBusy(true);
    try {
      const res = await importCandles(symbol.trim(), timeframe.trim(), file);
      setResult(res);
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader
          title="Import data"
          subtitle="CSV columns: timestamp, open, high, low, close[, volume]"
        />
        <CardBody>
          <form onSubmit={handleImport} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Symbol" htmlFor="symbol" hint="e.g. BTCUSDT">
                <Input
                  id="symbol"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                />
              </Field>
              <Field label="Timeframe" htmlFor="tf" hint="e.g. 1d, 1h">
                <Input
                  id="tf"
                  value={timeframe}
                  onChange={(e) => setTimeframe(e.target.value)}
                />
              </Field>
            </div>
            <Field label="CSV file" htmlFor="file">
              <input
                id="file"
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-zinc-600 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-900 file:px-3 file:py-1.5 file:text-white dark:text-zinc-300 dark:file:bg-zinc-100 dark:file:text-zinc-900"
              />
            </Field>

            {formError && <ErrorState message={formError} />}
            {result && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
                Imported {result.imported} rows ({result.stored} new). Skipped{" "}
                {result.skipped}, duplicates {result.duplicates}.
                {result.errors.length > 0 && (
                  <ul className="mt-2 list-disc pl-5 text-xs text-emerald-700 dark:text-emerald-400">
                    {result.errors.slice(0, 5).map((m, i) => (
                      <li key={i}>{m}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <div className="flex justify-end">
              <Button type="submit" disabled={busy}>
                {busy ? "Importing…" : "Import CSV"}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Stored datasets" subtitle="Available to backtests" />
        <CardBody>
          {loading ? (
            <Loading label="Loading datasets…" />
          ) : error ? (
            <ErrorState message={error} />
          ) : (data ?? []).length === 0 ? (
            <EmptyState
              title="No data yet"
              description="Import a CSV to make real candles available for backtests."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800">
                    <th className="px-2 py-2 font-medium">Symbol</th>
                    <th className="px-2 py-2 font-medium">TF</th>
                    <th className="px-2 py-2 text-right font-medium">Candles</th>
                    <th className="px-2 py-2 font-medium">Coverage</th>
                    <th className="px-2 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {(data ?? []).map((d) => (
                    <tr
                      key={`${d.symbol}-${d.timeframe}`}
                      className="border-b border-zinc-100 last:border-0 dark:border-zinc-900"
                    >
                      <td className="px-2 py-2 font-medium">{d.symbol}</td>
                      <td className="px-2 py-2 text-zinc-500">{d.timeframe}</td>
                      <td className="px-2 py-2 text-right tabular-nums">
                        {formatNumber(d.count, 0)}
                      </td>
                      <td className="px-2 py-2 text-xs text-zinc-500">
                        {formatDate(d.start)} → {formatDate(d.end)}
                      </td>
                      <td className="px-2 py-2 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={deleting === `${d.symbol}|${d.timeframe}`}
                          onClick={() => handleDelete(d.symbol, d.timeframe)}
                        >
                          {deleting === `${d.symbol}|${d.timeframe}`
                            ? "Deleting…"
                            : "Delete"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
