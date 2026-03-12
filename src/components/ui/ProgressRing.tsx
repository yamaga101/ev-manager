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
  const normalizedRadius = radius - stroke - 8;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;
  const outerRadius = radius - 2;

  // Dynamic color based on progress
  const dynamicColor = progress < 20 ? "#FF3D57" : progress < 80 ? color : "#39FF14";

  // Leading edge position (angle in radians, starting from top)
  const angle = ((progress / 100) * 360 - 90) * (Math.PI / 180);
  const dotX = radius + normalizedRadius * Math.cos(angle);
  const dotY = radius + normalizedRadius * Math.sin(angle);

  // Tick marks (36 ticks at 10° intervals)
  const ticks = Array.from({ length: 36 }, (_, i) => {
    const a = (i * 10 - 90) * (Math.PI / 180);
    const isMajor = i % 5 === 0;
    const outerR = outerRadius;
    const innerR = outerRadius - (isMajor ? 8 : 4);
    return {
      x1: radius + outerR * Math.cos(a),
      y1: radius + outerR * Math.sin(a),
      x2: radius + innerR * Math.cos(a),
      y2: radius + innerR * Math.sin(a),
      isMajor,
    };
  });

  return (
    <svg height={radius * 2} width={radius * 2} className="mx-auto" style={{ filter: "drop-shadow(0 0 2px rgba(0, 240, 255, 0.2))" }}>
      <defs>
        <filter id="ring-glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <linearGradient id="arc-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={color} />
          <stop offset="100%" stopColor={dynamicColor} />
        </linearGradient>
      </defs>

      {/* Layer 1: Outer tick marks — HUD gauge feel */}
      {ticks.map((tick, i) => (
        <line
          key={i}
          x1={tick.x1}
          y1={tick.y1}
          x2={tick.x2}
          y2={tick.y2}
          stroke={dynamicColor}
          strokeWidth={tick.isMajor ? 1.5 : 0.8}
          opacity={tick.isMajor ? 0.5 : 0.2}
        />
      ))}

      {/* Layer 2: Deep background track */}
      <circle
        stroke="rgba(0, 240, 255, 0.04)"
        fill="transparent"
        strokeWidth={stroke + 10}
        r={normalizedRadius}
        cx={radius}
        cy={radius}
      />

      {/* Layer 3: Dashed decorative ring (reverse rotation) */}
      <circle
        stroke={dynamicColor}
        fill="transparent"
        strokeWidth={1}
        strokeDasharray="2 6"
        r={normalizedRadius + stroke + 2}
        cx={radius}
        cy={radius}
        opacity={0.2}
        style={{ transformOrigin: "50% 50%", animation: "spin 30s linear infinite reverse" }}
      />

      {/* Layer 4: Far outer bloom */}
      <circle
        className="progress-ring-circle"
        stroke={dynamicColor}
        fill="transparent"
        strokeWidth={stroke + 16}
        strokeLinecap="round"
        strokeDasharray={`${circumference} ${circumference}`}
        style={{ strokeDashoffset, opacity: 0.04, filter: "blur(8px)" }}
        r={normalizedRadius}
        cx={radius}
        cy={radius}
      />

      {/* Layer 5: Mid glow */}
      <circle
        className="progress-ring-circle"
        stroke={dynamicColor}
        fill="transparent"
        strokeWidth={stroke + 6}
        strokeLinecap="round"
        strokeDasharray={`${circumference} ${circumference}`}
        style={{ strokeDashoffset, opacity: 0.15, filter: "blur(3px)" }}
        r={normalizedRadius}
        cx={radius}
        cy={radius}
      />

      {/* Layer 6: Core arc */}
      <circle
        className="progress-ring-circle"
        stroke="url(#arc-gradient)"
        fill="transparent"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${circumference} ${circumference}`}
        style={{ strokeDashoffset, filter: `drop-shadow(0 0 8px ${dynamicColor}88)` }}
        r={normalizedRadius}
        cx={radius}
        cy={radius}
      />

      {/* Layer 7: Leading edge bright dot */}
      {progress > 0 && (
        <>
          <circle
            cx={dotX}
            cy={dotY}
            r={4}
            fill="white"
            opacity={0.9}
            style={{ filter: `drop-shadow(0 0 6px ${dynamicColor})` }}
          />
          <circle
            cx={dotX}
            cy={dotY}
            r={8}
            fill={dynamicColor}
            opacity={0.2}
            style={{ filter: "blur(2px)" }}
          />
        </>
      )}
    </svg>
  );
}
