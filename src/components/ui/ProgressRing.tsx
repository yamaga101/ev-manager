interface ProgressRingProps {
  radius?: number;
  stroke?: number;
  progress?: number;
  color?: string;
}

export function ProgressRing({
  radius = 70,
  stroke = 6,
  progress = 0,
  color = "#00F0FF",
}: ProgressRingProps) {
  const normalizedRadius = radius - stroke;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset =
    circumference - (progress / 100) * circumference;

  return (
    <svg height={radius * 2} width={radius * 2} className="mx-auto">
      {/* Background track */}
      <circle
        stroke="rgba(0, 240, 255, 0.08)"
        fill="transparent"
        strokeWidth={stroke}
        r={normalizedRadius}
        cx={radius}
        cy={radius}
      />
      {/* Glow layer */}
      <circle
        className="progress-ring-circle"
        stroke={color}
        fill="transparent"
        strokeWidth={stroke + 4}
        strokeLinecap="round"
        strokeDasharray={`${circumference} ${circumference}`}
        style={{ strokeDashoffset, opacity: 0.15, filter: `blur(4px)` }}
        r={normalizedRadius}
        cx={radius}
        cy={radius}
      />
      {/* Main arc */}
      <circle
        className="progress-ring-circle"
        stroke={color}
        fill="transparent"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${circumference} ${circumference}`}
        style={{ strokeDashoffset, filter: `drop-shadow(0 0 6px ${color}66)` }}
        r={normalizedRadius}
        cx={radius}
        cy={radius}
      />
    </svg>
  );
}
