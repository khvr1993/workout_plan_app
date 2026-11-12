export interface VolumeBar {
  label: string;
  value: number;
}

/** Monochrome session-volume bars. */
export function VolumeBars({ bars, unit }: { bars: VolumeBar[]; unit: string }) {
  if (bars.length === 0) return null;
  const W = 640;
  const H = 160;
  const PAD = { top: 12, right: 16, bottom: 28, left: 44 };
  const iw = W - PAD.left - PAD.right;
  const ih = H - PAD.top - PAD.bottom;
  const max = Math.max(...bars.map((b) => b.value), 1);
  const gap = 6;
  const bw = Math.max(4, (iw - gap * (bars.length - 1)) / bars.length);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-auto"
      role="img"
      aria-label={`Session volume, latest ${Math.round(bars[bars.length - 1].value)} ${unit}`}
    >
      {[0.5, 1].map((f) => (
        <g key={f}>
          <line
            x1={PAD.left}
            x2={W - PAD.right}
            y1={PAD.top + ih * (1 - f)}
            y2={PAD.top + ih * (1 - f)}
            stroke="var(--border)"
          />
          <text
            x={PAD.left - 8}
            y={PAD.top + ih * (1 - f) + 4}
            textAnchor="end"
            fontSize="11"
            fill="var(--text-muted)"
          >
            {Math.round((max * f) / 100) * 100}
          </text>
        </g>
      ))}
      {bars.map((b, i) => {
        const h = Math.max(2, (b.value / max) * ih);
        return (
          <rect
            key={i}
            x={PAD.left + i * (bw + gap)}
            y={PAD.top + ih - h}
            width={bw}
            height={h}
            rx={2}
            fill="var(--border-strong)"
          />
        );
      })}
      <text x={PAD.left} y={H - 8} fontSize="11" fill="var(--text-muted)">
        {bars[0].label}
      </text>
      {bars.length > 1 && (
        <text x={W - PAD.right} y={H - 8} textAnchor="end" fontSize="11" fill="var(--text-muted)">
          {bars[bars.length - 1].label}
        </text>
      )}
    </svg>
  );
}