import { useState, useCallback } from "react";
import { PlugZap, MapPin, ChevronDown, Moon } from "lucide-react";
import { SmartNumberInput } from "../inputs/SmartNumberInput.tsx";
import { DateTimeInput } from "../inputs/DateTimeInput.tsx";
import { Odometer } from "../inputs/Odometer.tsx";
import { MeterCaptureFlow } from "../meter-capture/MeterCaptureFlow.tsx";
import { useChargingStore } from "../../store/useChargingStore.ts";
import { useLocationStore } from "../../store/useLocationStore.ts";
import { useSettingsStore } from "../../store/useSettingsStore.ts";
import { useToastStore } from "../../store/useToastStore.ts";
import { getAutoRate } from "../../utils/calculations.ts";
import { generateId, getLocalISOString } from "../../utils/formatting.ts";
import type { MeterExtractResult } from "../../types/index.ts";
import type { Translations } from "../../i18n/index.ts";

interface StartChargingFormProps {
  t: Translations;
}

export function StartChargingForm({ t }: StartChargingFormProps) {
  const history = useChargingStore((s) => s.history);
  const startSession = useChargingStore((s) => s.startSession);
  const locations = useLocationStore((s) => s.locations);
  const settings = useSettingsStore((s) => s.settings);

  const showToast = useToastStore((s) => s.showToast);
  const geminiApiKey = settings.geminiApiKey ?? "";

  const lastRecord = history[0];
  const [startTime, setStartTime] = useState(getLocalISOString());
  const [odometer, setOdometer] = useState(lastRecord?.odometer ?? 10000);
  const [startBattery, setStartBattery] = useState(
    lastRecord?.endBattery ?? 50,
  );
  const [startRange, setStartRange] = useState(lastRecord?.endRange ?? 200);
  const [efficiency, setEfficiency] = useState(lastRecord?.efficiency ?? 6.0);
  const [selectedLocationId, setSelectedLocationId] = useState("");

  // Fix 1: determine if night rate applies based on the selected start time
  const appliedRate = getAutoRate(settings, startTime);
  const isNightRate =
    settings.useNightRate && appliedRate === settings.nightRate;

  // Fix 3: recalculate efficiency when odometer changes
  const handleOdometerChange = useCallback(
    (newOdometer: number) => {
      setOdometer(newOdometer);
      if (lastRecord?.odometer && lastRecord.odometer > 0) {
        const distanceDriven = newOdometer - lastRecord.odometer;
        if (distanceDriven > 0 && lastRecord.chargedKwh && lastRecord.chargedKwh > 0) {
          const calculatedEfficiency = parseFloat(
            (distanceDriven / lastRecord.chargedKwh).toFixed(1),
          );
          if (calculatedEfficiency > 0 && calculatedEfficiency < 30) {
            setEfficiency(calculatedEfficiency);
          }
        }
      }
    },
    [lastRecord],
  );

  const [startRangeAcOn, setStartRangeAcOn] = useState<number | undefined>(undefined);
  const [startSegmentCount, setStartSegmentCount] = useState<number | undefined>(undefined);

  const handleMeterApply = useCallback(
    (data: MeterExtractResult) => {
      if (data.odometer != null) handleOdometerChange(data.odometer);
      if (data.batteryPct != null) setStartBattery(data.batteryPct);
      if (data.rangeKm != null) setStartRange(data.rangeKm);
      if (data.efficiencyKmPerKwh != null) setEfficiency(data.efficiencyKmPerKwh);
      if (data.rangeAcOnKm != null) setStartRangeAcOn(data.rangeAcOnKm);
      if (data.segmentCount != null) setStartSegmentCount(data.segmentCount);
      if (data.capturedAt) setStartTime(data.capturedAt);
      showToast(t.meterApplied, "success");
    },
    [handleOdometerChange, showToast, t.meterApplied],
  );

  const handleStart = () => {
    const loc = locations.find((l) => l.id === selectedLocationId);
    startSession({
      id: generateId(),
      startTime,
      odometer,
      startBattery,
      startRange,
      efficiency,
      startedAt: Date.now(),
      locationName: loc?.name ?? "",
      voltage: loc?.voltage ?? "",
      amperage: loc?.amperage ?? "",
      kw: loc?.kw ?? "",
      startRangeAcOn,
      startSegmentCount,
    });
  };

  return (
    <div className="bg-white dark:bg-dark-surface rounded-2xl p-4 shadow-sm border border-border dark:border-dark-border">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-ev-primary">
          <PlugZap size={20} />
          <h2 className="text-lg font-semibold">{t.startCharging}</h2>
        </div>
        {geminiApiKey && (
          <MeterCaptureFlow apiKey={geminiApiKey} t={t} onApply={handleMeterApply} />
        )}
      </div>

      <DateTimeInput label={t.startTime} value={startTime} onChange={setStartTime} />
      {isNightRate && (
        <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 mb-1 pl-1">
          <Moon size={12} />
          <span>{t.nightRateApplied} (¥{settings.nightRate}/kWh)</span>
        </div>
      )}
      <Odometer value={odometer} onChange={handleOdometerChange} label={t.odometer} />

      <div className="flex flex-col gap-2">
        <SmartNumberInput
          label={t.batteryPct}
          value={startBattery}
          unit="%"
          min={0}
          max={100}
          onChange={setStartBattery}
        />
        <SmartNumberInput
          label={t.rangeKm}
          value={startRange}
          unit="km"
          steps={[-10, -1, 1, 10]}
          min={0}
          max={1000}
          onChange={setStartRange}
        />
      </div>

      <SmartNumberInput
        label={t.efficiency}
        value={efficiency}
        unit=""
        steps={[-1, -0.1, 0.1, 1]}
        min={0}
        max={20}
        onChange={setEfficiency}
      />

      {/* Location Selector */}
      <div className="mb-2">
        <label className="text-text-muted text-xs font-medium uppercase tracking-wider pl-1 flex items-center gap-1">
          <MapPin size={12} /> {t.chargingLocation}
        </label>
        <div className="relative mt-1">
          <select
            value={selectedLocationId}
            onChange={(e) => setSelectedLocationId(e.target.value)}
            className="w-full rounded-lg border border-border dark:border-dark-border bg-white dark:bg-dark-surface p-3 text-text-primary dark:text-dark-text appearance-none focus:outline-none focus:border-ev-primary focus:ring-2 focus:ring-ev-primary/20"
          >
            <option value="">{t.manualUnspecified}</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name} ({loc.kw}kW)
              </option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted">
            <ChevronDown size={16} />
          </div>
        </div>
      </div>

      <button
        onClick={handleStart}
        className="w-full mt-4 py-4 rounded-xl font-semibold text-lg tracking-wide text-white bg-ev-primary hover:bg-ev-primary-dark shadow-lg hover:shadow-ev-primary/30 transition-all active:scale-[0.98]"
      >
        {t.startCharging}
      </button>
    </div>
  );
}
