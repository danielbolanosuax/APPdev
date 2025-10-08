import React, { useMemo } from "react";
import {
  BarChart3,
  AlertTriangle,
  PieChart,
  ChefHat,
  MapPin,
  CalendarDays,
} from "lucide-react";
import { useStore, selectors, normalize, InventoryItem, Location } from "../../state/store";

/* ===== Base de recetas para métricas (idéntica a Recipes) ===== */
type Recipe = {
  name: string;
  ingredients: string;
  uses: Record<string, number>;
  time: string;
  difficulty: "Easy" | "Medium" | "Hard";
  rating: number;
  tags: string[];
  steps?: string[];
  allergens?: string[];
};
const BASE_RECIPES: Recipe[] = [
  {
    name: "Tomato Pasta",
    ingredients: "Tomatoes, Pasta, Olive Oil",
    difficulty: "Easy",
    time: "20 min",
    rating: 4.5,
    tags: ["Vegetarian", "Quick"],
    uses: { Tomatoes: 2, Pasta: 1, "Olive Oil": 15 },
    steps: ["Cuece la pasta.", "Saltea tomate.", "Mezcla y sirve."],
  },
  {
    name: "Chicken & Rice Bowl",
    ingredients: "Chicken, Rice, Olive Oil",
    difficulty: "Medium",
    time: "35 min",
    rating: 4.8,
    tags: ["High Protein"],
    uses: { Chicken: 250, Rice: 0.25, "Olive Oil": 10 },
    steps: ["Dora el pollo.", "Cuece el arroz.", "Monta el plato."],
  },
  {
    name: "Milk Pudding",
    ingredients: "Milk, Rice, Sugar",
    difficulty: "Easy",
    time: "25 min",
    rating: 4.2,
    tags: ["Dessert"],
    uses: { Milk: 0.3, Rice: 0.1, Sugar: 25 },
    steps: ["Cocina arroz en leche.", "Endulza.", "Enfría."],
  },
];

/* ===== Helpers visuales ===== */
function percent(n: number, d: number) {
  const base = Math.max(1, d);
  return Math.round((n / base) * 100);
}

function Donut({
  segments, // [{value,label,color}]
  size = 140,
  centerLabel,
}: {
  segments: { value: number; label: string; color: string }[];
  size?: number;
  centerLabel?: string | React.ReactNode;
}) {
  const total = Math.max(1, segments.reduce((s, x) => s + x.value, 0));
  let acc = 0;
  const stops = segments.map((s) => {
    const from = (acc / total) * 360;
    acc += s.value;
    const to = (acc / total) * 360;
    return { from, to, color: s.color };
  });
  const gradient = stops
    .map((s) => `${s.color} ${s.from}deg ${s.to}deg`)
    .join(", ");

  return (
    <div
      className="relative"
      style={{ width: size, height: size }}
      aria-label="Donut chart"
    >
      <div
        className="rounded-full"
        style={{
          width: size,
          height: size,
          backgroundImage: `conic-gradient(${gradient})`,
        }}
      />
      <div
        className="absolute inset-0 rounded-full"
        style={{
          margin: size * 0.12,
          background: "var(--color-surface)",
          border: "1px solid rgba(0,0,0,.06)",
        }}
      />
      <div className="absolute inset-0 grid place-items-center text-center px-2">
        <div className="text-sm font-extrabold" style={{ color: "var(--brand)" }}>
          {centerLabel}
        </div>
      </div>
    </div>
  );
}

function Bars({
  data, // [{label, value}]
  unit = "",
}: {
  data: { label: string; value: number }[];
  unit?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="grid grid-cols-3 gap-3 items-end">
      {data.map((d) => (
        <div key={d.label} className="text-center">
          <div
            className="mx-auto radius-md shadow-soft"
            style={{
              width: 28,
              height: Math.max(8, Math.round((d.value / max) * 120)),
              background:
                "linear-gradient(180deg, var(--brand) 0%, color-mix(in oklab, var(--brand) 55%, #0e1320) 100%)",
            }}
            aria-label={`${d.label} ${d.value}${unit}`}
            title={`${d.label}: ${d.value}${unit}`}
          />
          <div className="mt-1 text-[12px] font-semibold">{d.label}</div>
          <div className="text-[12px] text-muted">{d.value}{unit}</div>
        </div>
      ))}
    </div>
  );
}

function Sparkline({
  points, // array de valores (0..n)
  width = 220,
  height = 42,
}: {
  points: number[];
  width?: number;
  height?: number;
}) {
  const max = Math.max(1, ...points);
  const step = width / Math.max(1, points.length - 1);
  const path = points
    .map((v, i) => `${i === 0 ? "M" : "L"} ${i * step},${height - (v / max) * (height - 2) - 1}`)
    .join(" ");
  return (
    <svg width={width} height={height} role="img" aria-label="Weekly trend">
      <path d={path} fill="none" stroke="var(--brand)" strokeWidth="2.5" />
    </svg>
  );
}

/* ===== Analytics View ===== */
export default function AnalyticsView() {
  const items = useStore(selectors.items);
  const history = useStore(selectors.history);
  const prefs = useStore(selectors.prefs);

  /* ---- KPIs ---- */
  const totalItems = items.length;
  const atRisk = items.filter((i) => i.status.toLowerCase().includes("expires"));
  const atRiskCount = atRisk.length;

  const invMap = useMemo(() => {
    const m = new Map<string, number>();
    items.forEach((it) => m.set(normalize(it.baseName), it.qty));
    return m;
  }, [items]);

  // cookable today (2 servings)
  const cookable = useMemo(() => {
    const servings = 2;
    const can = BASE_RECIPES.filter((r) => {
      const req = Object.entries(r.uses || {});
      return req.every(([k, v]) => (invMap.get(normalize(k)) ?? 0) >= v * servings);
    }).length;
    return { can, total: BASE_RECIPES.length, pct: percent(can, BASE_RECIPES.length) };
  }, [invMap]);

  // macro split (verdes/prote/Carbs/fats) como antes
  const catCounts = items.reduce((acc: Record<string, number>, it) => {
    acc[it.category] = (acc[it.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const greens = catCounts["Vegetables"] || 0;
  const meat = catCounts["Meat"] || 0;
  const dairy = catCounts["Dairy"] || 0;
  const carbs = catCounts["Dry Goods"] || 0;
  const fats = (catCounts["Condiments"] || 0) + (dairy > 0 ? 1 : 0);
  const totalMacro = Math.max(1, greens + meat + dairy + carbs + fats);
  const macroPct = {
    greens: percent(greens, totalMacro),
    protein: percent(meat + dairy, totalMacro),
    carbs: percent(carbs, totalMacro),
    fats: percent(fats, totalMacro),
  };

  // stock por ubicación (sum qty)
  const byLoc: { label: string; value: number }[] = ["Pantry", "Fridge", "Freezer"].map((loc) => ({
    label: loc[0], // P/F/F
    value: items.filter((i) => i.location === (loc as Location)).reduce((s, x) => s + (x.qty || 0), 0),
  }));

  // tendencia semanal de cocinados (historia últimos 7 días)
  const today = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days: number[] = [];
  for (let i = 6; i >= 0; i--) {
    const dayStart = startOfDay(new Date(today.getFullYear(), today.getMonth(), today.getDate() - i));
    const dayEnd = dayStart + 24 * 3600 * 1000;
    const count = history.filter((h) => h.ts >= dayStart && h.ts < dayEnd).length;
    days.push(count);
  }
  const weeklyCooked = days.reduce((a, b) => a + b, 0);

  // progreso objetivos (greenMealsPerWeek usando tags de receta si existen)
  const recipeByName = new Map(BASE_RECIPES.map((r) => [r.name.toLowerCase(), r]));
  const greenMeals = history
    .filter((h) => h.ts > Date.now() - 7 * 86400000)
    .map((h) => recipeByName.get(h.recipe.toLowerCase()))
    .filter((r) => !!r && r!.tags.some((t) => /vegetarian|vegan|green/i.test(t))).length;
  const greenGoal = prefs.goals.greenMealsPerWeek || 0;
  const greenPct = greenGoal ? Math.min(100, Math.round((greenMeals / greenGoal) * 100)) : 0;

  return (
    <section className="sp-card p-4 sp-card-lg">
      <h2 className="text-lg font-extrabold mb-2 flex items-center gap-2">
        <BarChart3 className="w-5 h-5" style={{ color: "var(--brand)" }} /> Analytics
      </h2>

      {/* KPIs */}
      <div className="grid sm:grid-cols-4 gap-3">
        <KPI title="Items" value={`${totalItems}`} subtitle="in inventory" />
        <KPI title="At risk" value={`${atRiskCount}`} subtitle="expiring soon" tone="warn" icon={<AlertTriangle className="w-4 h-4" />} />
        <KPI title="Cookable today" value={`${cookable.can}/${cookable.total}`} subtitle={`${cookable.pct}%`} icon={<ChefHat className="w-4 h-4" />} />
        <KPI title="Cooked (7d)" value={`${weeklyCooked}`} subtitle="last 7 days" icon={<CalendarDays className="w-4 h-4" />} />
      </div>

      {/* Macro + Ubicación */}
      <div className="grid md:grid-cols-2 gap-3 mt-4">
        <div className="rounded-2xl border-subtle surface p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="font-semibold flex items-center gap-2"><PieChart className="w-4 h-4" />Food groups</div>
            <div className="text-xs text-muted">share</div>
          </div>
          <div className="flex items-center gap-4">
            <Donut
              segments={[
                { value: macroPct.greens, label: "Veg", color: "var(--brand)" },
                { value: macroPct.protein, label: "Protein", color: "#0e1320" },
                { value: macroPct.carbs, label: "Carbs", color: "#64748b" },
                { value: macroPct.fats, label: "Fats", color: "#94a3b8" },
              ]}
              centerLabel={<div><div className="text-xs text-muted">Balanced</div><div>{macroPct.greens}% veg</div></div>}
            />
            <ul className="text-sm space-y-1">
              <li><span className="badge" style={{ background: "color-mix(in oklab, var(--brand) 22%, transparent)" }}>Vegetables</span> {macroPct.greens}%</li>
              <li><span className="badge">Protein</span> {macroPct.protein}%</li>
              <li><span className="badge">Carbs</span> {macroPct.carbs}%</li>
              <li><span className="badge">Fats</span> {macroPct.fats}%</li>
            </ul>
          </div>
        </div>

        <div className="rounded-2xl border-subtle surface p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="font-semibold flex items-center gap-2"><MapPin className="w-4 h-4" />Stock by location</div>
            <div className="text-xs text-muted">sum qty</div>
          </div>
          <Bars data={byLoc} unit="" />
        </div>
      </div>

      {/* Tendencias & Objetivos */}
      <div className="grid md:grid-cols-2 gap-3 mt-4">
        <div className="rounded-2xl border-subtle surface p-3">
          <div className="flex items-center justify-between mb-1">
            <div className="font-semibold flex items-center gap-2"><ChefHat className="w-4 h-4" />Cooked per day (7d)</div>
            <div className="text-xs text-muted">trend</div>
          </div>
          <Sparkline points={days} />
          <div className="mt-1 text-xs text-muted">Mon..Sun trend (today rightmost)</div>
        </div>

        <div className="rounded-2xl border-subtle surface p-3">
          <div className="font-semibold mb-2">Goals</div>
          <GoalBar label={`Green meals / week (${greenMeals}/${greenGoal})`} pct={greenPct} />
          <div className="text-xs text-muted mt-1">Set goals in Settings → Goals</div>
        </div>
      </div>

      {/* At risk list */}
      <div className="mt-4 rounded-2xl border-subtle surface p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="font-semibold flex items-center gap-2"><AlertTriangle className="w-4 h-4" />Expiring soon</div>
          <div className="text-xs text-muted">Top {Math.min(8, atRisk.length)}</div>
        </div>
        {atRisk.length === 0 ? (
          <p className="text-xs text-muted">Sin riesgo ahora mismo.</p>
        ) : (
          <ul className="text-sm">
            {atRisk.slice(0, 8).map((i) => (
              <li key={i.id} className="flex justify-between py-1">
                <span>{i.baseName}</span>
                <span style={{ color: "#ef4444" }} className="text-xs">{i.status}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

/* ===== Small UI ===== */
function KPI({
  title,
  value,
  subtitle,
  icon,
  tone,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon?: React.ReactNode;
  tone?: "warn" | "ok" | "neutral";
}) {
  return (
    <div className="kpi">
      <div className="flex items-center justify-between">
        <p className="kpi-title">{title}</p>
        {icon && <div className="text-muted">{icon}</div>}
      </div>
      <p className="kpi-value">{value}</p>
      {subtitle && (
        <p className="text-xs" style={{ color: tone === "warn" ? "#ef4444" : "var(--color-muted)" }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

function GoalBar({ label, pct }: { label: string; pct: number }) {
  return (
    <div className="mb-2">
      <div className="text-sm mb-1">{label}</div>
      <div className="h-3 w-full surface-3 radius-md border-subtle relative overflow-hidden">
        <div
          className="h-full"
          style={{
            width: `${pct}%`,
            background:
              "linear-gradient(90deg, var(--brand) 0%, color-mix(in oklab, var(--brand) 50%, #0e1320) 100%)",
          }}
        />
      </div>
      <div className="text-xs text-muted mt-1">{pct}%</div>
    </div>
  );
}
