import { useState } from "react";
import {
  BatteryCharging,
  BarChart3,
  Download,
  Cloud,
  Car,
  Zap,
} from "lucide-react";
import { useSettingsStore } from "../../store/useSettingsStore.ts";
import { useToastStore } from "../../store/useToastStore.ts";
import {
  PRE_CONFIGURED_GAS_URL,
  DEFAULT_BATTERY_CAPACITY,
  DEFAULT_ELECTRICITY_RATE,
  DEFAULT_NIGHT_RATE,
  VEHICLE_PRESETS,
} from "../../constants/defaults.ts";
import type { Translations } from "../../i18n/index.ts";

interface OnboardingProps {
  t: Translations;
}

export function Onboarding({ t }: OnboardingProps) {
  const updateSettings = useSettingsStore((s) => s.updateSettings);
  const completeOnboarding = useSettingsStore((s) => s.completeOnboarding);
  const showToast = useToastStore((s) => s.showToast);

  const [step, setStep] = useState(0);
  const [capacity, setCapacity] = useState(DEFAULT_BATTERY_CAPACITY);
  const [ratePlan, setRatePlan] = useState(DEFAULT_ELECTRICITY_RATE);
  const [nightRate, setNightRate] = useState(DEFAULT_NIGHT_RATE);
  const [useNightRate, setUseNightRate] = useState(false);
  const [gasUrl, setGasUrl] = useState(PRE_CONFIGURED_GAS_URL);

  const inputBase = "w-full rounded-lg border border-border-subtle bg-space-panel p-3 text-lg font-mono-data font-medium text-center text-text-bright focus:outline-none focus:border-nexus-cyan focus:shadow-[0_0_0_2px_rgba(0,240,255,0.1)] transition-all";

  const steps = [
    // Step 0: Welcome
    <div key={0} className="slide-in text-center">
      <div
        className="w-20 h-20 mx-auto mb-4 rounded-full bg-nexus-cyan/10 flex items-center justify-center border border-nexus-cyan/20"
        style={{ boxShadow: "0 0 40px rgba(0, 240, 255, 0.15)" }}
      >
        <Zap size={40} className="text-nexus-cyan" style={{ filter: "drop-shadow(0 0 12px rgba(0, 240, 255, 0.5))" }} />
      </div>
      <h2 className="font-display text-2xl font-bold text-nexus-cyan tracking-widest mb-2" style={{ textShadow: "0 0 30px rgba(0, 240, 255, 0.3)" }}>
        EV CHARGE LOG
      </h2>
      <p className="text-text-bright text-base mb-1">{t.welcomeSub1}</p>
      <p className="text-text-dim text-sm">{t.welcomeSub2}</p>
      <div className="mt-6 glass-panel rounded-xl p-4 text-left space-y-3">
        <div className="flex items-center gap-3 text-text-mid text-sm">
          <BatteryCharging size={15} className="text-nexus-cyan shrink-0" /> {t.feat1}
        </div>
        <div className="flex items-center gap-3 text-text-mid text-sm">
          <BarChart3 size={15} className="text-nexus-violet shrink-0" /> {t.feat2}
        </div>
        <div className="flex items-center gap-3 text-text-mid text-sm">
          <Download size={15} className="text-nexus-green shrink-0" /> {t.feat3}
        </div>
        <div className="flex items-center gap-3 text-text-mid text-sm">
          <Cloud size={15} className="text-nexus-warning shrink-0" /> {t.feat4}
        </div>
      </div>
    </div>,
    // Step 1: Vehicle
    <div key={1} className="slide-in">
      <h2 className="font-display text-sm font-semibold text-nexus-cyan tracking-widest uppercase mb-4 flex items-center gap-2">
        <Car size={16} /> {t.vehicleSettings}
      </h2>
      <div className="space-y-4">
        <div className="flex flex-wrap gap-1">
          {VEHICLE_PRESETS.map((preset) => (
            <button
              key={preset.capacity}
              onClick={() => setCapacity(preset.capacity)}
              className={`text-[10px] px-2.5 py-1 rounded-lg border tracking-wider transition-all ${
                capacity === preset.capacity
                  ? "border-nexus-cyan/30 bg-nexus-cyan-glow text-nexus-cyan"
                  : "border-border-subtle text-text-dim hover:border-border-glow"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <div>
          <label className="text-text-dim text-[9px] tracking-[0.15em] uppercase block mb-1">{t.batteryCapacity}</label>
          <input
            type="number"
            value={capacity}
            onChange={(e) => setCapacity(Number(e.target.value))}
            className={inputBase}
          />
          <p className="text-[10px] text-text-dim mt-1">{t.azHint}</p>
        </div>
        <div>
          <label className="text-text-dim text-[9px] tracking-[0.15em] uppercase block mb-1">{t.electricityRate}</label>
          <input
            type="number"
            value={ratePlan}
            onChange={(e) => setRatePlan(Number(e.target.value))}
            step="0.01"
            className={inputBase}
          />
        </div>
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={useNightRate}
            onChange={(e) => setUseNightRate(e.target.checked)}
            className="w-5 h-5 accent-nexus-cyan"
          />
          <label className="text-text-mid text-sm">{t.nightRate}</label>
          {useNightRate && (
            <input
              type="number"
              value={nightRate}
              onChange={(e) => setNightRate(Number(e.target.value))}
              step="0.01"
              className="rounded-lg border border-border-subtle bg-space-panel p-2 text-sm font-mono-data w-24 ml-auto text-text-bright focus:outline-none focus:border-nexus-cyan"
            />
          )}
        </div>
      </div>
    </div>,
    // Step 2: GAS
    <div key={2} className="slide-in">
      <h2 className="font-display text-sm font-semibold text-nexus-cyan tracking-widest uppercase mb-4 flex items-center gap-2">
        <Cloud size={16} /> {t.gSheetLink}
      </h2>
      <p className="text-text-mid text-sm mb-4">{t.gSheetDesc}</p>
      <input
        type="text"
        value={gasUrl}
        onChange={(e) => setGasUrl(e.target.value)}
        placeholder="https://script.google.com/..."
        className="w-full rounded-lg border border-border-subtle bg-space-panel p-3 text-sm font-mono-data text-text-bright mb-4 focus:outline-none focus:border-nexus-cyan focus:shadow-[0_0_0_2px_rgba(0,240,255,0.1)]"
      />
      <p className="text-[10px] text-text-dim">{t.gSheetHint}</p>
    </div>,
  ];

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      updateSettings({
        batteryCapacity: capacity,
        electricityRate: ratePlan,
        nightRate,
        useNightRate,
        gasUrl,
      });
      completeOnboarding();
      showToast(t.toastWelcome, "success");
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-space-void">
      <div className="nexus-grid-bg" aria-hidden="true" />
      <div className="w-full max-w-sm relative z-10">
        <div className="glass-panel hud-corners rounded-2xl p-6 mb-4 min-h-[400px] flex flex-col justify-between">
          <div className="flex-1">{steps[step]}</div>
          <div className="mt-6">
            <button
              onClick={handleNext}
              className="btn-plasma w-full py-4 rounded-xl text-lg font-display tracking-widest"
            >
              {step < steps.length - 1 ? t.next : t.startCharging}
            </button>
            {step > 0 && (
              <button
                onClick={() => setStep(step - 1)}
                className="w-full mt-2 py-2 text-text-dim text-sm hover:text-nexus-cyan tracking-wider uppercase transition-colors"
              >
                {t.back}
              </button>
            )}
          </div>
        </div>
        {/* Dot indicators */}
        <div className="flex justify-center gap-2">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all ${
                i === step
                  ? "bg-nexus-cyan shadow-[0_0_8px_rgba(0,240,255,0.5)]"
                  : "bg-border-subtle"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
