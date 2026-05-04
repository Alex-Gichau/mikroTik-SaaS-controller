'use client';

interface SparklineChartProps {
  data: number[];
  color: string;
  label?: string;
  unit?: string;
  height?: number;
}

function smoothPath(pts: [number, number][]): string {
  if (pts.length < 2) return '';
  let d = `M ${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const mx = (pts[i - 1][0] + pts[i][0]) / 2;
    d += ` C ${mx},${pts[i - 1][1]} ${mx},${pts[i][1]} ${pts[i][0]},${pts[i][1]}`;
  }
  return d;
}

export function SparklineChart({
  data,
  color,
  label,
  unit = '',
  height = 80,
}: SparklineChartProps) {
  if (!data || data.length === 0) return null;

  const W = 400;
  const H = height;
  const PL = 4, PR = 4, PT = 6, PB = 6;
  const max = Math.max(...data, 0.001);
  const min = Math.min(...data);
  const range = max - min || 1;

  const pts: [number, number][] = data.map((v, i) => [
    PL + (i / (data.length - 1)) * (W - PL - PR),
    H - PB - ((v - min) / range) * (H - PT - PB),
  ]);

  const line = smoothPath(pts);
  const last = pts[pts.length - 1];
  const first = pts[0];
  const area = `${line} L ${last[0]},${H - PB} L ${first[0]},${H - PB} Z`;
  const gradId = `sg-${color.replace('#', '')}-${label?.replace(/\W/g, '') ?? 'c'}`;
  const current = data[data.length - 1];
  const peak = max;

  return (
    <div>
      {label && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-white/40">{label}</span>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-white/20">
              peak {peak.toFixed(1)}{unit}
            </span>
            <span className="text-sm font-bold text-white">
              {current.toFixed(1)}
              <span className="text-white/40 text-xs ml-0.5">{unit}</span>
            </span>
          </div>
        </div>
      )}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ height }}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0"   />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#${gradId})`} />
        <path
          d={line}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx={last[0]} cy={last[1]} r="5" fill={color} fillOpacity="0.2" />
        <circle cx={last[0]} cy={last[1]} r="3" fill={color} />
      </svg>
    </div>
  );
}
