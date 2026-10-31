import { useEffect, useRef, useState } from 'react';
import { Table2, BarChart3 } from 'lucide-react';
import { SOURCE_SERIES } from '@/components/dashboard/sourceSeries';
import { totalXp } from '@/lib/stats';
import type { DayStats } from '@/types';

interface ChartDay {
  day: string;
  date: Date;
  stats: DayStats;
}

const HEIGHT = 240;
const PAD = { top: 12, right: 8, bottom: 28, left: 40 };
const GAP = 2;

function niceMax(value: number): number {
  if (value <= 10) return 10;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * magnitude * 4 >= value) ?? 10;
  return step * magnitude * 4;
}

function roundedTop(x: number, y: number, w: number, h: number, r: number): string {
  const radius = Math.min(r, w / 2, h);
  return `M${x},${y + h}V${y + radius}Q${x},${y} ${x + radius},${y}H${x + w - radius}Q${x + w},${y} ${x + w},${y + radius}V${y + h}Z`;
}

const shortDate = (date: Date) => date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

export function XpHistoryChart({ days }: { days: ChartDay[] }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [hover, setHover] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
    // The chart container remounts when switching back from the table view.
  }, [showTable]);

  const max = niceMax(Math.max(...days.map((d) => totalXp(d.stats)), 0));
  const plotW = Math.max(0, width - PAD.left - PAD.right);
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const slot = plotW / days.length;
  const barW = Math.max(6, Math.min(28, slot * 0.6));
  const y = (value: number) => PAD.top + plotH - (value / max) * plotH;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(max * t));
  const labelEvery = width < 480 ? 3 : 2;
  const empty = days.every((d) => totalXp(d.stats) === 0);
  const hovered = hover !== null ? days[hover] : null;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ul className="flex flex-wrap gap-4" aria-label="Legend">
          {SOURCE_SERIES.map((series) => (
            <li key={series.key} className="flex items-center gap-2 text-xs text-ink-muted">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: series.color }} aria-hidden="true" />
              {series.label}
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => setShowTable((value) => !value)}
          className="focus-ring flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1 text-xs text-ink-muted transition hover:border-primary-500 hover:text-primary-700"
        >
          {showTable ? <BarChart3 className="h-3.5 w-3.5" aria-hidden="true" /> : <Table2 className="h-3.5 w-3.5" aria-hidden="true" />}
          {showTable ? 'Show chart' : 'Show table'}
        </button>
      </div>

      {showTable ? (
        <div className="mt-4 max-h-[260px] overflow-auto">
          <table className="w-full text-left text-xs tabular-nums">
            <thead className="sticky top-0 bg-surface text-ink-muted">
              <tr>
                <th className="py-1.5 pr-3 font-medium">Day</th>
                {SOURCE_SERIES.map((series) => (
                  <th key={series.key} className="py-1.5 pr-3 text-right font-medium">
                    {series.label}
                  </th>
                ))}
                <th className="py-1.5 text-right font-medium">Total XP</th>
              </tr>
            </thead>
            <tbody>
              {[...days].reverse().map((d) => (
                <tr key={d.day} className="border-t border-line text-ink">
                  <td className="py-1.5 pr-3">{shortDate(d.date)}</td>
                  {SOURCE_SERIES.map((series) => (
                    <td key={series.key} className="py-1.5 pr-3 text-right">
                      {d.stats[series.key]}
                    </td>
                  ))}
                  <td className="py-1.5 text-right font-semibold">{totalXp(d.stats)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div ref={wrapRef} className="relative mt-4" onMouseLeave={() => setHover(null)}>
          <svg width={width} height={HEIGHT} role="img" aria-label={`XP earned per day over the last ${days.length} days, by source`}>
            {ticks.map((tick) => (
              <g key={tick}>
                <line x1={PAD.left} x2={width - PAD.right} y1={y(tick)} y2={y(tick)} stroke="#0F3319" strokeWidth={1} />
                <text x={PAD.left - 8} y={y(tick)} textAnchor="end" dominantBaseline="middle" className="fill-ink-subtle text-[10px]">
                  {tick}
                </text>
              </g>
            ))}

            {days.map((d, i) => {
              const cx = PAD.left + slot * i + slot / 2;
              const x = cx - barW / 2;
              const segments = SOURCE_SERIES.map((s) => ({ ...s, value: d.stats[s.key] })).filter((s) => s.value > 0);
              let base = 0;
              return (
                <g key={d.day}>
                  {hover === i && (
                    <rect x={cx - slot / 2} y={PAD.top} width={slot} height={plotH} fill="rgba(0, 255, 65, 0.06)" />
                  )}
                  {segments.map((segment, j) => {
                    const top = y(base + segment.value);
                    const bottom = y(base);
                    base += segment.value;
                    const isTop = j === segments.length - 1;
                    // 2px surface gap between stacked segments.
                    const h = Math.max(0, bottom - top - (j > 0 ? GAP : 0));
                    return isTop ? (
                      <path key={segment.key} d={roundedTop(x, top, barW, h, 4)} fill={segment.color} />
                    ) : (
                      <rect key={segment.key} x={x} y={top} width={barW} height={h} fill={segment.color} />
                    );
                  })}
                  {i % labelEvery === (days.length - 1) % labelEvery && (
                    <text x={cx} y={HEIGHT - 8} textAnchor="middle" className="fill-ink-subtle text-[10px]">
                      {shortDate(d.date)}
                    </text>
                  )}
                  {/* Full-column hit target, larger than the bar itself. */}
                  <rect
                    x={cx - slot / 2}
                    y={PAD.top}
                    width={slot}
                    height={plotH}
                    fill="transparent"
                    tabIndex={0}
                    aria-label={`${shortDate(d.date)}: ${totalXp(d.stats)} XP`}
                    onMouseEnter={() => setHover(i)}
                    onFocus={() => setHover(i)}
                    onBlur={() => setHover(null)}
                    className="outline-none"
                  />
                </g>
              );
            })}
          </svg>

          {empty && (
            <p className="pointer-events-none absolute inset-0 flex items-center justify-center pb-6 text-sm text-ink-muted">
              No XP earned in this window yet. Shoot some asteroids!
            </p>
          )}

          {hovered && hover !== null && (
            <div
              className="pointer-events-none absolute top-2 z-10 w-44 rounded-lg border border-line bg-paper/95 p-3 text-xs shadow-lift"
              style={{
                left: Math.min(Math.max(PAD.left + slot * hover + slot / 2 - 88, 0), Math.max(0, width - 176)),
              }}
            >
              <p className="font-semibold text-ink">{shortDate(hovered.date)}</p>
              <ul className="mt-2 space-y-1">
                {SOURCE_SERIES.map((series) => (
                  <li key={series.key} className="flex items-center justify-between gap-2 text-ink-muted">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: series.color }} aria-hidden="true" />
                      {series.label}
                    </span>
                    <span className="tabular-nums text-ink">{hovered.stats[series.key]} XP</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 flex justify-between border-t border-line pt-2 font-semibold text-ink">
                <span>Total</span>
                <span className="tabular-nums">{totalXp(hovered.stats)} XP</span>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
