import { ChevronUp, ChevronDown } from "lucide-react";
import { RepeaterButton } from "./RepeaterButton.tsx";

interface OdometerDigitProps {
  value: number;
  onUp: () => void;
  onDown: () => void;
}

function OdometerDigit({ value, onUp, onDown }: OdometerDigitProps) {
  return (
    <div className="flex flex-col items-center gap-1">
      <RepeaterButton
        onClick={onUp}
        className="p-1 text-nexus-cyan/60 hover:text-nexus-cyan transition-colors"
      >
        <ChevronUp size={20} />
      </RepeaterButton>
      <div className="w-10 h-14 bg-space-panel border border-border-subtle rounded-lg flex items-center justify-center overflow-hidden relative">
        <div
          className="text-3xl font-mono-data font-bold text-nexus-cyan z-10"
          style={{ textShadow: "0 0 10px rgba(0, 240, 255, 0.2)" }}
        >
          {value}
        </div>
      </div>
      <RepeaterButton
        onClick={onDown}
        className="p-1 text-nexus-cyan/60 hover:text-nexus-cyan transition-colors"
      >
        <ChevronDown size={20} />
      </RepeaterButton>
    </div>
  );
}

interface OdometerProps {
  value: number;
  onChange: (value: number) => void;
  label: string;
}

export function Odometer({ value, onChange, label }: OdometerProps) {
  const digits = String(value).padStart(6, "0").split("").map(Number);

  const updateDigit = (index: number, delta: number) => {
    const newDigits = [...digits];
    let val = newDigits[index] + delta;
    if (val > 9) val = 0;
    if (val < 0) val = 9;
    newDigits[index] = val;
    onChange(parseInt(newDigits.join("")));
  };

  return (
    <div className="flex flex-col gap-1 mb-4">
      <label className="text-text-dim text-[9px] font-medium uppercase tracking-[0.15em] pl-1">
        {label}
      </label>
      <div className="glass-panel rounded-xl p-3 flex justify-center gap-2">
        {digits.map((d, i) => (
          <OdometerDigit
            key={i}
            value={d}
            onUp={() => updateDigit(i, 1)}
            onDown={() => updateDigit(i, -1)}
          />
        ))}
      </div>
    </div>
  );
}
