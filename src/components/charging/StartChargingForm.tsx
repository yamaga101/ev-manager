import { useState, useCallback, useEffect, useMemo } from "react";
import { PlugZap, MapPin, ChevronDown, Moon, Navigation } from "lucide-react";
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
import { suggestNearestLocation } from "../../utils/location-suggest.ts";
import type { MeterExtractResult } from "../../types/index.ts";
import type { Translations } from "../../i18n/index.ts";

interface StartChargingFormProps {
  t: Translations;
}

function getMostRecentlyUsedLocationId(
  locations: Array<{ id: string; lastUsedAt?: string }>,
): string | undefined {
  return [...locations]
    .filter((loc) => !!loc.lastUsedAt)
    .sort((a, b) => (b.lastUsedAt ?? "").localeCompare(a.lastUsedAt ?? ""))[0]?.id;
}

export function StartChargingForm({ t }: StartChargingFormProps) {
  const history = useChargingStore((s) => s.history);
  const startSession = useChargingStore((s) => s.startSession);
  const locations = useLocationStore((s) => s.locations);
  const markLocationUsed = useLocationStore((s) => s.markLocationUsed);
  const settings = useSettingsStore((s) => s.settings);
  const showToast = useToastStore((s) => s.showToast);

  const geminiApiKey = settings.geminiApiKey ?? "";
  const lastRecord = history[0];

  const [startTime, setStartTime] = useState(getLocalISOString());
  const [odometer, setOdometer] = useState(lastRecord?.odometer ?? 10000);
  const [startBattery, setStartBattery] = useState(lastRecord?.endBattery ?? 50);
  const [startRange, setStartRange] = useState(lastRecord?.endRange ?? 200);
  const [efficiency, setEfficiency] = useState(lastRecord?.efficiency ?? 6.0);
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [startRangeAcOn, setStartRangeAcOn] = useState<number | undefined>(undefined);
  const [startSegmentCount, setStartSegmentCount] = useState<number | undefined>(undefined);
  const [isLocating, setIsLocating] = useState(false);
  const [locationHint, setLocationHint] = useState("");

  const geocodedLocations = useMemo(
    () =>
      locations.filter(
        (loc) => typeof loc.lat === "number" && typeof loc.lng === "number",
      ),
    [locations],
  );
  const lastUsedLocationId = useMemo(
    () => getMostRecentlyUsedLocationId(locations),
    [locations],
  );

  const appliedRate = getAutoRate(settings, startTime);
  const isNightRate = settings.useNightRate && appliedRate === settings.nightRate;

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

  const requestLocationSuggestion = useCallback(
    async (userInitiated: boolean) => {
      if (geocodedLocations.length === 0) {
        if (userInitiated) showToast(t.locationNoCoordinates, "info");
        return;
      }

      if (!("geolocation" in navigator)) {
        if (userInitiated) showToast(t.locationPermissionDenied, "info");
        return;
      }

      setIsLocating(true);
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: false,
            timeout: 5000,
            maximumAge: 5 * 60 * 1000,
          });
        });

        const { selectedId, candidates } = suggestNearestLocation(
          {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
          },
          locations,
          lastUsedLocationId,
        );

        const nearest = candidates[0];
        if (selectedId) {
          setSelectedLocationId(selectedId);
        }

        if (nearest) {
          const nearestName = locations.find((loc) => loc.id === nearest.locationId)?.name ?? "";
          setLocationHint(
            `${t.locationSuggested}: ${nearestName} ${nearest.distanceMeters}m (±${nearest.accuracyMeters}m)`,
          );
        }

        if (userInitiated) {
          showToast(
            selectedId && nearest?.autoSelected
              ? t.locationAutoSelected
              : t.locationSuggested,
            "success",
          );
        }
      } catch {
        if (userInitiated) {
          showToast(t.locationPermissionDenied, "info");
        }
      } finally {
        setIsLocating(false);
      }
    },
    [geocodedLocations.length, lastUsedLocationId, locations, showToast, t],
  );

  useEffect(() => {
    let cancelled = false;

    async function maybeSuggestOnLoad() {
      if (geocodedLocations.length === 0 || !("permissions" in navigator)) return;
      try {
        const status = await navigator.permissions.query({
          name: "geolocation" as PermissionName,
        });
        if (!cancelled && status.state === "granted") {
          requestLocationSuggestion(false);
        }
      } catch {
        // Safari may not fully support Permissions API for geolocation; ignore.
      }
    }

    maybeSuggestOnLoad();
    return () => {
      cancelled = true;
    };
  }, [geocodedLocations.length, requestLocationSuggestion]);

  const handleStart = () => {
    const loc = locations.find((l) => l.id === selectedLocationId);
    if (selectedLocationId) {
      markLocationUsed(selectedLocationId);
    }
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
    <div className="glass-panel glass-noise hud-corners scan-lines scan-sweep p-4 slide-up">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-nexus-cyan">
          <PlugZap size={18} className="drop-shadow-[0_0_6px_rgba(0,240,255,0.4)]" />
          <h2 className="font-display text-sm font-semibold tracking-widest uppercase">{t.startCharging}</h2>
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

      <SmartNumberInput
        label={t.batteryPct}
        value={startBattery}
        unit="%"
        min={0}
        max={100}
        onChange={setStartBattery}
      />
      <div>
        <div className="text-text-dim text-[9px] font-medium uppercase tracking-[0.15em] pl-1 mb-0.5">
          {t.rangeKm}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <SmartNumberInput
            label="AC OFF"
            value={startRange}
            unit="km"
            steps={[-10, 10]}
            min={0}
            max={1000}
            onChange={setStartRange}
            compact
          />
          <SmartNumberInput
            label="AC ON"
            value={startRangeAcOn ?? 0}
            unit="km"
            steps={[-10, 10]}
            min={0}
            max={1000}
            onChange={(v) => setStartRangeAcOn(v || undefined)}
            compact
          />
        </div>
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

      <div className="mb-2">
        <div className="flex items-center justify-between gap-2">
          <label className="text-text-muted text-xs font-medium uppercase tracking-wider pl-1 flex items-center gap-1">
            <MapPin size={12} /> {t.chargingLocation}
          </label>
          <button
            type="button"
            onClick={() => requestLocationSuggestion(true)}
            disabled={isLocating || geocodedLocations.length === 0}
            className="text-[10px] px-2 py-1 rounded-lg border border-border-subtle text-nexus-cyan disabled:text-text-dim disabled:border-border-subtle/40 hover:border-border-glow transition-all"
          >
            <span className="inline-flex items-center gap-1">
              <Navigation size={12} /> {isLocating ? "GPS..." : t.useCurrentLocation}
            </span>
          </button>
        </div>
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
        {locationHint && (
          <div className="mt-1 pl-1 text-[10px] text-text-dim tracking-wide">{locationHint}</div>
        )}
      </div>

      <button
        onClick={handleStart}
        className="btn-plasma w-full mt-4 py-4 rounded-xl text-lg tracking-widest font-display"
      >
        {t.startCharging}
      </button>
    </div>
  );
}
