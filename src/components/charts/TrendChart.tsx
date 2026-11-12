export interface TrendPoint {
  label: string;
  value: number;
}

/** Single-accent line chart, monochrome axes. No gradients. */
export function TrendChart({ points, unit }: { points: TrendPoint[]; unit: string }) {
  if (points.length === 0) return null;

  const W = 640;
  const H = 200;
  const PAD = { top: 16, right: 16, bottom: 28, left: 44 };
  const iw = W - PAD.left - PAD.right;
  const ih = H - PAD.top - PAD.bottom;

  const values = points.map((p) => p.value);
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (min === max) {
    min = min - 1;
    max = max + 1;
  }
  const span = max - min;
  min = Math.max(0, min - span * 0.15);
  max = max + span * 0.15;

  const x = (i: number) => PAD.left + (points.length === 1 ? iw / 2 : (i / (points.length - 1)) * iw);
  const y = (v: number) => PAD.top + (1 - (v - min) / (max - min)) * ih;

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const yTicks = [min, (min + max) / 2, max];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-auto"
      role="img"
      aria-label={`Trend from ${points[0].value} to ${points[points.length - 1].value} ${unit}`}
    >
      {yTicks.map((t) => (
        <g key={t}>
          <line
            x1={PAD.left}
            x2={W - PAD.right}
            y1={y(t)}
            y2={y(t)}
            stroke="var(--border)"
            strokeWidth="1"
          />
          <text
            x={PAD.left - 8}
            y={y(t) + 4}
            textAnchor="end"
            fontSize="11"
            fill="var(--text-muted)"
            className="tnum"
          >
            {Math.round(t * 10) / 10}
          </text>
        </g>
      ))}
      <path d={path} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle key={i} cx={x(i)} cy={y(p.value)} r="3" fill="var(--accent)" />
      ))}
      <text x={PAD.left} y={H - 8} fontSize="11" fill="var(--text-muted)">
        {points[0].label}
      </text>
      {points.length > 1 && (
        <text x={W - PAD.right} y={H - 8} textAnchor="end" fontSize="11" fill="var(--text-muted)">
          {points[points.length - 1].label}
        </text>
      )}
    </svg>
  );
}