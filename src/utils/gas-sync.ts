// Re-export shared functions
export { buildGasPayload, buildMaintenanceGasPayload, buildInspectionGasPayload, buildInsuranceGasPayload, buildTaxGasPayload, buildDriveLogGasPayload, sendToGas } from "../../shared/utils/gas-sync.ts";
export { retryQueue as _retryQueueShared } from "../../shared/utils/gas-sync.ts";

// Web-specific wrapper: automatically passes navigator.onLine
import type { GasPayload } from "../types/index.ts";
import { retryQueue as retryQueueShared } from "../../shared/utils/gas-sync.ts";

export async function retryQueue(
  gasUrl: string,
  queue: GasPayload[],
): Promise<{ remaining: GasPayload[]; sentCount: number }> {
  return retryQueueShared(gasUrl, queue, navigator.onLine);
}
