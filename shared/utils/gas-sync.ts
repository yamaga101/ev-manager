import type {
  ChargingRecord,
  GasPayload,
  MaintenanceRecord,
  InspectionRecord,
  InsuranceRecord,
  TaxRecord,
  DriveLogRecord,
} from "../types";

export function buildGasPayload(record: ChargingRecord): GasPayload {
  return {
    type: "charging",
    id: record.id,
    status: "completed",
    startTime: String(record.startTime || ""),
    endTime: String(record.endTime || ""),
    startOdometer: String(record.odometer || ""),
    efficiency: String(record.efficiency || ""),
    startSoC: String(record.startBattery || ""),
    endSoC: String(record.endBattery || ""),
    startRange: String(record.startRange || ""),
    endRange: String(record.endRange || ""),
    location: String(record.locationName || ""),
    addedKwh: String(record.chargedKwh || ""),
    cost: String(record.cost || ""),
    startRangeAcOn: String(record.startRangeAcOn ?? ""),
    endRangeAcOn: String(record.endRangeAcOn ?? ""),
  };
}

export function buildMaintenanceGasPayload(record: MaintenanceRecord): GasPayload {
  return {
    type: "maintenance",
    id: record.id,
    date: String(record.date || ""),
    category: String(record.category || ""),
    description: String(record.description || ""),
    cost: String(record.cost || ""),
    odometer: String(record.odometer ?? ""),
    nextDueDate: String(record.nextDueDate || ""),
    memo: String(record.memo || ""),
  };
}

export function buildInspectionGasPayload(record: InspectionRecord): GasPayload {
  return {
    type: "inspection",
    id: record.id,
    date: String(record.date || ""),
    inspectionType: String(record.type || ""),
    odometer: String(record.odometer || ""),
    cost: String(record.cost || ""),
    soh: String(record.soh ?? ""),
    nextDueDate: String(record.nextDueDate || ""),
    findings: String(record.findings || ""),
  };
}

export function buildInsuranceGasPayload(record: InsuranceRecord): GasPayload {
  return {
    type: "insurance",
    id: record.id,
    provider: String(record.provider || ""),
    policyNumber: String(record.policyNumber || ""),
    insuranceType: String(record.type || ""),
    coverageSummary: String(record.coverageSummary || ""),
    premium: String(record.premium || ""),
    startDate: String(record.startDate || ""),
    endDate: String(record.endDate || ""),
    memo: String(record.memo || ""),
  };
}

export function buildTaxGasPayload(record: TaxRecord): GasPayload {
  return {
    type: "tax",
    id: record.id,
    taxType: String(record.taxType || ""),
    amount: String(record.amount || ""),
    dueDate: String(record.dueDate || ""),
    paidDate: String(record.paidDate || ""),
    fiscalYear: String(record.fiscalYear || ""),
    memo: String(record.memo || ""),
  };
}

export function buildDriveLogGasPayload(record: DriveLogRecord): GasPayload {
  return {
    type: "driveLog",
    id: record.id,
    date: String(record.date || ""),
    departure: String(record.departure || ""),
    destination: String(record.destination || ""),
    distance: String(record.distance || ""),
    startOdometer: String(record.startOdometer || ""),
    endOdometer: String(record.endOdometer || ""),
    efficiency: String(record.efficiency ?? ""),
    purpose: String(record.purpose || ""),
    memo: String(record.memo || ""),
  };
}

export async function sendToGas(
  gasUrl: string,
  payload: GasPayload,
  idempotencyKey?: string,
): Promise<boolean> {
  // Enforce HTTPS for security
  if (!gasUrl.startsWith("https://")) {
    throw new Error("GAS URL must use HTTPS protocol");
  }

  const body = idempotencyKey
    ? { ...payload, idempotencyKey }
    : payload;

  try {
    const response = await fetch(gasUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=UTF-8" },
      body: JSON.stringify(body),
    });
    const result = await response.json();
    return result.ok === true;
  } catch {
    return false;
  }
}

// isOnline is passed as a parameter so this works on both Web and Mobile
export async function retryQueue(
  gasUrl: string,
  queue: GasPayload[],
  isOnline: boolean,
): Promise<{ remaining: GasPayload[]; sentCount: number }> {
  if (queue.length === 0 || !isOnline || !gasUrl) {
    return { remaining: queue, sentCount: 0 };
  }

  const remaining: GasPayload[] = [];
  for (const item of queue) {
    const success = await sendToGas(gasUrl, item);
    if (!success) {
      remaining.push(item);
    }
  }

  return {
    remaining,
    sentCount: queue.length - remaining.length,
  };
}
