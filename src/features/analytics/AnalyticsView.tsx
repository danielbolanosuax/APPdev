// FILE: src/features/analytics/AnalyticsView.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  PieChart, ShoppingBasket, AlertTriangle, PackageCheck, Gauge, Tag,
  Timer, Download, MapPin, TrendingUp, TrendingDown
} from "lucide-react";
import { useStore, selectors, InventoryItem, Location } from "../../state/store";

/* ========= Tipos & helpers ========= */
type LocationKey = "Pantry" | "Fridge" | "Freezer";
type FilterLoc = "all" | LocationKey;
type BucketKey = "fresh" | "expiring" | "used" | "other";

const LOCS: LocationKey[] = ["Pantry", "Fridge", "Freezer"];
const SNAP_KEY = "sp:analytics:snapshots";

const q = (v: number | undefined | null) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const pct = (part: number, total: number) => (total > 0 ? Math.round((part / total) * 100) : 0);
const toKey = (d: Date) => d.toISOString().slice(0, 10);
const toneFromStatus = (s?: string): BucketKey => {
  const t = (s || "").toLowerCase();
  if (t.includes("expire")) return "expiring";
  if (t.includes("used") || t.includes("empty")) return "used";
  if (t.includes("fresh") || t.includes("ok") || t.includes("long")) return "fresh";
  return "other";
};

type Snapshot = { d: string; qty: number; items: number };

/* ========= Sparkline simple (SVG) ========= */
function Sparkline({ values, width = 120, height = 36 }: { values: number[]; width?: number; height?: number }) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(1, max - min);
  const stepX = values.length > 1 ? width / (values.length - 1) : width;

  const points = values.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / span) * height;
    return `${x},${y}`;
  });

  return (
    <svg className="sparkline" width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <polyline fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2" points={points.join(" ")} />
      {points.length ? (
        <circle
          cx={Number(points[points.length - 1].split(",")[0])}
          cy={Number(points[points.length - 1].split(",")[1])}
          r="2.8"
          fill="currentColor"
        />
      ) : null}
    </svg>
  );
}

/* ========= Donut genérico ========= */
function Donut({
  title,
  segments,
  centerValue,
  centerLabel,
}: {
  title: string;
  segments: { label: string; color: string; value: number }[];
  centerValue: string;
  centerLabel: string;
}) {
  const size = 240;
  const stroke = 22;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const total = segments.reduce((s, x) => s + x.value, 0);

  let acc = 0;
  const arcs = segments.map((s) => {
    const len = total > 0 ? (s.value / total) * c : 0;
    const dasharray = `${len} ${c - len}`;
    const dashoffset = c - acc;
    acc += len;
    return { ...s, dasharray, dashoffset };
  });

  return (
    <div className="card-pro">
      <div className="card-head">
        <div className="card-title">
          <span className="ringed"><PieChart className="w-4 h-4" /></span>
          <div><h3>{title}</h3><p className="eyebrow">Distribution</p></div>
        </div>
      </div>

      <div className="grid-two">
        <figure className="donut" role="img" aria-label={title}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <g transform={`translate(${size / 2}, ${size / 2}) rotate(-90)`}>
              <circle r={r} cx={0} cy={0} fill="none" stroke="rgba(0,0,0,.06)" strokeWidth={stroke} />
              {arcs.map((a) => (
                <circle
                  key={a.label}
                  r={r}
                  cx={0} cy={0}
                  fill="none"
                  stroke={a.color}
                  strokeWidth={stroke}
                  strokeDasharray={a.dasharray}
                  strokeDashoffset={a.dashoffset}
                />
              ))}
            </g>
          </svg>
          <div className="donut-hole">
            <div className="donut-center">
              <div className="center-big">{centerValue}</div>
              <div className="eyebrow">{centerLabel}</div>
            </div>
          </div>
        </figure>

        <ul className="legend">
          {segments.map((s) => (
            <li key={s.label}>
              <span className="legend-dot" style={{ background: s.color }} />
              <span className="legend-label">{s.label}</span>
              <span className="legend-val">{pct(s.value, total)}%</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ========= Barras verticales (Top categorías) ========= */
function Bars({
  title,
  data,
  unit,
  maxBars = 6,
}: {
  title: string;
  data: { label: string; value: number }[];
  unit: string;
  maxBars?: number;
}) {
  const top = useMemo(() => data.slice().sort((a, b) => b.value - a.value).slice(0, maxBars), [data, maxBars]);
  const max = Math.max(1, top.reduce((m, d) => Math.max(m, d.value), 0));

  return (
    <div className="card-pro">
      <div className="card-head">
        <div className="card-title">
          <span className="ringed"><Tag className="w-4 h-4" /></span>
          <div><h3>{title}</h3><p className="eyebrow">Top {maxBars}</p></div>
        </div>
      </div>

      <div className="bars">
        {top.map((d) => {
          const h = Math.max(10, (d.value / max) * 170);
          return (
            <div key={d.label} className="bar" aria-label={`${d.label} ${d.value} ${unit}`}>
              <div className="bar-fill" style={{ height: `${h}px` }} title={`${d.value} ${unit}`} />
              <div className="bar-label">{d.label}</div>
              <div className="bar-value">
                {Number.isInteger(d.value) ? d.value : d.value.toFixed(1)} {unit}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ========= KPIs ========= */
function Kpi({
  icon, title, value, note, trendPct, up,
}: {
  icon: React.ReactNode; title: string; value: string; note: string; trendPct: number; up: boolean;
}) {
  return (
    <div className={`card-metric ${up ? "trend-up" : "trend-down"}`}>
      <div className="metric-head">
        <span className="ringed">{icon}</span>
        <div className="metric-title">{title}</div>
      </div>
      <div className="metric-body">
        <div className="metric-value">{value}</div>
        <div className="metric-note">{note}</div>
      </div>
      <div className="metric-trend">
        {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        <span>{isFinite(trendPct) ? `${Math.abs(Math.round(trendPct))}%` : "—"}</span>
        <Sparkline values={[0, 0, 0]} /> {/* placeholder to keep structure if CSS wants */}
      </div>
    </div>
  );
}

/* ========= Listas ========= */
function ListCard({
  title, icon, items, emptyTitle, emptyNote,
}: {
  title: string; icon: React.ReactNode; items: InventoryItem[]; emptyTitle: string; emptyNote: string;
}) {
  return (
    <div className="card-pro">
      <div className="card-head">
        <div className="card-title">
          <span className="ringed">{icon}</span>
          <div><h3>{title}</h3><p className="eyebrow">Top {items.length || 0}</p></div>
        </div>
      </div>
      {items.length === 0 ? (
        <div className="empty-card">
          <div className="empty-title">{emptyTitle}</div>
          <p className="eyebrow">{emptyNote}</p>
        </div>
      ) : (
        <ul className="risk">
          {items.map((it) => (
            <li key={it.id}>
              <span className="risk-name">{it.baseName}</span>
              <span className="risk-status">{it.status}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ========= Vista principal ========= */
export default function AnalyticsView() {
  const items = useStore(selectors.items);
  const addRow = useStore((s) => s.addRow);
  const [filterLoc, setFilterLoc] = useState<FilterLoc>("all");

  /* --- snapshots para sparkline 7d --- */
  useEffect(() => {
    try {
      const today = toKey(new Date());
      const snaps: Snapshot[] = JSON.parse(localStorage.getItem(SNAP_KEY) || "[]");
      const qty = items.reduce((s, it) => s + q(it.qty), 0);
      const foundIdx = snaps.findIndex((x) => x.d === today);
      if (foundIdx >= 0) snaps[foundIdx] = { d: today, qty, items: items.length };
      else snaps.push({ d: today, qty, items: items.length });
      localStorage.setItem(SNAP_KEY, JSON.stringify(snaps.slice(-30)));
    } catch {
      /* no-op */
    }
  }, [items]);

  const snaps = useMemo<Snapshot[]>(() => {
    try { return JSON.parse(localStorage.getItem(SNAP_KEY) || "[]"); } catch { return []; }
  }, []);

  const last7Qty = useMemo(() => snaps.slice(-7).map((s) => s.qty), [snaps]);
  const trend7 = useMemo(() => {
    const prev = snaps.at(-8)?.qty ?? snaps.at(0)?.qty ?? 0;
    const curr = snaps.at(-1)?.qty ?? 0;
    const delta = curr - prev;
    return { pct: prev ? (delta / prev) * 100 : 0, up: delta >= 0 };
  }, [snaps]);

  /* --- datos filtrados --- */
  const view = useMemo(() => {
    const base = filterLoc === "all" ? items : items.filter((i) => i.location === filterLoc);
    const totalItems = base.length;
    const totalQty = base.reduce((s, it) => s + q(it.qty), 0);

    const byLocation = LOCS.map((l) => ({
      label: l,
      value: base.filter((it) => it.location === l).reduce((s, it) => s + q(it.qty), 0),
    }));

    const catMap = new Map<string, number>();
    base.forEach((it) => {
      const cat = (it.category || "Other") as string;
      catMap.set(cat, (catMap.get(cat) || 0) + q(it.qty));
    });
    const byCategory = Array.from(catMap.entries()).map(([label, value]) => ({ label, value }));

    const counts: Record<BucketKey, number> = { fresh: 0, expiring: 0, used: 0, other: 0 };
    base.forEach((it) => { counts[toneFromStatus(it.status)] += 1; });

    const buckets = [
      { label: "Fresh", color: "#16a34a", value: counts.fresh },
      { label: "Expiring", color: "#ef4444", value: counts.expiring },
      { label: "Used", color: "#64748b", value: counts.used },
      { label: "Other", color: "#f59e0b", value: counts.other },
    ];

    const expiringList = base
      .filter((it) => (it.status || "").toLowerCase().includes("expire"))
      .sort((a, b) => q(b.qty) - q(a.qty))
      .slice(0, 8);

    const lowStockList = base
      .filter((it) => q(it.qty) <= 0)
      .sort((a, b) => a.baseName.localeCompare(b.baseName))
      .slice(0, 8);

    return { base, totalItems, totalQty, byLocation, byCategory, buckets, expiringList, lowStockList };
  }, [items, filterLoc]);

  const totalByLoc = view.byLocation.reduce((s, d) => s + d.value, 0);

  function exportInventoryCSV(): void {
    const rows: string[][] = [
      ["baseName", "qty", "unit", "location", "category", "status"],
      ...view.base.map((it) => [
        it.baseName, String(q(it.qty)), String(it.unit || ""), String(it.location || ""),
        String(it.category || ""), String(it.status || ""),
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = "inventory_analytics.csv"; a.click(); URL.revokeObjectURL(url);
  }

  function addLowToShopping(): void {
    view.lowStockList.forEach((it) =>
      addRow({
        name: it.baseName,
        qty: 1,
        unit: (it.unit as string) || "units",
        location: (it.location as Location) || ("Pantry" as Location),
        purchased: false,
      })
    );
    alert("Added low/zero stock items to Shopping.");
  }

  return (
    <section className="analytics-pro">
      {/* Header + filtros */}
      <div className="card-head">
        <div className="card-title">
          <span className="ringed"><PieChart className="w-4 h-4" /></span>
          <div><h3>Analytics</h3><p className="eyebrow">Kitchen overview</p></div>
        </div>

        <div className="tool seg-group" role="tablist" aria-label="Location filter">
          {(["all", ...LOCS] as const).map((l) => (
            <button key={String(l)} role="tab" aria-checked={filterLoc === l}
              onClick={() => setFilterLoc(l as FilterLoc)} className="seg">
              {l === "all" ? "All" : (<span style={{display:"inline-flex",alignItems:"center",gap:6}}>
                <MapPin className="w-3 h-3" /> {l}
              </span>)}
            </button>
          ))}
        </div>

        <div className="dock-right">
          <button className="sp-btn sp-btn-ghost" onClick={exportInventoryCSV}><Download className="w-4 h-4" /> Export</button>
        </div>
      </div>

      {/* KPIs */}
      <div className="kpis-grid">
        <div className="kpi-with-spark">
          <Kpi
            icon={<PackageCheck className="w-4 h-4" />}
            title="Items"
            value={String(view.totalItems)}
            note={filterLoc === "all" ? "in inventory" : `in ${filterLoc}`}
            trendPct={trend7.pct}
            up={trend7.up}
          />
          <div className="spark-wrap"><Sparkline values={last7Qty.length ? last7Qty : [0]} /></div>
        </div>

        <div className="kpi-with-spark">
          <Kpi
            icon={<ShoppingBasket className="w-4 h-4" />}
            title="Total qty"
            value={Number.isInteger(view.totalQty) ? String(view.totalQty) : view.totalQty.toFixed(1)}
            note="sum of quantities"
            trendPct={trend7.pct}
            up={trend7.up}
          />
          <div className="spark-wrap"><Sparkline values={last7Qty.length ? last7Qty : [0]} /></div>
        </div>

        <Kpi
          icon={<AlertTriangle className="w-4 h-4" />}
          title="Expiring soon"
          value={String(view.expiringList.length)}
          note="status contains 'expire'"
          trendPct={0}
          up={false}
        />
        <Kpi
          icon={<Timer className="w-4 h-4" />}
          title="Zero qty"
          value={String(view.lowStockList.length)}
          note="need restock"
          trendPct={0}
          up={false}
        />
      </div>

      {/* Grid pro */}
      <div className="analytics-pro-grid">
        <Donut
          title={filterLoc === "all" ? "Stock by location" : `Stock (${filterLoc})`}
          segments={[
            { label: "Pantry", color: "#16a34a", value: view.byLocation.find((d) => d.label === "Pantry")?.value || 0 },
            { label: "Fridge", color: "#22c55e", value: view.byLocation.find((d) => d.label === "Fridge")?.value || 0 },
            { label: "Freezer", color: "#34d399", value: view.byLocation.find((d) => d.label === "Freezer")?.value || 0 },
          ]}
          centerValue={Number.isInteger(view.totalQty) ? String(view.totalQty) : view.totalQty.toFixed(1)}
          centerLabel="total qty"
        />

        <Bars title="Top categories" data={view.byCategory} unit="qty" maxBars={6} />

        <div className="card-pro">
          <div className="card-head">
            <div className="card-title">
              <span className="ringed"><Gauge className="w-4 h-4" /></span>
              <div><h3>Status mix</h3><p className="eyebrow">Fresh / Expiring / Used</p></div>
            </div>
          </div>

          <ul className="status-list">
            {view.buckets.map((b) => (
              <li key={b.label}>
                <div className="status-row">
                  <span className="status-label">{b.label}</span>
                  <span className="status-val">{b.value}</span>
                </div>
                <div className="status-bar">
                  <div className="status-fill" style={{ width: `${pct(b.value, view.totalItems)}%`, background: b.color }} />
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="lists-pro">
          <ListCard
            title="Expiring soon"
            icon={<AlertTriangle className="w-4 h-4" />}
            items={view.expiringList}
            emptyTitle="All safe"
            emptyNote="Nothing expiring."
          />
          <div className="card-pro">
            <div className="card-head">
              <div className="card-title">
                <span className="ringed"><ShoppingBasket className="w-4 h-4" /></span>
                <div><h3>Low / Zero stock</h3><p className="eyebrow">Top {view.lowStockList.length || 0}</p></div>
              </div>
              <button className="sp-btn sp-btn-primary" onClick={addLowToShopping}>
                <ShoppingBasket className="w-4 h-4" /> Add all to Shopping
              </button>
            </div>

            {view.lowStockList.length === 0 ? (
              <div className="empty-card">
                <div className="empty-title">Fully stocked</div>
                <p className="eyebrow">No zero-qty items.</p>
              </div>
            ) : (
              <ul className="risk">
                {view.lowStockList.map((it) => (
                  <li key={it.id}>
                    <span className="risk-name">{it.baseName}</span>
                    <span className="risk-status">{`${q(it.qty)} ${it.unit}`}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}        