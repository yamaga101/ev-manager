import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { calcChargedKwh, calcCost, calcDurationMinutes } from "../../utils/calculations.ts";
import { formatDuration } from "../../utils/formatting.ts";
import { DEFAULT_BATTERY_CAPACITY, DEFAULT_ELECTRICITY_RATE } from "../../constants/defaults.ts";
import { useSettingsStore } from "../../store/useSettingsStore.ts";
import { useChargingStore } from "../../store/useChargingStore.ts";
import type { ChargingRecord } from "../../types/index.ts";
import type { Translations } from "../../i18n/index.ts";

interface CompletionSummaryProps {
  record: ChargingRecord;
  onDismiss: () => void;
  t: Translations;
}

export function CompletionSummary({
  record,
  onDismiss,
  t,
}: CompletionSummaryProps) {
  const settings = useSettingsStore((s) => s.settings);
  const updateRecord = useChargingStore((s) => s.updateRecord);
  const [visible, setVisible] = useState(true);
  const [soh, setSoh] = useState<string>("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startAutoDismiss = () => {
    timerRef.current = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 300);
    }, 6000);
  };

  useEffect(() => {
    startAutoDismiss();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const capacity = settings.batteryCapacity || DEFAULT_BATTERY_CAPACITY;
  const rate = settings.electricityRate || DEFAULT_ELECTRICITY_RATE;
  const kwh = calcChargedKwh(capacity, record.startBattery, record.endBattery);
  const cost = calcCost(kwh, rate);
  const duration = calcDurationMinutes(record.startTime, record.endTime);

  const handleSohFocus = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleSohSave = () => {
    const parsed = parseFloat(soh);
    if (!Number.isNaN(parsed) && parsed > 0 && parsed <= 100) {
      updateRecord({ ...record, soh: parsed });
    }
    setVisible(false);
    setTimeout(onDismiss, 300);
  };

  return (
    <div
      className={`fixed inset-0 z-[80] flex items-center justify-center p-4 bg-space-void/80 backdrop-blur-md transition-opacity duration-300 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      onClick={onDismiss}
    >
      <div
        className="glass-panel hud-corners rounded-2xl p-6 text-center min-w-[280px] border-border-glow"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Check icon */}
        <div
          className="w-16 h-16 mx-auto mb-3 rounded-full bg-nexus-green/10 flex items-center justify-center border border-nexus-green/30"
          style={{ boxShadow: "0 0 30px rgba(57, 255, 20, 0.15)" }}
        >
          <Check size={32} className="text-nexus-green" strokeWidth={3} style={{ filter: "drop-shadow(0 0 8px rgba(57, 255, 20, 0.5))" }} />
        </div>

        <h2 className="font-display text-lg font-bold tracking-widest text-nexus-cyan mb-4" style={{ textShadow: "0 0 20px rgba(0, 240, 255, 0.3)" }}>
          {t.chargeComplete}
        </h2>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div>
            <div className="text-2xl font-mono-data font-bold text-nexus-cyan">
              {kwh.toFixed(1)}
            </div>
            <div className="text-[9px] text-text-dim tracking-widest uppercase">kWh</div>
          </div>
          <div>
            <div className="text-2xl font-mono-data font-bold text-nexus-green">
              &yen;{cost}
            </div>
            <div className="text-[9px] text-text-dim tracking-widest uppercase">{t.cost}</div>
          </div>
          <div>
            <div className="text-2xl font-mono-data font-bold text-nexus-violet">
              {formatDuration(duration)}
            </div>
            <div className="text-[9px] text-text-dim tracking-widest uppercase">{t.duration}</div>
          </div>
        </div>

        <div className="text-sm font-mono-data text-text-mid mb-4">
          {record.startBattery}% → {record.endBattery}%
        </div>

        {/* SOH input */}
        <div className="border-t border-border-subtle pt-3">
          <label className="text-[9px] text-text-dim tracking-widest uppercase block mb-1 text-left">
            {t.sohPct} <span className="opacity-40">(optional)</span>
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              min={50}
              max={100}
              step={0.1}
              placeholder="e.g. 85.5"
              value={soh}
              onFocus={handleSohFocus}
              onChange={(e) => setSoh(e.target.value)}
              className="flex-1 rounded-lg border border-border-subtle bg-space-panel px-3 py-2 text-sm font-mono-data text-text-bright focus:outline-none focus:border-nexus-cyan focus:shadow-[0_0_0_2px_rgba(0,240,255,0.15)]"
            />
            <button
              onClick={handleSohSave}
              className="btn-plasma px-4 py-2 rounded-lg text-sm font-display tracking-wider"
            >
              {t.done}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
