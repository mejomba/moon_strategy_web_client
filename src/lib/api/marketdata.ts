/**
 * Market-data API resource: list stored datasets and import OHLCV CSV files.
 */

import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/client";
import { API_BASE_URL } from "@/lib/config";
import type { components } from "@/lib/api/generated";

export type DatasetDTO = components["schemas"]["Dataset"];
export type ImportResultDTO = components["schemas"]["ImportResult"];

export type DatasetDeleteResultDTO = components["schemas"]["DatasetDeleteResult"];

export async function listDatasets(signal?: AbortSignal): Promise<DatasetDTO[]> {
  return api.get<DatasetDTO[]>("/marketdata/datasets/", undefined, signal);
}

/** Delete all candles for a (symbol, timeframe) dataset. */
export async function deleteDataset(
  symbol: string,
  timeframe: string,
): Promise<DatasetDeleteResultDTO> {
  return api.delete<DatasetDeleteResultDTO>(
    `/marketdata/datasets/${encodeURIComponent(symbol)}/${encodeURIComponent(timeframe)}/`,
  );
}

/**
 * Upload a CSV of candles. Uses multipart/form-data, so it bypasses the JSON
 * client (the browser sets the multipart boundary itself).
 */
export async function importCandles(
  symbol: string,
  timeframe: string,
  file: File,
): Promise<ImportResultDTO> {
  const form = new FormData();
  form.append("symbol", symbol);
  form.append("timeframe", timeframe);
  form.append("file", file);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/marketdata/import/`, {
      method: "POST",
      body: form,
      cache: "no-store",
    });
  } catch (cause) {
    throw new ApiError("Network error reaching the API.", 0, cause);
  }

  const text = await response.text();
  const data = text ? JSON.parse(text) : undefined;
  if (!response.ok) {
    const detail =
      data && typeof data === "object" && Array.isArray(data.errors)
        ? data.errors.join(" ")
        : `Import failed (${response.status}).`;
    throw new ApiError(detail, response.status, data);
  }
  return data as ImportResultDTO;
}
