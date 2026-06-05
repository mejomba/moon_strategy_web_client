/**
 * Shared API types — derived from the backend's OpenAPI schema (CLAUDE.md §2/§5).
 *
 * The wire shapes are NOT hand-written: `src/lib/api/generated.ts` is produced by
 * `npm run gen:api` from the vendored `openapi/schema.yaml` (refreshed from the
 * backend's `/api/schema/`). This module just gives those generated components
 * friendly names so feature code does not reach into `components["schemas"]`.
 *
 * Decimals (money/quantity) arrive as strings per the schema (Django
 * `DecimalField`); convert them at the edge with the helpers in `lib/format.ts`.
 */

import type { components } from "@/lib/api/generated";

type Schemas = components["schemas"];

export type StrategyDTO = Schemas["Strategy"];
/** Light backtest shape used by list endpoints (no equity curve). */
export type BacktestDTO = Schemas["Backtest"];
/** Full backtest shape from retrieve/create, including the equity curve. */
export type BacktestDetailDTO = Schemas["BacktestDetail"];
/** One sample of portfolio value over time. */
export type EquityPoint = Schemas["EquityPoint"];
export type TradeDTO = Schemas["Trade"];

/** Write payload to create a backtest run. */
export type CreateBacktestPayload = Schemas["BacktestCreate"];

export type BacktestStatus = Schemas["BacktestStatusEnum"];
export type TradeSide = Schemas["SideEnum"];

/** Generic DRF pagination envelope; the client also accepts a bare array. */
export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
