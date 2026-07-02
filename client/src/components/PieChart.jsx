import { useMemo } from 'react';

const palette = ['#5d3891', '#10b981', '#f97316', '#ef4444', '#06b6d4', '#a855f7', '#eab308', '#14b8a6', '#3b82f6', '#f43f5e'];

const toNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

export default function PieChart({ title, data, centerLabel, centerValue, size = 160, stroke = 12, className = '' }) {
  const normalized = useMemo(() => {
    const items = Array.isArray(data) ? data : [];
    const cleaned = items
      .map((item, index) => ({
        label: String(item?.label ?? ''),
        value: toNumber(item?.value),
        color: item?.color || palette[index % palette.length]
      }))
      .filter((item) => item.label && item.value > 0);
    const total = cleaned.reduce((sum, item) => sum + item.value, 0);
    return { items: cleaned, total };
  }, [data]);

  const slices = useMemo(() => {
    if (!normalized.total) return [];
    let acc = 0;
    return normalized.items.map((item) => {
      const pct = (item.value / normalized.total) * 100;
      const slice = { ...item, pct, offset: -acc };
      acc += pct;
      return slice;
    });
  }, [normalized.items, normalized.total]);

  const displayCenterValue = centerValue ?? normalized.total;
  const displayCenterLabel = centerLabel ?? 'Total';

  return (
    <div className={`stat-card p-6 ${className}`}>
      <div className="mb-4">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted">{title}</p>
      </div>
      <div className="flex flex-wrap items-center gap-6">
        <div className="relative shrink-0" style={{ width: size, height: size }}>
          <svg width={size} height={size} viewBox="0 0 32 32" className="block">
            <circle cx="16" cy="16" r="14" fill="none" stroke="rgba(148,163,184,0.22)" strokeWidth={stroke} />
            <g transform="rotate(-90 16 16)">
              {slices.map((slice) => (
                <circle
                  key={slice.label}
                  cx="16"
                  cy="16"
                  r="14"
                  fill="none"
                  stroke={slice.color}
                  strokeWidth={stroke}
                  strokeLinecap="butt"
                  pathLength="100"
                  strokeDasharray={`${slice.pct} ${100 - slice.pct}`}
                  strokeDashoffset={slice.offset}
                />
              ))}
            </g>
          </svg>
          <div className="absolute inset-0 grid place-items-center text-center">
            <div>
              <div className="text-2xl font-semibold text-ink">{displayCenterValue}</div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">{displayCenterLabel}</div>
            </div>
          </div>
        </div>
        <div className="min-w-[220px] flex-1 space-y-2">
          {normalized.items.length === 0 ? (
            <div className="rounded-2xl bg-bg-soft px-4 py-6 text-center text-sm text-muted">No data</div>
          ) : (
            normalized.items.map((item) => (
              <div key={item.label} className="flex items-center justify-between gap-3 text-sm">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="truncate font-semibold text-ink">{item.label}</span>
                </div>
                <span className="shrink-0 font-semibold text-muted">{item.value}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

