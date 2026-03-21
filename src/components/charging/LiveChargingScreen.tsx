import { useState, useEffect } from "react";
import { BatteryCharging, MapPin } from "lucide-react";
import { ProgressRing } from "../ui/ProgressRing.tsx";
import { SmartNumberInput } from "../inputs/SmartNumberInput.tsx";
import { DateTimeInput } from "../inputs/DateTimeInput.tsx";
import { useChargingStore } from "../../store/useChargingStore.ts";
import { useSettingsStore } from "../../store/useSettingsStore.ts";
import { useToastStore } from "../../store/useToastStore.ts";
import {
  calcChargedKwh,
  calcCost,
  calcDurationMinutes,
  calcChargeSpeed,
  getAutoRate,
} from "../../utils/calculations.ts";
import { buildGasPayload, sendToGas } from "../../utils/gas-sync.ts";
import {
  formatTimer,
  formatDate,
  getLocalISOString,
} from "../../utils/formatting.ts";
import {
  DEFAULT_BATTERY_CAPACITY,
  DEFAULT_ELECTRICITY_RATE,
  MAX_CHARGE_HOURS,
} from "../../constants/defaults.ts";
import type { Translations } from "../../i18n/index.ts";
import { useScramble } from "../../hooks/useScramble.ts";
import type { ChargingRecord } from "../../types/index.ts";

interface LiveChargingScreenProps {
  t: Translations;
  onComplete: (record: ChargingRecord) => void;
}

export function LiveChargingScreen({ t, onComplete }: LiveChargingScreenProps) {
  const session = useChargingStore((s) => s.activeSession)!;
  const addRecord = useChargingStore((s) => s.addRecord);
  const clearSession = useChargingStore((s) => s.clearSession);
  const addToQueue = useChargingStore((s) => s.addToQueue);
  const settings = useSettingsStore((s) => s.settings);
  const showToast = useToastStore((s) => s.showToast);

  const [elapsed, setElapsed] = useState(0);
  const [endTime, setEndTime] = useState(getLocalISOString());
  const [endBattery, setEndBattery] = useState(
    Math.min(session.startBattery + 20, 100),
  );
  const [endRange, setEndRange] = useState(session.startRange + 50);
  const [endRangeAcOn, setEndRangeAcOn] = useState<number | undefined>(
    session.startRangeAcOn != null ? session.startRangeAcOn + 30 : undefined,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, boolean>
  >({});

  useEffect(() => {
    const startMs = new Date(session.startTime).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - startMs) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [session.startTime]);

  const capacity = settings.batteryCapacity || DEFAULT_BATTERY_CAPACITY;
  // Use night rate when session started during 22:00-08:00 and useNightRate is enabled
  const rate = settings.useNightRate
    ? getAutoRate(settings, session.startTime)
    : (settings.electricityRate || DEFAULT_ELECTRICITY_RATE);
  const locationKw = (Number(session.kw) || 3);

  // Live estimates
  const remainPct = 100 - session.startBattery;
  const remainKwh = (capacity * remainPct) / 100;
  const estTotalMinutes =
    locationKw > 0 ? (remainKwh / locationKw) * 60 : 0;
  const estCompletionTime = new Date(
    new Date(session.startTime).getTime() + estTotalMinutes * 60000,
  );
  const elapsedKwh = locationKw * (elapsed / 3600);
  const liveCost = Math.round(elapsedKwh * rate);
  const scrambledCost = useScramble(liveCost);
  const currentPct = Math.min(
    100,
    session.startBattery + (elapsedKwh / capacity) * 100,
  );
  const progress =
    remainPct > 0
      ? Math.min(
          100,
          ((currentPct - session.startBattery) / remainPct) * 100,
        )
      : 100;

  const validate = (): boolean => {
    const errors: Record<string, boolean> = {};
    if (endBattery < session.startBattery) {
      errors.endBattery = true;
      showToast(t.valEndBattery, "error");
    }
    if (endRange < session.startRange) {
      errors.endRange = true;
      showToast(t.valEndRange, "error");
    }
    if (new Date(endTime) <= new Date(session.startTime)) {
      errors.endTime = true;
      showToast(t.valEndTime, "error");
    }
    const durationHours =
      (new Date(endTime).getTime() - new Date(session.startTime).getTime()) /
      3600000;
    if (durationHours > MAX_CHARGE_HOURS) {
      errors.endTime = true;
      showToast(t.valDuration.replace("{n}", String(MAX_CHARGE_HOURS)), "error");
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleComplete = async () => {
    if (!validate()) return;
    setIsSaving(true);

    const chargedKwh = calcChargedKwh(capacity, session.startBattery, endBattery);
    const cost = calcCost(chargedKwh, rate);
    const duration = calcDurationMinutes(session.startTime, endTime);
    const chargeSpeed = calcChargeSpeed(chargedKwh, duration);

    const finalRecord: ChargingRecord = {
      ...session,
      endTime,
      endBattery,
      endRange,
      endRangeAcOn,
      chargedKwh: parseFloat(chargedKwh.toFixed(1)),
      cost,
      duration: Math.round(duration),
      chargeSpeed: parseFloat(chargeSpeed.toFixed(1)),
    };

    addRecord(finalRecord);
    clearSession();

    // Send to GAS
    const gasUrl = settings.gasUrl;
    if (gasUrl) {
      const payload = buildGasPayload(finalRecord);
      const success = await sendToGas(gasUrl, payload);
      if (success) {
        showToast(t.toastSavedSent, "success");
      } else {
        addToQueue(payload);
        showToast(t.toastSavedQueued, "info");
      }
    } else {
      showToast(t.toastSessionSaved, "success");
    }

    setIsSaving(false);
    onComplete(finalRecord);
  };

  const handleCancel = () => {
    if (confirm(t.confirmCancelSession)) {
      clearSession();
      setValidationErrors({});
    }
  };

  return (
    <div className="charging-pulse glass-panel glass-noise hud-corners scan-lines prismatic-border scan-sweep p-4 slide-up">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-2 text-nexus-green">
          <BatteryCharging size={18} className="drop-shadow-[0_0_8px_rgba(57,255,20,0.5)]" />
          <h2 className="font-display text-sm font-semibold tracking-widest uppercase glow-breathe">
            {t.charging}
          </h2>
        </div>
        <button
          onClick={handleCancel}
          className="text-[10px] text-text-dim hover:text-nexus-error tracking-wider uppercase transition-colors"
        >
          {t.cancel}
        </button>
      </div>

      {/* Progress Ring + Timer */}
      <div className="relative flex items-center justify-center mb-4">
        <ProgressRing radius={80} stroke={6} progress={progress} />
        <div className="absolute text-center">
          <div className="text-3xl font-mono-data font-bold text-nexus-cyan data-flicker" style={{ textShadow: `0 0 ${10 + progress * 0.3}px rgba(0, 240, 255, ${0.3 + progress * 0.005}), 0 0 ${30 + progress * 0.5}px rgba(0, 240, 255, ${0.1 + progress * 0.002})` }}>
            {formatTimer(elapsed)}
          </div>
          <div className="text-[8px] text-text-dim tracking-widest uppercase mt-1">{t.elapsed}</div>
          <div className="text-[10px] font-mono-data text-nexus-cyan/50 mt-0.5">{Math.round(currentPct)}%</div>
        </div>
      </div>

      {/* Live Stats Row */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="rounded-lg p-2 text-center bg-nexus-cyan-glow border border-border-subtle relative overflow-hidden">
          <div className="text-[7px] text-nexus-cyan/30 tracking-widest font-mono absolute top-1 left-2">BATT_EST</div>
          <div className="text-[9px] text-text-dim tracking-wider uppercase mt-2">{t.estPct}</div>
          <div className="text-xl font-mono-data font-bold text-nexus-cyan" style={{ textShadow: "0 0 10px rgba(0, 240, 255, 0.3)" }}>
            {Math.round(currentPct)}%
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: `linear-gradient(90deg, transparent, rgba(0, 240, 255, 0.4) ${currentPct}%, transparent ${currentPct}%)` }} />
        </div>
        <div className="rounded-lg p-2 text-center bg-nexus-green-glow border border-border-subtle relative overflow-hidden">
          <div className="text-[7px] text-nexus-green/30 tracking-widest font-mono absolute top-1 left-2">COST_NOW</div>
          <div className="text-[9px] text-text-dim tracking-wider uppercase mt-2">{t.cost}</div>
          <div className="text-xl font-mono-data font-bold text-nexus-green" style={{ textShadow: "0 0 10px rgba(57, 255, 20, 0.3)" }}>
            &yen;{scrambledCost}
          </div>
        </div>
        <div className="rounded-lg p-2 text-center bg-nexus-violet-glow border border-border-subtle">
          <div className="text-[9px] text-text-dim tracking-wider uppercase">{t.estDone}</div>
          <div className="text-sm font-mono-data font-bold text-nexus-violet">
            {estCompletionTime.getHours().toString().padStart(2, "0")}:
            {estCompletionTime.getMinutes().toString().padStart(2, "0")}
          </div>
        </div>
      </div>

      {/* Session Info */}
      <div className="rounded-lg p-2 mb-4 text-xs bg-space-glass border border-border-subtle">
        <div className="flex justify-between text-text-dim font-mono-data text-[11px]">
          <span>{formatDate(session.startTime)}</span>
          <span>{session.startBattery}% / {session.startRange}km{session.startRangeAcOn != null ? ` (AC ON: ${session.startRangeAcOn}km)` : ""}</span>
        </div>
        {session.locationName && (
          <div className="text-nexus-cyan/70 mt-1 flex items-center gap-1 text-[11px]">
            <MapPin size={10} /> {session.locationName} ({locationKw}kW)
          </div>
        )}
      </div>

      {/* End Inputs */}
      <div className="space-y-2">
        <DateTimeInput
          label={t.endTime}
          value={endTime}
          onChange={setEndTime}
          error={validationErrors.endTime}
        />
        <SmartNumberInput
          label={t.battEnd}
          value={endBattery}
          unit="%"
          min={0}
          max={100}
          onChange={setEndBattery}
          error={validationErrors.endBattery}
        />
        <SmartNumberInput
          label={t.rangeEnd}
          value={endRange}
          unit="km"
          steps={[-10, -1, 1, 10]}
          min={0}
          max={1000}
          onChange={setEndRange}
          error={validationErrors.endRange}
        />
        {(session.startRangeAcOn != null || endRangeAcOn != null) && (
          <SmartNumberInput
            label={t.rangeAcOn}
            value={endRangeAcOn ?? 0}
            unit="km"
            steps={[-10, -1, 1, 10]}
            min={0}
            max={1000}
            onChange={(v) => setEndRangeAcOn(v || undefined)}
          />
        )}
      </div>

      <button
        onClick={handleComplete}
        disabled={isSaving}
        className="btn-plasma w-full mt-4 py-4 rounded-xl text-lg tracking-widest font-display"
      >
        {isSaving ? (
          <span>
            <span className="spinner mr-2"></span>
            {t.saving}
          </span>
        ) : (
          t.completeAndSave
        )}
      </button>
    </div>
  );
}
