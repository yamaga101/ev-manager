import { CSV_HEADERS } from "../constants/defaults.ts";
import type { ChargingRecord, VehicleSettings, Language } from "../types/index.ts";
import { calcChargedKwh, calcCost, calcDurationMinutes, calcChargeSpeed } from "./calculations.ts";
import { formatDate, formatDuration } from "./formatting.ts";
import { DEFAULT_BATTERY_CAPACITY, DEFAULT_ELECTRICITY_RATE } from "../constants/defaults.ts";

export function exportCSV(
  history: ChargingRecord[],
  settings: VehicleSettings,
  lang: Language,
): void {
  const capacity = settings.batteryCapacity || DEFAULT_BATTERY_CAPACITY;
  const rate = settings.electricityRate || DEFAULT_ELECTRICITY_RATE;
  const BOM = "\uFEFF";
  const headers = CSV_HEADERS[lang];

  const rows = history.map((h) => {
    const kwh = calcChargedKwh(
      capacity,
      h.startBattery || 0,
      h.endBattery || h.batteryAfter || 0,
    );
    const cost = calcCost(kwh, rate);
    const duration =
      h.startTime && h.endTime
        ? calcDurationMinutes(h.startTime, h.endTime)
        : 0;
    const speed = calcChargeSpeed(kwh, duration);

    return [
      h.startTime ? formatDate(h.startTime) : formatDate(h.timestamp || ""),
      h.startTime || "",
      h.endTime || "",
      h.odometer || "",
      h.startBattery || h.battery || "",
      h.endBattery || h.batteryAfter || "",
      h.startRange || "",
      h.endRange || "",
      kwh.toFixed(1),
      cost,
      formatDuration(duration),
      speed.toFixed(1),
      h.efficiency || "",
      h.locationName || "",
      h.startRangeAcOn ?? "",
      h.endRangeAcOn ?? "",
    ]
      .map((v) => `"${v}"`)
      .join(",");
  });

  const csv = BOM + headers.join(",") + "\n" + rows.join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ev-gravity-log-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
