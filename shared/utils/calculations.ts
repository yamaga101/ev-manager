import type { ChargeSpeedBadge, VehicleSettings } from "../types";

/**
 * Returns the night rate if the given datetime (ISO string or Date) falls
 * between 22:00 and 08:00 (local time), otherwise the regular rate.
 * Falls back to the regular electricityRate when useNightRate is false.
 */
export function getAutoRate(
  settings: Pick<VehicleSettings, "electricityRate" | "nightRate" | "useNightRate">,
  startTime?: string | Date,
): number {
  if (!settings.useNightRate) return settings.electricityRate;
  const date = startTime ? new Date(startTime) : new Date();
  const hour = date.getHours();
  const isNightHour = hour >= 22 || hour < 8;
  return isNightHour ? settings.nightRate : settings.electricityRate;
}

export function calcChargedKwh(
  capacity: number,
  startPct: number,
  endPct: number,
): number {
  return (capacity * (endPct - startPct)) / 100;
}

export function calcCost(kwh: number, rate: number): number {
  return Math.round(kwh * rate);
}

export function calcDurationMinutes(
  startIso: string,
  endIso: string,
): number {
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime();
  return Math.max(0, ms / 60000);
}

export function calcChargeSpeed(kwh: number, durationMin: number): number {
  return durationMin > 0 ? kwh / (durationMin / 60) : 0;
}

export function getChargeSpeedBadge(kw: number): ChargeSpeedBadge {
  if (kw > 20) return { emoji: "\u{1F534}", label: "Rapid", color: "#EF4444" };
  if (kw >= 3) return { emoji: "\u{1F7E1}", label: "Normal", color: "#F59E0B" };
  return { emoji: "\u{1F7E2}", label: "Slow", color: "#22C55E" };
}

const LEAF_SEGMENT_SOH: Record<number, number> = {
  12: 100, 11: 85, 10: 79, 9: 72, 8: 66,
  7: 60, 6: 54, 5: 47, 4: 41, 3: 35,
  2: 29, 1: 22, 0: 0,
};

export function segmentCountToSoh(segments: number): number {
  return LEAF_SEGMENT_SOH[Math.round(segments)] ?? Math.round((segments / 12) * 100);
}
