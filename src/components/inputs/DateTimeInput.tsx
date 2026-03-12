interface DateTimeInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: boolean;
}

export function DateTimeInput({
  label,
  value,
  onChange,
  error = false,
}: DateTimeInputProps) {
  return (
    <div className="flex flex-col gap-1 mb-4">
      <label className="text-text-dim text-[9px] font-medium uppercase tracking-[0.15em] pl-1">
        {label}
      </label>
      <input
        type="datetime-local"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-lg border bg-space-panel p-3 text-lg font-mono-data font-medium text-center text-text-bright focus:outline-none focus:border-nexus-cyan focus:shadow-[0_0_0_2px_rgba(0,240,255,0.1)] transition-all ${
          error
            ? "border-nexus-error shadow-[0_0_0_2px_rgba(255,61,87,0.15)] shake"
            : "border-border-subtle"
        }`}
      />
    </div>
  );
}
