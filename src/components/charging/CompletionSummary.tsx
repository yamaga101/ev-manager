import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { calcChargedKwh, calcCost, calcDurationMinutes } from "../../utils/calculations.ts";
import { formatDuration } from "../../utils/formatting.ts";
import { DEFAULT_BATTERY_CAPACITY, DEFAULT_ELECTRICITY_RATE } from "../../constants/defaults.ts";
import { useSettingsStore } from "../../store/useSettingsStore.ts";
import { useChargingStore } from "../../store/useChargingStore.ts";
import { useCountUp } from "../../hooks/useScramble.ts";
import type { ChargingRecord } from "../../types/index.ts";
import type { Translations } from "../../i18n/index.ts";

interface CompletionSummaryProps {
  record: ChargingRecord;
  onDismiss: () => void;
  t: Translations;
}

// Particle burst helper — 12 CSS-animated dots radiating from center
function ParticleBurst() {
  const particles = Array.from({ length: 12 }, (_, i) => {
    const angle = (i / 12) * 360;
    const distance = 60 + Math.random() * 40;
    const px = Math.cos((angle * Math.PI) / 180) * distance;
    const py = Math.sin((angle * Math.PI) / 180) * distance;
    return { px, py, delay: Math.random() * 0.2, size: 2 + Math.random() * 3 };
  });

  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
      {particles.map((p, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-nexus-green"
          style={{
            width: p.size,
            height: p.size,
            animation: `particle-burst 0.8s ease-out ${p.delay}s forwards`,
            "--px": `${p.px}px`,
            "--py": `${p.py}px`,
            boxShadow: "0 0 6px rgba(57, 255, 20, 0.6)",
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

// Typewriter effect — each character fades in with staggered delay
function TypewriterText({ text, className }: { text: string; className?: string }) {
  return (
    <span className={className}>
      {text.split("").map((char, i) => (
        <span
          key={i}
          className="inline-block opacity-0"
          style={{
            animation: `fade-in 0.05s ease forwards`,
            animationDelay: `${i * 40}ms`,
          }}
        >
          {char === " " ? "\u00A0" : char}
        </span>
      ))}
    </span>
  );
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

  // Count-up animations for each metric
  const kwhDisplay = useCountUp(Math.round(kwh * 10), 1200);
  const costDisplay = useCountUp(cost, 1400);
  const durationDisplay = useCountUp(duration, 1000);

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

  // Summary cards data
  const cards = [
    {
      value: (kwhDisplay / 10).toFixed(1),
      label: "kWh",
      colorClass: "text-nexus-cyan",
    },
    {
      value: `¥${costDisplay}`,
      label: t.cost,
      colorClass: "text-nexus-green",
    },
    {
      value: formatDuration(durationDisplay),
      label: t.duration,
      colorClass: "text-nexus-violet",
    },
  ];

  return (
    <div
      className={`fixed inset-0 z-[80] flex items-center justify-center p-4 backdrop-blur-md transition-opacity duration-300 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      style={{ background: "rgba(3, 6, 20, 0.85)" }}
      onClick={onDismiss}
    >
      <div
        className="glass-panel hud-corners rounded-2xl p-6 text-center min-w-[280px] border-border-glow relative overflow-visible"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Check icon with particle burst */}
        <div className="relative flex items-center justify-center mb-3">
          <ParticleBurst />
          <div
            className="w-16 h-16 mx-auto rounded-full bg-nexus-green/10 flex items-center justify-center border border-nexus-green/30 relative z-10"
            style={{ boxShadow: "0 0 30px rgba(57, 255, 20, 0.15)" }}
          >
            <Check size={32} className="text-nexus-green" strokeWidth={3} style={{ filter: "drop-shadow(0 0 8px rgba(57, 255, 20, 0.5))" }} />
          </div>
        </div>

        {/* Typewriter title */}
        <h2
          className="font-display text-lg font-bold tracking-widest text-nexus-cyan mb-4"
          style={{ textShadow: "0 0 20px rgba(0, 240, 255, 0.3)" }}
        >
          <TypewriterText text="SESSION COMPLETE" />
        </h2>

        {/* Staggered metric cards */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {cards.map((card, index) => (
            <div
              key={card.label}
              className="opacity-0 slide-up"
              style={{ animationDelay: `${index * 100 + 500}ms`, animationFillMode: "forwards" }}
            >
              <div className={`text-2xl font-mono-data font-bold ${card.colorClass}`}>
                {card.value}
              </div>
              <div className="text-[9px] text-text-dim tracking-widest uppercase">{card.label}</div>
            </div>
          ))}
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
