// Re-export shared builder functions
export {
  buildGasPayload,
  buildMaintenanceGasPayload,
  buildInspectionGasPayload,
  buildInsuranceGasPayload,
  buildTaxGasPayload,
  buildDriveLogGasPayload,
} from "../../shared/utils/gas-sync.ts";

// Web-specific sendToGas: routes through sync outbox for verified delivery
import type { GasPayload } from "../types/index.ts";
import { useSyncStore } from "../store/useSyncStore.ts";

export async function sendToGas(gasUrl: string, payload: GasPayload): Promise<boolean> {
  return useSyncStore.getState().syncSend(gasUrl, payload);
}

// Web-specific retryQueue: automatically passes navigator.onLine
import { retryQueue as retryQueueShared } from "../../shared/utils/gas-sync.ts";

export async function retryQueue(
  gasUrl: string,
  queue: GasPayload[],
): Promise<{ remaining: GasPayload[]; sentCount: number }> {
  return retryQueueShared(gasUrl, queue, navigator.onLine);
}
