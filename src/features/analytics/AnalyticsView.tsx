import React, { useMemo } from "react";
import { BarChart3, AlertTriangle, ChefHat, MapPin, PieChart, CalendarDays } from "lucide-react";
import { useStore, selectors, normalize, Location } from "../../state/store";
import { Card, Divider, Stat, Donut, Legend, Bars, SparkArea, GoalRing } from "../../ui/kit";

/* ===== Base recipes (igual que antes) ===== */
type Recipe = {
  name: string;
  ingredients: string;
  uses: Record<string, number>;
  time: string;
  difficulty: "Easy" | "Medium" | "Hard";
  rating: number;
  tags: string[];
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
  },
  {
    name: "Chicken & Rice Bowl",
    ingredients: "Chicken, Rice, Olive Oil",
    difficulty: "Medium",
    time: "35 min",
    rating: 4.8,
    tags: ["High Protein"],
    uses: { Chicken: 250, Rice: 0.25, "Olive Oil": 10 },
  },
  {
    name: "Milk Pudding",
    ingredients: "Milk, Rice, Sugar",
    difficulty: "Easy",
    time: "25 min",
    rating: 4.2,
    tags: ["Dessert"],
    uses: { Milk: 0.3, Rice: 0.1, Sugar: 25 },
  },
];

export default function AnalyticsView() {
  const items = useStore(selectors.items);
  const history = useStore(selectors.history);
  const prefs = useStore(selectors.prefs);

  /* ===== KPIs ===== */
  const totalItems = items.length;
  const atRisk = items.filter((i) => i.status.toLowerCase().includes("expires"));
  const atRiskCount = atRisk.length;

  const invMap = useMemo(() => {
    const m = new Map<string, number>();
    items.forEach((it) => m.set(normalize(it.baseName), it.qty));
    return m;
  }, [items]);

  const cookable = useMemo(() => {
    const servings = 2;
    const can = BASE_RECIPES.filter((r) => {
      const req = Object.entries(r.uses || {});
      return req.every(([k, v]) => (invMap.get(normalize(k)) ?? 0) >= v * servings);
    }).length;
    return { can, total: BASE_RECIPES.length, pct: Math.round((can / Math.max(1, BASE_RECIPES.length)) * 100) };
  }, [invMap]);

  // macro split
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
    greens: Math.round((greens / totalMacro) * 100),
    protein: Math.round(((meat + dairy) / totalMacro) * 100),
    carbs: Math.round((carbs / totalMacro) * 100),
    fats: Math.round((fats / totalMacro) * 100),
  };

  // stock por ubicación
  const byLoc = ["Pantry", "Fridge", "Freezer"].map((loc) => ({
    label: loc[0],
    value: items.filter((i) => i.location === (loc as Location)).reduce((s, x) => s + (x.qty || 0), 0),
  }));

  // tendencia 7d y green goals
  const today = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days: number[] = [];
  for (let i = 6; i >= 0; i--) {
    const dayStart = startOfDay(new Date(today.getFullYear(), today.getMonth(), today.getDate() - i));
    const dayEnd = dayStart + 24 * 3600 * 1000;
    const count = history.filter((h) => h.ts >= dayStart && h.ts < dayEnd).length;
    days.push(count);
  }
  const recipeByName = new Map(BASE_RECIPES.map((r) => [r.name.toLowerCase(), r]));
  const greenMeals = history
    .filter((h) => h.ts > Date.now() - 7 * 86400000)
    .map((h) => recipeByName.get(h.recipe.toLowerCase()))
    .filter((r) => !!r && r!.tags.some((t) => /veg(etarian|an)?/i.test(t))).length;
  const greenGoal = prefs.goals.greenMealsPerWeek || 0;
  const greenPct = greenGoal ? Math.min(100, Math.round((greenMeals / greenGoal) * 100)) : 0;

  /* ===== UI ===== */
  return (
    <div className="analytics-grid">
      {/* HERO / TITLE */}
      <Card
        className="span-2 hero"
        title="Analytics"
        icon={<BarChart3 className="w-4 h-4" />}
        subtitle="Overview of your kitchen health"
        right={<span className="pill">Updated {new Date().toLocaleTimeString()}</span>}
      />

      {/* KPIs */}
      <Stat icon={<PieChart />} title="Items" value={`${totalItems}`} note="in inventory" />
      <Stat icon={<AlertTriangle />} title="At risk" value={`${atRiskCount}`} note="expiring soon" tone="warn" />
      <Stat icon={<ChefHat />} title="Cookable today" value={`${cookable.can}/${cookable.total}`} note={`${cookable.pct}%`} />
      <Stat icon={<CalendarDays />} title="Cooked (7d)" value={`${days.reduce((a, b) => a + b, 0)}`} note="last 7 days" />

      {/* Food groups + Stock by location */}
      <Card
        title="Food groups"
        icon={<PieChart className="w-4 h-4" />}
        right={<span className="eyebrow">share</span>}
      >
        <div className="grid-two">
          <Donut
            segments={[
              { value: macroPct.greens, label: "Vegetables", color: "var(--brand)" },
              { value: macroPct.protein, label: "Protein", color: "#0f172a" },
              { value: macroPct.carbs, label: "Carbs", color: "#64748b" },
              { value: macroPct.fats, label: "Fats", color: "#94a3b8" },
            ]}
            center={
              <div>
                <div className="center-big">{macroPct.greens}%</div>
                <div className="eyebrow">veg share</div>
              </div>
            }
          />
          <Legend
            items={[
              { label: "Vegetables", color: "var(--brand)", value: `${macroPct.greens}%` },
              { label: "Protein", color: "#0f172a", value: `${macroPct.protein}%` },
              { label: "Carbs", color: "#64748b", value: `${macroPct.carbs}%` },
              { label: "Fats", color: "#94a3b8", value: `${macroPct.fats}%` },
            ]}
          />
        </div>
      </Card>

      <Card title="Stock by location" icon={<MapPin className="w-4 h-4" />} right={<span className="eyebrow">sum qty</span>}>
        <Bars data={byLoc} />
      </Card>

      {/* Trend + Goals */}
      <Card title="Cooked per day (7d)" icon={<ChefHat className="w-4 h-4" />} right={<span className="eyebrow">trend</span>}>
        <SparkArea points={days} />
        <div className="eyebrow">Mon..Sun (today rightmost)</div>
      </Card>

      <Card title="Goals" icon={<BarChart3 className="w-4 h-4" />}>
        <div className="grid-two">
          <GoalRing pct={greenPct || 0} label="Green meals / week" />
          <div>
            <div className="goal-desc">
              Green meals / week <b>({greenMeals}/{greenGoal || 0})</b>
            </div>
            <Divider />
            <p className="eyebrow">Set your goals in Settings → Goals</p>
          </div>
        </div>
      </Card>

      {/* At risk list */}
      <Card title="Expiring soon" icon={<AlertTriangle className="w-4 h-4" />} right={<span className="eyebrow">Top {Math.min(8, atRisk.length)}</span>}>
        {atRisk.length === 0 ? (
          <p className="eyebrow">You are safe. Nothing expiring soon.</p>
        ) : (
          <ul className="risk">
            {atRisk.slice(0, 8).map((i) => (
              <li key={i.id}>
                <span className="risk-name">{i.baseName}</span>
                <span className="risk-status">{i.status}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
