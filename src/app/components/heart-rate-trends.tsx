import React, { useMemo } from 'react';

export interface HRSample {
  timestamp: string; // ISO
  bpm: number;
}

export function HeartRateTrends({ samples }: { samples: HRSample[] }) {
  // keep latest 200 samples for drawing
  const pts = samples.slice(0, 200).reverse();

  const stats = useMemo(() => {
    if (pts.length === 0) return { avg: 0, high: 0, low: 0 };
    const bpms = pts.map(s => s.bpm);
    const avg = Math.round(bpms.reduce((a, b) => a + b, 0) / bpms.length);
    const high = Math.max(...bpms);
    const low = Math.min(...bpms);
    return { avg, high, low };
  }, [pts]);

  // simple SVG line path (fixed height/width)
  const svgW = 600;
  const svgH = 140;
  const padding = 8;

  const path = useMemo(() => {
    if (pts.length === 0) return '';
    const values = pts.map(p => p.bpm);
    const maxV = Math.max(...values, 100);
    const minV = Math.min(...values, 40);
    const range = Math.max(1, maxV - minV);
    return values
      .map((v, i) => {
        const x = padding + (i / (values.length - 1 || 1)) * (svgW - padding * 2);
        const y = padding + ((maxV - v) / range) * (svgH - padding * 2);
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(' ');
  }, [pts]);

  return (
    <div className="rounded-lg border p-4 bg-white">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">HR Trends</h3>
        <div className="text-sm text-muted-foreground">last {pts.length} samples</div>
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <svg viewBox={`0 0 ${svgW} ${svgH}`} width="100%" height="140" className="rounded">
            <rect x="0" y="0" width={svgW} height={svgH} fill="transparent" />
            {/* grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
              <line
                key={i}
                x1={padding}
                x2={svgW - padding}
                y1={padding + t * (svgH - padding * 2)}
                y2={padding + t * (svgH - padding * 2)}
                stroke="#e6f3ef"
                strokeWidth={1}
              />
            ))}
            {/* path */}
            <path d={path} fill="none" stroke="#2f9e88" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          </svg>
        </div>

        <div className="w-40">
          <div className="text-xs text-muted-foreground">Average</div>
          <div className="text-2xl font-bold">{stats.avg || '-'}</div>

          <div className="text-xs text-muted-foreground mt-3">High</div>
          <div className="text-lg font-medium text-destructive">{stats.high || '-'}</div>

          <div className="text-xs text-muted-foreground mt-3">Low</div>
          <div className="text-lg font-medium text-success">{stats.low || '-'}</div>
        </div>
      </div>
    </div>
  );
}