/**
 * Strategy API resource. Endpoints translate the canonical {@link StrategyModel}
 * to/from backend payloads so callers never touch the wire shape directly.
 */

import { api, unwrapList } from "@/lib/api/client";
import type { Paginated, StrategyDTO } from "@/lib/api/types";
import { deserializeStrategy, serializeStrategy } from "@/lib/strategy/serialize";
import type { StrategyModel } from "@/lib/strategy/schema";

const RESOURCE = "/strategies/";

export async function listStrategies(signal?: AbortSignal): Promise<StrategyDTO[]> {
  const data = await api.get<StrategyDTO[] | Paginated<StrategyDTO>>(
    RESOURCE,
    undefined,
    signal,
  );
  return unwrapList(data);
}

export async function getStrategy(
  id: number,
  signal?: AbortSignal,
): Promise<StrategyDTO> {
  return api.get<StrategyDTO>(`${RESOURCE}${id}/`, undefined, signal);
}

/** Load a strategy already parsed into the canonical model. */
export async function getStrategyModel(
  id: number,
  signal?: AbortSignal,
): Promise<{ id: number; model: StrategyModel }> {
  const dto = await getStrategy(id, signal);
  return { id: dto.id, model: deserializeStrategy(dto) };
}

export async function createStrategy(model: StrategyModel): Promise<StrategyDTO> {
  return api.post<StrategyDTO>(RESOURCE, serializeStrategy(model));
}

export async function updateStrategy(
  id: number,
  model: StrategyModel,
): Promise<StrategyDTO> {
  return api.patch<StrategyDTO>(`${RESOURCE}${id}/`, serializeStrategy(model));
}

export async function deleteStrategy(id: number): Promise<void> {
  await api.delete<void>(`${RESOURCE}${id}/`);
}
