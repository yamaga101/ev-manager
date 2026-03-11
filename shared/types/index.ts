export interface ChargingLocation {
  id: string;
  name: string;
  voltage: number;
  amperage: number;
  kw: number;
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
  | "tire"        // タイヤ
  | "brake"       // ブレーキ
  | "wiper"       // ワイパー
  | "battery12v"  // 12Vバッテリー
  | "coolant"     // 冷却液
  | "inspection"  // 車検・点検
  | "wash"        // 洗車
  | "other";      // その他

export interface MaintenanceRecord {
  id: string;
  date: string;             // ISO date
  category: MaintenanceCategory;
  description: string;
  cost: number;
  odometer?: number;
  nextDueDate?: string;     // next maintenance due
  nextDueOdometer?: number;
  memo?: string;
  createdAt: string;
}

export interface InspectionRecord {
  id: string;
  date: string;
  type: "shaken" | "12month" | "6month"; // 車検, 12ヶ月点検, 6ヶ月点検
  soh?: number;             // Battery SOH at inspection
  odometer: number;
  cost: number;
  nextDueDate: string;      // next inspection due
  findings?: string;        // 所見
  createdAt: string;
}

// --- Vehicle Registration ---
export interface VehicleRegistration {
  plateNumber: string;
  vin: string;
  model: string;
  year: number;
  color: string;
  expiryDate: string; // vehicle inspection expiry (ISO date)
  purchaseDate?: string;
  memo?: string;
}

// --- Insurance ---
export interface InsuranceRecord {
  id: string;
  provider: string;
  policyNumber: string;
  type: "mandatory" | "voluntary"; // jibaiseki / nin-i
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

// --- Tax ---
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

// --- Drive Log ---
export interface DriveLogRecord {
  id: string;
  date: string;
  departure: string;
  destination: string;
  distance: number;
  startOdometer: number;
  endOdometer: number;
  efficiency?: number; // km/kWh
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

export type GasPayload =
  | ChargingGasPayload
  | MaintenanceGasPayload
  | InspectionGasPayload
  | InsuranceGasPayload
  | TaxGasPayload
  | DriveLogGasPayload;

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
