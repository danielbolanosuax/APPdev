import React from "react";

/* ======================== CARD + LAYOUT ======================== */
export function Card({
  title,
  icon,
  right,
  children,
  subtitle,
  className = "",
}: {
  title?: string;
  icon?: React.ReactNode;
  right?: React.ReactNode;
  subtitle?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className={`card-pro ${className}`}>
      {(title || right) && (
        <header className="card-head">
          <div className="card-title">
            {icon && <span className="ringed">{icon}</span>}
            <div>
              <h3>{title}</h3>
              {subtitle && <p className="eyebrow">{subtitle}</p>}
            </div>
          </div>
          {right}
        </header>
      )}
      {children}
    </section>
  );
}

export function Divider() {
  return <div className="divider" role="separator" />;
}

/* ======================== STAT TILE ========================= */
export function Stat({
  icon,
  title,
  value,
  note,
  tone = "neutral",
}: {
  icon?: React.ReactNode;
  title: string;
  value: string;
  note?: string;
  tone?: "neutral" | "ok" | "warn";
}) {
  return (
    <div className={`stat ${tone}`}>
      <div className="stat-top">
        <span className="ringed">{icon}</span>
        <span className="eyebrow">{title}</span>
      </div>
      <div className="stat-value">{value}</div>
      {note && <div className="stat-note">{note}</div>}
    </div>
  );
}

/* ======================== DONUT ============================= */
export function Donut({
  segments,
  center,
}: {
  segments: { value: number; color: string; label: string }[];
  center?: React.ReactNode;
}) {
  const total = Math.max(1, segments.reduce((s, x) => s + x.value, 0));
  let acc = 0;
  const stops = segments.map((s) => {
    const from = (acc / total) * 360;
    acc += s.value;
    const to = (acc / total) * 360;
    return `${s.color} ${from}deg ${to}deg`;
  });
  return (
    <div className="donut">
      <div className="donut-ring" style={{ backgroundImage: `conic-gradient(${stops.join(",")})` }} />
      <div className="donut-hole">
        <div className="donut-center">{center}</div>
      </div>
    </div>
  );
}

export function Legend({
  items,
}: {
  items: { label: string; color: string; value: string }[];
}) {
  return (
    <ul className="legend">
      {items.map((it) => (
        <li key={it.label}>
          <span className="legend-dot" style={{ background: it.color }} />
          <span className="legend-label">{it.label}</span>
          <span className="legend-val">{it.value}</span>
        </li>
      ))}
    </ul>
  );
}

/* ======================== BARS MINI ========================= */
export function Bars({
  data,
  maxHeight = 120,
}: {
  data: { label: string; value: number }[];
  maxHeight?: number;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="bars">
      {data.map((d) => {
        const h = Math.max(8, Math.round((d.value / max) * maxHeight));
        return (
          <div key={d.label} className="bar">
            <div className="bar-fill" style={{ height: h }} />
            <div className="bar-label">{d.label}</div>
            <div className="bar-value">{d.value}</div>
          </div>
        );
      })}
    </div>
  );
}

/* ======================== SPARK AREA ======================== */
export function SparkArea({
  points,
  width = 280,
  height = 64,
}: {
  points: number[];
  width?: number;
  height?: number;
}) {
  const max = Math.max(1, ...points);
  const step = width / Math.max(1, points.length - 1);
  const path = points
    .map((v, i) => {
      const x = i * step;
      const y = height - (v / max) * (height - 6) - 3;
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
  const area = `${path} L ${width} ${height} L 0 ${height} Z`;
  return (
    <svg width={width} height={height} className="spark">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.55" />
          <stop offset="100%" stopColor="var(--brand)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#g)" />
      <path d={path} fill="none" stroke="var(--brand)" strokeWidth="2.5" />
    </svg>
  );
}

/* ======================== GOAL RING ======================== */
export function GoalRing({ pct, label }: { pct: number; label: string }) {
  const p = Math.max(0, Math.min(100, pct));
  return (
    <div className="goal">
      <div
        className="goal-ring"
        style={{ backgroundImage: `conic-gradient(var(--brand) ${p * 3.6}deg, var(--goal-bg) 0)` }}
      />
      <div className="goal-hole">
        <div className="goal-center">
          <div className="goal-val">{p}%</div>
          <div className="eyebrow">{label}</div>
        </div>
      </div>
    </div>
  );
}
