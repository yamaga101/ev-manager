import { RepeaterButton } from "./RepeaterButton.tsx";

interface SmartNumberInputProps {
  label: string;
  value: number;
  unit: string;
  onChange: (value: number) => void;
  steps?: number[];
  min?: number;
  max?: number;
  error?: boolean;
  compact?: boolean;
}

export function SmartNumberInput({
  label,
  value,
  unit,
  onChange,
  steps = [-10, -1, 1, 10],
  min = 0,
  max = 999999,
  error = false,
  compact = false,
}: SmartNumberInputProps) {
  const adjust = (delta: number) => {
    let next = parseFloat((value + delta).toFixed(1));
    if (next < min) next = min;
    if (next > max) next = max;
    onChange(next);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowUp" || e.key === "ArrowRight") {
      e.preventDefault();
      adjust(e.shiftKey ? steps[3] : steps[2]);
    } else if (e.key === "ArrowDown" || e.key === "ArrowLeft") {
      e.preventDefault();
      adjust(e.shiftKey ? steps[0] : steps[1]);
    }
  };

  const btnSize = compact ? "h-8 w-8" : "h-10 w-10";
  const btnText = compact ? "text-[10px]" : "text-xs";
  const valueSize = compact ? "text-lg" : "text-2xl";
  const inputWidth = compact ? "w-14" : "w-20";

  return (
    <div className={`flex flex-col gap-1 ${compact ? "mb-1" : "mb-2"}`}>
      <label className="text-text-dim text-[9px] font-medium uppercase tracking-[0.15em] pl-1">
        {label}
      </label>
      <div
        className={`flex items-center justify-between rounded-lg border bg-space-panel p-1 transition-all focus-within:border-nexus-cyan focus-within:shadow-[0_0_0_2px_rgba(0,240,255,0.1)] ${
          error
            ? "border-nexus-error shadow-[0_0_0_2px_rgba(255,61,87,0.15)] shake"
            : "border-border-subtle"
        }`}
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        <div className="flex gap-1">
          {steps
            .filter((s) => s < 0)
            .map((step) => (
              <RepeaterButton
                key={step}
                onClick={() => adjust(step)}
                className={`${btnSize} flex items-center justify-center rounded-md bg-nexus-error/8 text-nexus-error/80 font-mono ${btnText} font-bold hover:bg-nexus-error/15 hover:text-nexus-error transition-all active:scale-95`}
              >
                {step}
              </RepeaterButton>
            ))}
        </div>
        <div className="flex items-baseline gap-1 flex-1 justify-center">
          <input
            type="number"
            value={value}
            onChange={(e) => {
              const parsed = parseFloat(e.target.value);
              if (!isNaN(parsed)) onChange(parsed);
            }}
            className={`${inputWidth} bg-transparent ${valueSize} font-mono-data font-bold text-nexus-cyan text-center focus:outline-none appearance-none p-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
            style={{ textShadow: "0 0 10px rgba(0, 240, 255, 0.2)" }}
          />
          <span className="text-[10px] text-text-dim">{unit}</span>
        </div>
        <div className="flex gap-1">
          {steps
            .filter((s) => s > 0)
            .reverse()
            .map((step) => (
              <RepeaterButton
                key={step}
                onClick={() => adjust(step)}
                className={`${btnSize} flex items-center justify-center rounded-md bg-nexus-cyan/8 text-nexus-cyan/80 font-mono ${btnText} font-bold hover:bg-nexus-cyan/15 hover:text-nexus-cyan transition-all active:scale-95`}
              >
                +{step}
              </RepeaterButton>
            ))}
        </div>
      </div>
    </div>
  );
}
