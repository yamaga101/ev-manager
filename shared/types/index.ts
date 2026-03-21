export interface ChargingLocation {
  id: string;
  name: string;
  voltage: number;
  amperage: number;
  kw: number;
  lat?: number;
  lng?: number;
  radiusMeters?: number;
  lastUsedAt?: string;
}

export interface ChargingSession {
  id: string;
  startTime: string;
  odometer: number;
  startBattery: number;
  startRange: number;
  efficiency: number;
  startedAt: number;
  locationName: string;
  voltage: number | string;
  amperage: number | string;
  kw: number | string;
  startRangeAcOn?: number;
  startSegmentCount?: number;
}

export interface ChargingRecord extends ChargingSession {
  endTime: string;
  endBattery: number;
  endRange: number;
  endRangeAcOn?: number;
  chargedKwh: number;
  cost: number;
  duration: number;
  chargeSpeed: number;
  /** Battery State of Health percentage (optional, user-entered) */
  soh?: number;
  // Legacy field names for migration compatibility
  timestamp?: string;
  battery?: number;
  batteryAfter?: number;
}

export interface VehicleSettings {
  batteryCapacity: number;
  electricityRate: number;
  nightRate: number;
  useNightRate: boolean;
  gasUrl: string;
  gasSharedToken?: string;
  geminiApiKey?: string;
}

export type ConfidenceLevel = "high" | "low" | "not_visible";

export interface MeterExtractResult {
  odometer: number | null;
  batteryPct: number | null;
  rangeKm: number | null;
  rangeAcOnKm: number | null;
  efficiencyKmPerKwh: number | null;
  segmentCount: number | null;
  capturedAt: string;
  confidence: {
    odometer: ConfidenceLevel;
    batteryPct: ConfidenceLevel;
    rangeKm: ConfidenceLevel;
    rangeAcOnKm: ConfidenceLevel;
    efficiencyKmPerKwh: ConfidenceLevel;
    segmentCount: ConfidenceLevel;
  };
}

export interface ChargingGasPayload {
  type: "charging";
  id: string;
  status: "completed";
  startTime: string;
  endTime: string;
  startOdometer: string;
  efficiency: string;
  startSoC: string;
  endSoC: string;
  startRange: string;
  endRange: string;
  location: string;
  addedKwh: string;
  cost: string;
  startRangeAcOn?: string;
  endRangeAcOn?: string;
}

export interface MaintenanceGasPayload {
  type: "maintenance";
  id: string;
  date: string;
  category: string;
  description: string;
  cost: string;
  odometer: string;
  nextDueDate: string;
  memo: string;
}

export interface InspectionGasPayload {
  type: "inspection";
  id: string;
  date: string;
  inspectionType: string;
  odometer: string;
  cost: string;
  soh: string;
  nextDueDate: string;
  findings: string;
}

export type MaintenanceCategory =
  | "tire"
  | "brake"
  | "wiper"
  | "battery12v"
  | "coolant"
  | "inspection"
  | "wash"
  | "other";

export interface MaintenanceRecord {
  id: string;
  date: string;
  category: MaintenanceCategory;
  description: string;
  cost: number;
  odometer?: number;
  nextDueDate?: string;
  nextDueOdometer?: number;
  memo?: string;
  createdAt: string;
}

export interface InspectionRecord {
  id: string;
  date: string;
  type: "shaken" | "12month" | "6month";
  soh?: number;
  odometer: number;
  cost: number;
  nextDueDate: string;
  findings?: string;
  createdAt: string;
}

export interface VehicleRegistration {
  plateNumber: string;
  vin: string;
  model: string;
  year: number;
  color: string;
  expiryDate: string;
  purchaseDate?: string;
  memo?: string;
}

export interface InsuranceRecord {
  id: string;
  provider: string;
  policyNumber: string;
  type: "mandatory" | "voluntary";
  coverageSummary: string;
  premium: number;
  startDate: string;
  endDate: string;
  referenceNumber?: string;
  memo?: string;
  createdAt: string;
}

export interface InsuranceGasPayload {
  type: "insurance";
  id: string;
  provider: string;
  policyNumber: string;
  insuranceType: string;
  coverageSummary: string;
  premium: string;
  startDate: string;
  endDate: string;
  memo: string;
}

export type TaxType = "automobile" | "weight" | "env" | "other";

export interface TaxRecord {
  id: string;
  taxType: TaxType;
  amount: number;
  dueDate: string;
  paidDate?: string;
  fiscalYear: number;
  memo?: string;
  createdAt: string;
}

export interface TaxGasPayload {
  type: "tax";
  id: string;
  taxType: string;
  amount: string;
  dueDate: string;
  paidDate: string;
  fiscalYear: string;
  memo: string;
}

export interface DriveLogRecord {
  id: string;
  date: string;
  departure: string;
  destination: string;
  distance: number;
  startOdometer: number;
  endOdometer: number;
  efficiency?: number;
  purpose?: string;
  memo?: string;
  createdAt: string;
}

export interface DriveLogGasPayload {
  type: "driveLog";
  id: string;
  date: string;
  departure: string;
  destination: string;
  distance: string;
  startOdometer: string;
  endOdometer: string;
  efficiency: string;
  purpose: string;
  memo: string;
}

export interface PingGasPayload {
  type: "ping";
}

export type GasPayload =
  | ChargingGasPayload
  | MaintenanceGasPayload
  | InspectionGasPayload
  | InsuranceGasPayload
  | TaxGasPayload
  | DriveLogGasPayload
  | PingGasPayload;

export interface GasRequestOptions {
  idempotencyKey?: string;
  token?: string;
}

export type Theme = "light" | "dark" | "system";
export type Language = "en" | "ja";
export type TabId = "charging" | "history" | "vehicle" | "stats" | "settings";
export type VehicleSubTab = "info" | "insurance" | "tax" | "maintenance" | "inspection";
export type HistorySubTab = "charging" | "driveLog";

export interface ChargeSpeedBadge {
  emoji: string;
  label: string;
  color: string;
}

export type SyncStatus = "pending" | "sending" | "acked" | "failed";

export interface SyncEnvelope {
  envelopeId: string;
  idempotencyKey: string;
  payload: GasPayload;
  status: SyncStatus;
  retryCount: number;
  lastError?: string;
  createdAt: string;
  lastAttemptAt?: string;
}
