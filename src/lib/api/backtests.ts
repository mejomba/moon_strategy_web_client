/**
 * Backtest API resource: list/get runs, kick off a new run, and read the trade
 * log behind a completed run.
 */

import { api, unwrapList } from "@/lib/api/client";
import type {
  BacktestDTO,
  CreateBacktestPayload,
  Paginated,
  TradeDTO,
} from "@/lib/api/types";

const RESOURCE = "/backtests/";

export async function listBacktests(
  query?: { strategy?: number },
  signal?: AbortSignal,
): Promise<BacktestDTO[]> {
  const data = await api.get<BacktestDTO[] | Paginated<BacktestDTO>>(
    RESOURCE,
    query,
    signal,
  );
  return unwrapList(data);
}

export async function getBacktest(
  id: number,
  signal?: AbortSignal,
): Promise<BacktestDTO> {
  return api.get<BacktestDTO>(`${RESOURCE}${id}/`, undefined, signal);
}

/** Queue a new backtest run. The backend executes and fills in metrics. */
export async function createBacktest(
  payload: CreateBacktestPayload,
): Promise<BacktestDTO> {
  return api.post<BacktestDTO>(RESOURCE, payload);
}

export async function listTrades(
  backtestId: number,
  signal?: AbortSignal,
): Promise<TradeDTO[]> {
  const data = await api.get<TradeDTO[] | Paginated<TradeDTO>>(
    `${RESOURCE}${backtestId}/trades/`,
    undefined,
    signal,
  );
  return unwrapList(data);
}
