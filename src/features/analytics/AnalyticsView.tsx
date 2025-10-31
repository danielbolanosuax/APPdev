// FILE: src/features/analytics/AnalyticsView.tsx
import React, { useMemo, useState } from "react";
import {
  PieChart,
  ShoppingBasket,
  AlertTriangle,
  PackageCheck,
  Gauge,
  Tag,
  Timer,
  Download,
  MapPin,
} from "lucide-react";
import { useStore, selectors, InventoryItem } from "../../state/store";

/* ========== Types & helpers ========== */
type LocationKey = "Pantry" | "Fridge" | "Freezer";
type FilterLoc = "all" | LocationKey;
type BucketKey = "fresh" | "expiring" | "used" | "other";

const LOCS: LocationKey[] = ["Pantry", "Fridge", "Freezer"];

function q(v: number | undefined | null): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function toneFromStatus(s: string | undefined): BucketKey {
  const t = (s || "").toLowerCase();
  if (t.includes("expire")) return "expiring";
  if (t.includes("used") || t.includes("empty")) return "used";
  if (t.includes("fresh") || t.includes("ok") || t.includes("long")) return "fresh";
  return "other";
}
function pct(part: number, total: number): string {
  return `${total > 0 ? Math.round((part / total) * 100) : 0}%`;
}
function downloadCSV(rows: string[][], filename: string): void {
  const csv = rows
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ========== Reusable Charts (SVG) ========== */
function DonutChart({
  title,
  segments,
  total,
  centerValue,
  centerLabel,
}: {
  title: string;
  segments: { label: string; color: string; value: number }[];
  total: number;
  centerValue: string;
  centerLabel: string;
}) {
  const size = 220;
  const stroke = 22;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;

  let acc = 0;
  const arcs = segments.map((s) => {
    const len = Math.max(0, Math.min(c, total > 0 ? (s.value / total) * c : 0));
    const dasharray = `${len} ${c - len}`;
    const dashoffset = c - acc;
    acc += len;
    return { ...s, dasharray, dashoffset };
  });

  return (
    <div className="card-pro">
      <div className="card-head">
        <div className="card-title">
          <span className="ringed">
            <PieChart className="w-4 h-4" />
          </span>
          <div>
            <h3>{title}</h3>
            <p className="eyebrow">Distribution</p>
          </div>
        </div>
      </div>

      <div className="grid-two">
        <figure className="donut" role="img" aria-label={title}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <g transform={`translate(${size / 2}, ${size / 2}) rotate(-90)`}>
              <circle
                r={r}
                cx={0}
                cy={0}
                fill="none"
                stroke="rgba(0,0,0,.06)"
                strokeWidth={stroke}
              />
              {arcs.map((a) => (
                <circle
                  key={a.label}
                  r={r}
                  cx={0}
                  cy={0}
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
              <span className="legend-val">{pct(s.value, total)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Bars({
  title,
  data,
  unitLabel,
  maxBars = 6,
}: {
  title: string;
  data: { label: string; value: number }[];
  unitLabel: string;
  maxBars?: number;
}) {
  const top = useMemo(
    () =>
      data
        .slice()
        .sort((a, b) => b.value - a.value)
        .slice(0, maxBars),
    [data, maxBars],
  );
  const maxVal = useMemo(() => top.reduce((m, d) => Math.max(m, d.value), 0), [top]);

  return (
    <div className="card-pro">
      <div className="card-head">
        <div className="card-title">
          <span className="ringed">
            <Tag className="w-4 h-4" />
          </span>
          <div>
            <h3>{title}</h3>
            <p className="eyebrow">Top {maxBars}</p>
          </div>
        </div>
      </div>

      <div className="bars">
        {top.map((d) => {
          const h = maxVal > 0 ? Math.max(8, (d.value / maxVal) * 160) : 8;
          return (
            <div key={d.label} className="bar" aria-label={`${d.label} ${d.value} ${unitLabel}`}>
              <div
                className="bar-fill"
                style={{ height: `${h}px` }}
                title={`${d.value} ${unitLabel}`}
              />
              <div className="bar-label">{d.label}</div>
              <div className="bar-value">
                {Number.isInteger(d.value) ? d.value : d.value.toFixed(1)} {unitLabel}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MiniDonut({
  title,
  buckets,
}: {
  title: string;
  buckets: { label: string; color: string; value: number }[];
}) {
  const size = 160;
  const stroke = 18;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const total = buckets.reduce((s, b) => s + b.value, 0);
  let acc = 0;
  const arcs = buckets.map((b) => {
    const len = Math.max(0, Math.min(c, total > 0 ? (b.value / total) * c : 0));
    const dasharray = `${len} ${c - len}`;
    const dashoffset = c - acc;
    acc += len;
    return { ...b, dasharray, dashoffset };
  });

  return (
    <div className="card-pro">
      <div className="card-head">
        <div className="card-title">
          <span className="ringed">
            <Gauge className="w-4 h-4" />
          </span>
          <div>
            <h3>{title}</h3>
            <p className="eyebrow">Status</p>
          </div>
        </div>
      </div>

      <div className="grid-two">
        <figure className="goal" role="img" aria-label={title}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <g transform={`translate(${size / 2}, ${size / 2}) rotate(-90)`}>
              <circle
                r={r}
                cx={0}
                cy={0}
                fill="none"
                stroke="rgba(0,0,0,.06)"
                strokeWidth={stroke}
              />
              {arcs.map((a) => (
                <circle
                  key={a.label}
                  r={r}
                  cx={0}
                  cy={0}
                  fill="none"
                  stroke={a.color}
                  strokeWidth={stroke}
                  strokeDasharray={a.dasharray}
                  strokeDashoffset={a.dashoffset}
                />
              ))}
            </g>
          </svg>
        </figure>

        <ul className="legend">
          {buckets.map((b) => (
            <li key={b.label}>
              <span className="legend-dot" style={{ background: b.color }} />
              <span className="legend-label">{b.label}</span>
              <span className="legend-val">{pct(b.value, total)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ========== Cards simples ========== */
function KpiCard({
  icon,
  title,
  value,
  note,
  warn,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  note: string;
  warn?: boolean;
}) {
  return (
    <div className={`stat ${warn ? "warn" : ""}`}>
      <div className="stat-top">
        <span className="ringed">{icon}</span>
        <div className="stat-note">{title}</div>
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-note">{note}</div>
    </div>
  );
}

function ListCard({
  title,
  icon,
  items,
  emptyTitle,
  emptyNote,
}: {
  title: string;
  icon: React.ReactNode;
  items: InventoryItem[];
  emptyTitle: string;
  emptyNote: string;
}) {
  return (
    <div className="card-pro">
      <div className="card-head">
        <div className="card-title">
          <span className="ringed">{icon}</span>
          <div>
            <h3>{title}</h3>
            <p className="eyebrow">Top {items.length || 0}</p>
          </div>
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

/* ========== Main View ========== */
export default function AnalyticsView() {
  const items = useStore(selectors.items);
  const [filterLoc, setFilterLoc] = useState<FilterLoc>("all");

  const view = useMemo(() => {
    const base = filterLoc === "all" ? items : items.filter((i) => i.location === filterLoc);
    const totalItems = base.length;
    const totalQty = base.reduce((s, it) => s + q(it.qty), 0);

    // por ubicación (si filtro==all muestra todo, si no solo esa loc igualmente útil para donut)
    const byLocation = LOCS.map((l) => ({
      label: l,
      value: base.filter((it) => it.location === l).reduce((s, it) => s + q(it.qty), 0),
    }));

    // categorías
    const catMap = new Map<string, number>();
    base.forEach((it) => {
      const cat = (it.category || "Other") as string;
      catMap.set(cat, (catMap.get(cat) || 0) + q(it.qty));
    });
    const byCategory = Array.from(catMap.entries()).map(([label, value]) => ({ label, value }));

    // buckets status
    const counts: Record<BucketKey, number> = { fresh: 0, expiring: 0, used: 0, other: 0 };
    base.forEach((it) => {
      counts[toneFromStatus(it.status)] += 1;
    });
    const buckets = [
      { label: "Fresh", color: "#16a34a", value: counts.fresh },
      { label: "Expiring", color: "#ef4444", value: counts.expiring },
      { label: "Used", color: "#64748b", value: counts.used },
      { label: "Other", color: "#f59e0b", value: counts.other },
    ];

    // listas
    const expiringList = base
      .filter((it) => (it.status || "").toLowerCase().includes("expire"))
      .sort((a, b) => q(b.qty) - q(a.qty))
      .slice(0, 8);

    const lowStockList = base
      .filter((it) => q(it.qty) <= 0)
      .sort((a, b) => a.baseName.localeCompare(b.baseName))
      .slice(0, 8);

    return {
      totalItems,
      totalQty,
      byLocation,
      byCategory,
      buckets,
      expiringList,
      lowStockList,
      base,
    };
  }, [items, filterLoc]);

  const totalByLoc = view.byLocation.reduce((s, d) => s + d.value, 0);

  function exportInventoryCSV(): void {
    const rows: string[][] = [
      ["baseName", "qty", "unit", "location", "category", "status"],
      ...view.base.map((it) => [
        it.baseName,
        String(q(it.qty)),
        String(it.unit || ""),
        String(it.location || ""),
        String(it.category || ""),
        String(it.status || ""),
      ]),
    ];
    downloadCSV(rows, "inventory_analytics.csv");
  }

  return (
    <section className="recipes-wrap">
      {/* Header */}
      <div className="card-head">
        <div className="card-title">
          <span className="ringed">
            <PieChart className="w-4 h-4" />
          </span>
          <div>
            <h3>Analytics</h3>
            <p className="eyebrow">Overview of your kitchen health</p>
          </div>
        </div>

        <div className="tool seg-group" role="tablist" aria-label="Location filter">
          {["all", ...LOCS].map((l) => (
            <button
              key={String(l)}
              role="tab"
              aria-checked={filterLoc === l}
              onClick={() => setFilterLoc(l as FilterLoc)}
              className="seg"
              title={`Filter: ${String(l)}`}
            >
              {l === "all" ? (
                "All"
              ) : (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <MapPin className="w-3 h-3" /> {l}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="dock-right">
          <button className="sp-btn sp-btn-ghost" onClick={exportInventoryCSV} title="Export CSV">
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="analytics-grid" style={{ marginBottom: 12 }}>
        <KpiCard
          icon={<PackageCheck className="w-4 h-4" />}
          title="Items"
          value={String(view.totalItems)}
          note={filterLoc === "all" ? "in inventory" : `in ${filterLoc}`}
        />
        <KpiCard
          icon={<ShoppingBasket className="w-4 h-4" />}
          title="Total qty"
          value={Number.isInteger(view.totalQty) ? String(view.totalQty) : view.totalQty.toFixed(1)}
          note="sum of quantities"
        />
        <KpiCard
          icon={<AlertTriangle className="w-4 h-4" />}
          title="Expiring soon"
          value={String(view.expiringList.length)}
          note="status contains 'expire'"
          warn={view.expiringList.length > 0}
        />
        <KpiCard
          icon={<Timer className="w-4 h-4" />}
          title="Zero qty"
          value={String(view.lowStockList.length)}
          note="need restock"
          warn={view.lowStockList.length > 0}
        />
      </div>

      {/* Charts grid */}
      <div className="analytics-grid">
        <DonutChart
          title={filterLoc === "all" ? "Stock by location" : `Stock (${filterLoc})`}
          segments={[
            {
              label: "Pantry",
              color: "#16a34a",
              value: view.byLocation.find((d) => d.label === "Pantry")?.value || 0,
            },
            {
              label: "Fridge",
              color: "#22c55e",
              value: view.byLocation.find((d) => d.label === "Fridge")?.value || 0,
            },
            {
              label: "Freezer",
              color: "#34d399",
              value: view.byLocation.find((d) => d.label === "Freezer")?.value || 0,
            },
          ]}
          total={totalByLoc}
          centerValue={
            Number.isInteger(view.totalQty) ? String(view.totalQty) : view.totalQty.toFixed(1)
          }
          centerLabel="total qty"
        />

        <Bars title="Top categories" data={view.byCategory} unitLabel="qty" maxBars={6} />

        <MiniDonut title="Status mix" buckets={view.buckets} />

        <div className="grid" style={{ display: "grid", gap: 12 }}>
          <ListCard
            title="Expiring soon"
            icon={<AlertTriangle className="w-4 h-4" />}
            items={view.expiringList}
            emptyTitle="All safe"
            emptyNote="Nothing expiring."
          />
          <ListCard
            title="Low / Zero stock"
            icon={<ShoppingBasket className="w-4 h-4" />}
            items={view.lowStockList}
            emptyTitle="Fully stocked"
            emptyNote="No zero-qty items."
          />
        </div>
      </div>
    </section>
  );
}
