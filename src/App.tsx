import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ListChecks,
  ShoppingCart,
  ChefHat,
  Minus,
  Plus,
  CheckCircle2,
  BarChart,
  Filter,
  Brain,
  Settings,
  Trash2,
  Heart,
  HeartOff,
  Search,
} from "lucide-react";

import { useStore, selectors, normalize } from "./state/store";

/** ===================== Tipos locales para UI ===================== */
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

/** ===================== TOASTS ===================== */
function useToasts() {
  const [toasts, setToasts] = useState<{ id: number; msg: string }[]>([]);
  const add = (msg: string) => {
    const id = Date.now();
    setToasts((t) => [...t, { id, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2200);
  };
  const View = () => (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 space-y-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="px-3 py-2 rounded-lg bg-black/80 text-white text-sm shadow-lg"
          role="status"
        >
          {t.msg}
        </div>
      ))}
    </div>
  );
  return { add, View };
}

/** ===================== COMPONENT ===================== */
export default function App() {
  const toast = useToasts();
  const Toasts = toast.View;

  // ======= STORE (Zustand) =======
  const items = useStore(selectors.items);
  const shoppingList = useStore(selectors.shopping);
  const history = useStore(selectors.history);
  const prefs = useStore(selectors.prefs);

  const setItems = useStore((s) => s.setItems);
  const addItem = useStore((s) => s.addItem);
  const updateItem = useStore((s) => s.updateItem);
  const removeItem = useStore((s) => s.removeItem);

  const addRow = useStore((s) => s.addRow);
  const updateQtyRow = useStore((s) => s.updateQty);
  const togglePurchasedRow = useStore((s) => s.togglePurchased);
  const changeLocRow = useStore((s) => s.changeLoc);
  const removeRow = useStore((s) => s.removeRow);
  const finalizePurchase = useStore((s) => s.finalizePurchase);

  const addCook = useStore((s) => s.addCook);

  const setTheme = useStore((s) => s.setTheme);
  const setFilter = useStore((s) => s.setFilter);
  const setSort = useStore((s) => s.setSort);
  const toggleFavorite = useStore((s) => s.toggleFavorite);
  const setGoals = useStore((s) => s.setGoals);
  const favorites = useStore((s) => new Set(s.prefs.favorites));

  // ======= UI Tabs y búsqueda global =======
  const [activeTab, setActiveTab] = useState<
    "inventory" | "recipes" | "shopping" | "analytics" | "settings"
  >("inventory");
  const searchRef = useRef<HTMLInputElement>(null);
  const [globalSearch, setGlobalSearch] = useState("");
  const [recipeQuery, setRecipeQuery] = useState("");

  useEffect(() => {
    const q = normalize(globalSearch);
    if (activeTab === "inventory") {
      setQuery(q);
    }
    if (activeTab === "recipes") {
      setRecipeQuery(q);
    }
  }, [globalSearch, activeTab]);

  // ======= INVENTORY =======
  const [query, setQuery] = useState("");

  const filteredItems = useMemo(() => {
    let arr = items.filter((i) => {
      const byTab =
        prefs.filter === "all"
          ? true
          : prefs.filter === "expiring"
          ? i.status.toLowerCase().includes("expires")
          : i.location.toLowerCase() === prefs.filter;
      const byQuery =
        !query.trim() ||
        normalize(i.name).includes(normalize(query)) ||
        normalize(i.baseName).includes(normalize(query)) ||
        normalize(i.category).includes(normalize(query));
      return byTab && byQuery;
    });

    arr = [...arr].sort((a, b) => {
      if (prefs.sort === "az") return a.baseName.localeCompare(b.baseName);
      if (prefs.sort === "qty") return (b.qty || 0) - (a.qty || 0);
      if (prefs.sort === "status") return a.status.localeCompare(b.status);
      return 0;
    });
    return arr;
  }, [items, prefs.filter, query, prefs.sort]);

  // ======= RECIPES (scoring con inventario + favoritos) =======
  const baseRecipes: Recipe[] = [
    {
      name: "Tomato Pasta",
      ingredients: "Tomatoes, Pasta, Olive Oil",
      difficulty: "Easy",
      time: "20 min",
      rating: 4.5,
      tags: ["Vegetarian", "Quick"],
      uses: { Tomatoes: 2, Pasta: 1, "Olive Oil": 15 },
      steps: ["Cuece la pasta.", "Saltea tomate.", "Mezcla y sirve."],
      allergens: [],
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
      allergens: [],
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
      allergens: ["Dairy"],
    },
  ];

  const invMap = useMemo(() => {
    const m = new Map<string, number>();
    items.forEach((it) => m.set(normalize(it.baseName), it.qty));
    return m;
  }, [items]);

  const parseMins = (s: string) => {
    const m = /(\d+)\s*min/i.exec(s || "");
    return m ? parseInt(m[1], 10) : 60;
  };

  const [onlyCookable, setOnlyCookable] = useState(false);

  const scoredRecipes = useMemo(() => {
    const q = normalize(recipeQuery);
    let arr = baseRecipes.map((r) => {
      const req = Object.entries(r.uses || {});
      const haveCount = req.filter(
        ([k, v]) => (invMap.get(normalize(k)) ?? 0) >= v
      ).length;
      const scoreBase = (haveCount / Math.max(1, req.length)) * 100;
      const timeBoost = parseMins(r.time) <= 20 ? 8 : 0;
      const favBoost = favorites.has(r.name) ? 10 : 0;
      return {
        r,
        haveCount,
        missingCount: req.length - haveCount,
        score: Math.round(scoreBase + timeBoost + favBoost),
      };
    });

    if (onlyCookable) arr = arr.filter((x) => x.missingCount === 0);
    if (q) {
      arr = arr.filter(
        (x) =>
          normalize(x.r.name).includes(q) ||
          x.r.tags.some((t) => normalize(t).includes(q)) ||
          normalize(x.r.ingredients).includes(q)
      );
    }
    return arr.sort((a, b) => b.score - a.score);
  }, [baseRecipes, invMap, favorites, onlyCookable, recipeQuery]);

  // ======= SHOPPING =======
  const addMissingToShopping = (missingNames: string[]) => {
    if (!missingNames?.length) return;
    missingNames.forEach((m) =>
      addRow({ name: m, qty: 1, unit: "units", location: "Pantry", purchased: false })
    );
    toast.add("Missing items added");
  };

  const [newItem, setNewItem] = useState("");
  const [newItemLoc, setNewItemLoc] = useState<"Pantry" | "Fridge" | "Freezer">("Pantry");
  const [newItemQty, setNewItemQty] = useState(1);
  const [newItemUnit, setNewItemUnit] = useState("units");

  const addNewItemToList = () => {
    if (!newItem.trim() || newItemQty <= 0) return;
    addRow({
      name: newItem.trim(),
      qty: newItemQty,
      unit: newItemUnit,
      location: newItemLoc,
      purchased: false,
    });
    setNewItem("");
    setNewItemQty(1);
    setNewItemUnit("units");
    setNewItemLoc("Pantry");
    toast.add("Added to shopping list");
  };

  // ======= COCINAR =======
  const cookNow = (r: Recipe, servings = 1) => {
    const next = items.map((it) => ({ ...it }));
    Object.entries(r.uses || {}).forEach(([base, amount]) => {
      const idx = next.findIndex(
        (i) => normalize(i.baseName) === normalize(base)
      );
      if (idx >= 0) {
        const scaled = (amount as number) * servings;
        next[idx].qty = Math.max(0, (next[idx].qty || 0) - scaled);
        next[idx].name = `${next[idx].baseName} (${next[idx].qty} ${next[idx].unit})`;
        next[idx].status = next[idx].qty === 0 ? "Used" : next[idx].status;
      }
    });
    setItems(next);
    addCook(r.name);
    toast.add("Cooked!");
  };

  // ======= ANALYTICS =======
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

  const atRiskItems = items.filter((i) =>
    i.status.toLowerCase().includes("expires")
  );

  const canCookToday = useMemo(() => {
    const servings = 2;
    const can = baseRecipes.filter((r) => {
      const req = Object.entries(r.uses || {});
      return req.every(
        ([k, v]) => (invMap.get(normalize(k)) ?? 0) >= v * servings
      );
    }).length;
    return {
      can,
      total: baseRecipes.length,
      pct: Math.round((can / Math.max(1, baseRecipes.length)) * 100),
    };
  }, [invMap]);

  /** ===================== UI ===================== */
  return (
    <div className="bg-gray-50 min-h-screen flex flex-col">
      {/* TOPBAR */}
      <header className="sticky top-0 z-40 bg-gradient-to-r from-green-700 to-green-500 text-white shadow-md">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Brain className="w-6 h-6" />
          <h1 className="text-lg font-bold tracking-wide">SmartPantry AI</h1>
          <div className="flex-1" />
          <div className="relative w-[48%] min-w-[240px]">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-white/80" />
            <input
              ref={searchRef}
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              placeholder="Search inventory & recipes…"
              className="w-full pl-9 pr-3 py-2 rounded-lg text-sm text-black"
              aria-label="Global search"
            />
          </div>
          <button
            onClick={() => setActiveTab("settings")}
            className="ml-2 p-2 rounded-lg bg-white/15 hover:bg-white/25"
            aria-label="Settings"
            title="Settings"
          >
            <Settings className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* TABS */}
        <nav className="bg-white/10 backdrop-blur-sm">
          <div className="max-w-3xl mx-auto grid grid-cols-4">
            {[
              { k: "inventory", icon: <ListChecks className="w-5 h-5" />, label: "Inventory" },
              { k: "recipes", icon: <ChefHat className="w-5 h-5" />, label: "Recipes" },
              { k: "shopping", icon: <ShoppingCart className="w-5 h-5" />, label: "Shopping" },
              { k: "analytics", icon: <BarChart className="w-5 h-5" />, label: "Analytics" },
            ].map((t) => (
              <button
                key={t.k}
                onClick={() => setActiveTab(t.k as any)}
                className={`py-2 flex items-center justify-center gap-2 text-sm ${
                  activeTab === (t.k as any) ? "bg-white/20 font-semibold" : "hover:bg-white/10"
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>
        </nav>
      </header>

      {/* CONTENT */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto p-4 space-y-6">
          {/* INVENTORY */}
          {activeTab === "inventory" && (
            <section className="sp-card p-4 sp-card-lg">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <Filter className="w-4 h-4 text-green-700" />
                <div className="flex gap-2">
                  {["all", "fridge", "freezer", "pantry", "expiring"].map((f) => (
                    <button
                      key={f}
                      onClick={() => useStore.getState().setFilter(f as any)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        prefs.filter === f ? "bg-green-600 text-white" : "bg-gray-200 text-gray-700"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
                <div className="flex-1" />
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-600">Sort</span>
                  <button
                    className={`px-2 py-1 rounded-md text-xs border ${prefs.sort === "az" ? "bg-white" : "bg-gray-100"}`}
                    onClick={() => setSort("az")}
                  >
                    A-Z
                  </button>
                  <button
                    className={`px-2 py-1 rounded-md text-xs border ${prefs.sort === "qty" ? "bg-white" : "bg-gray-100"}`}
                    onClick={() => setSort("qty")}
                  >
                    Qty
                  </button>
                  <button
                    className={`px-2 py-1 rounded-md text-xs border ${prefs.sort === "status" ? "bg-white" : "bg-gray-100"}`}
                    onClick={() => setSort("status")}
                  >
                    Status
                  </button>
                </div>
              </div>

              {filteredItems.length === 0 ? (
                <EmptyState
                  title="No items found"
                  subtitle="Prueba a limpiar filtros o añade productos desde Shopping."
                />
              ) : (
                <ul className="space-y-2">
                  {filteredItems.map((item) => (
                    <li
                      key={item.id}
                      className="flex justify-between items-center bg-white p-3 rounded-lg shadow-sm"
                    >
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-xs text-gray-500">
                          {item.location} · {item.category}
                        </p>
                      </div>
                      <span className={`text-xs ${item.statusColor}`}>{item.status}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {/* RECIPES */}
          {activeTab === "recipes" && (
            <section className="sp-card p-4 sp-card-lg">
              <div className="flex items-center gap-2 mb-3">
                <ChefHat className="w-5 h-5 text-green-700" />
                <h2 className="text-lg font-bold">Recipes (Smart)</h2>
                <div className="flex-1" />
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={onlyCookable}
                    onChange={(e) => setOnlyCookable(e.target.checked)}
                  />
                  Cookable now
                </label>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                {scoredRecipes.map(({ r, score, missingCount }) => {
                  const have = Object.keys(r.uses).filter(
                    (b) => (invMap.get(normalize(b)) ?? 0) >= (r.uses[b] || 0)
                  );
                  const missing = Object.keys(r.uses).filter((b) => !have.includes(b));
                  const fav = favorites.has(r.name);

                  return (
                    <article key={r.name} className="bg-white rounded-xl p-3 border shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-semibold">{r.name}</h3>
                          <p className="text-xs text-gray-500">
                            {r.time} · {r.difficulty} · Score {score}
                          </p>
                        </div>
                        <button
                          onClick={() => toggleFavorite(r.name)}
                          className="p-2 rounded-lg border"
                          title={fav ? "Unfavorite" : "Favorite"}
                        >
                          {fav ? <HeartOff className="w-4 h-4" /> : <Heart className="w-4 h-4" />}
                        </button>
                      </div>

                      <p className="text-[12px] text-gray-700 mt-1">
                        <span className="font-semibold">Ingredients:</span> {r.ingredients}
                      </p>
                      <div className="flex gap-2 mt-1 flex-wrap">
                        {r.tags.map((t) => (
                          <span
                            key={t}
                            className="bg-gray-100 border text-gray-700 text-[11px] px-2 py-0.5 rounded-full"
                          >
                            {t}
                          </span>
                        ))}
                      </div>

                      <div className="text-[12px] text-gray-700 mt-2 space-y-1">
                        <p>
                          <span className="font-semibold">Have:</span>{" "}
                          {have.length ? have.join(", ") : "—"}
                        </p>
                        <p>
                          <span className="font-semibold">Missing:</span>{" "}
                          {missing.length ? missing.join(", ") : "—"}
                        </p>
                      </div>

                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => cookNow(r)}
                          className="px-3 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-semibold"
                        >
                          Cook now
                        </button>
                        {missingCount > 0 && (
                          <button
                            onClick={() => addMissingToShopping(missing)}
                            className="px-3 py-2 rounded-lg border bg-white text-xs font-semibold"
                          >
                            Add Missing
                          </button>
                        )}
                      </div>

                      {!!r.steps?.length && (
                        <details className="mt-2">
                          <summary className="text-xs text-gray-600 cursor-pointer">Steps</summary>
                          <ol className="list-decimal list-inside text-xs text-gray-700 mt-1 space-y-1">
                            {r.steps.map((s, i) => (
                              <li key={i}>{s}</li>
                            ))}
                          </ol>
                        </details>
                      )}
                    </article>
                  );
                })}
              </div>

              {scoredRecipes.length === 0 && (
                <EmptyState
                  title="No recipes match"
                  subtitle="Prueba a desactivar ‘Cookable now’ o ajusta la búsqueda."
                />
              )}
            </section>
          )}

          {/* SHOPPING */}
          {activeTab === "shopping" && (
            <section className="sp-card p-4 sp-card-lg">
              <div className="flex items-center gap-2 mb-3">
                <ShoppingCart className="w-5 h-5 text-green-700" />
                <h2 className="text-lg font-bold">Shopping List</h2>
              </div>

              {/* Add row */}
              <div className="flex gap-2 mb-3">
                <input
                  value={newItem}
                  onChange={(e) => setNewItem(e.target.value)}
                  placeholder="Add item"
                  className="flex-1 border rounded-lg px-3 py-2 text-sm"
                />
                <input
                  type="number"
                  min={1}
                  value={newItemQty}
                  onChange={(e) => setNewItemQty(parseInt(e.target.value || "1"))}
                  className="w-20 border rounded-lg px-2 py-2 text-sm"
                />
                <select
                  value={newItemUnit}
                  onChange={(e) => setNewItemUnit(e.target.value)}
                  className="border rounded-lg px-2 py-2 text-sm"
                >
                  <option value="units">units</option>
                  <option value="kg">kg</option>
                  <option value="g">g</option>
                  <option value="L">L</option>
                  <option value="ml">ml</option>
                  <option value="packs">packs</option>
                </select>
                <select
                  value={newItemLoc}
                  onChange={(e) => setNewItemLoc(e.target.value as any)}
                  className="border rounded-lg px-2 py-2 text-sm"
                >
                  <option>Pantry</option>
                  <option>Fridge</option>
                  <option>Freezer</option>
                </select>
                <button
                  onClick={addNewItemToList}
                  className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm font-semibold"
                >
                  Add
                </button>
              </div>

              {/* Grouped lists */}
              <div className="space-y-4">
                {["Pantry", "Fridge", "Freezer"].map((loc) => {
                  const arr = shoppingList.filter((r) => r.location === (loc as any));
                  if (arr.length === 0) return null;
                  const total = arr.reduce((s, r) => s + r.qty, 0);
                  return (
                    <div key={loc} className="bg-white rounded-xl border shadow-sm">
                      <div className="px-3 py-2 flex items-center justify-between">
                        <div className="font-semibold">{loc}</div>
                        <div className="text-xs text-gray-600">
                          Items: {arr.length} · Qty: {total}
                        </div>
                      </div>
                      <ul className="divide-y">
                        {arr.map((it) => (
                          <li key={it.id} className="p-3 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => updateQtyRow(it.id, -1)}
                                className="p-1 rounded-md bg-white border"
                              >
                                <Minus className="w-4 h-4" />
                              </button>
                              <span className="min-w-[48px] text-center font-semibold">{it.qty}</span>
                              <button
                                onClick={() => updateQtyRow(it.id, +1)}
                                className="p-1 rounded-md bg-white border"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                              <span className="ml-2 font-medium">{it.name}</span>
                              <span className="text-xs text-gray-500">({it.unit})</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <select
                                value={it.location}
                                onChange={(e) => changeLocRow(it.id, e.target.value as any)}
                                className="border rounded-lg px-2 py-1 text-xs"
                              >
                                <option>Pantry</option>
                                <option>Fridge</option>
                                <option>Freezer</option>
                              </select>
                              <label className="flex items-center gap-1 text-xs">
                                <input
                                  type="checkbox"
                                  checked={it.purchased}
                                  onChange={() => togglePurchasedRow(it.id)}
                                />
                                purchased
                              </label>
                              <button
                                onClick={() => removeRow(it.id)}
                                className="p-1 rounded-md bg-white border text-red-600 hover:bg-red-50"
                                aria-label="Remove item"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={() => {
                  finalizePurchase();
                  toast.add("Inventory updated");
                }}
                className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-5 h-5" /> Finalize Purchase & Update Inventory
              </button>
            </section>
          )}

          {/* ANALYTICS */}
          {activeTab === "analytics" && (
            <section className="sp-card p-4 sp-card-lg">
              <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
                <BarChart className="w-5 h-5 text-green-700" /> Analytics Dashboard
              </h2>
              <div className="grid sm:grid-cols-2 gap-3">
                <KPI
                  title="Cookable Today"
                  value={`${canCookToday.can}/${canCookToday.total} (${canCookToday.pct}%)`}
                />
                <KPI title="Veg share" value={`${macroPct.greens}%`} />
                <KPI title="Protein share" value={`${macroPct.protein}%`} />
                <KPI title="Carbs share" value={`${macroPct.carbs}%`} />
              </div>

              <div className="mt-4 bg-white rounded-xl border shadow-sm p-3">
                <h3 className="font-semibold mb-1">At risk</h3>
                {atRiskItems.length === 0 ? (
                  <p className="text-xs text-gray-600">Sin riesgo ahora mismo.</p>
                ) : (
                  <ul className="text-sm list-disc pl-6">
                    {atRiskItems.slice(0, 6).map((i) => (
                      <li key={i.id} className="flex justify-between">
                        <span>{i.baseName}</span>
                        <span className="text-xs text-red-600">{i.status}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          )}

          {/* SETTINGS */}
          {activeTab === "settings" && (
            <section className="sp-card p-4 sp-card-lg">
              <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
                <Settings className="w-5 h-5 text-green-700" /> Settings
              </h2>
              <div className="space-y-3 text-sm">
                <div className="bg-white rounded-xl border shadow-sm p-3">
                  <p className="font-semibold">Appearance</p>
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      onClick={() => {
                        document.documentElement.classList.remove("dark");
                        setTheme("light");
                        toast.add("Theme: Light");
                      }}
                      className="px-3 py-2 border rounded-lg"
                    >
                      Light
                    </button>
                    <button
                      onClick={() => {
                        document.documentElement.classList.add("dark");
                        setTheme("dark");
                        toast.add("Theme: Dark");
                      }}
                      className="px-3 py-2 border rounded-lg"
                    >
                      Dark
                    </button>
                    <button
                      onClick={() => {
                        const prefersDark =
                          window.matchMedia &&
                          window.matchMedia("(prefers-color-scheme: dark)").matches;
                        document.documentElement.classList.toggle("dark", prefersDark);
                        setTheme("system");
                        toast.add("Theme: System");
                      }}
                      className="px-3 py-2 border rounded-lg"
                    >
                      System
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-xl border shadow-sm p-3">
                  <p className="font-semibold">Goals</p>
                  <div className="mt-2 flex flex-wrap gap-2 items-center">
                    <label className="text-xs">
                      Waste ≤
                      <input
                        type="number"
                        className="ml-1 border rounded px-2 py-1 w-16"
                        value={prefs.goals.wastePct}
                        onChange={(e) => setGoals({ wastePct: Number(e.target.value || 0) })}
                      />
                      %
                    </label>
                    <label className="text-xs">
                      Savings ≥ €
                      <input
                        type="number"
                        className="ml-1 border rounded px-2 py-1 w-20"
                        value={prefs.goals.savings}
                        onChange={(e) => setGoals({ savings: Number(e.target.value || 0) })}
                      />
                    </label>
                    <label className="text-xs">
                      Green meals / week ≥
                      <input
                        type="number"
                        className="ml-1 border rounded px-2 py-1 w-16"
                        value={prefs.goals.greenMealsPerWeek}
                        onChange={(e) =>
                          setGoals({ greenMealsPerWeek: Number(e.target.value || 0) })
                        }
                      />
                    </label>
                  </div>
                </div>

                <div className="bg-white rounded-xl border shadow-sm p-3">
                  <p className="font-semibold">Data</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        localStorage.clear();
                        toast.add("Local data cleared");
                        window.location.reload();
                      }}
                      className="px-3 py-2 border rounded-lg text-red-600"
                    >
                      Clear localStorage
                    </button>
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>
      </main>

      {/* TOASTS */}
      <Toasts />
    </div>
  );
}

/** ===================== SMALL UI PIECES ===================== */
function KPI({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-green-50 border border-green-200 rounded-xl p-3">
      <p className="text-gray-500">{title}</p>
      <p className="text-xl font-bold text-green-700">{value}</p>
    </div>
  );
}

function EmptyState({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="text-center text-sm text-gray-600 py-8">
      <p className="font-semibold">{title}</p>
      {subtitle && <p className="text-xs mt-1">{subtitle}</p>}
    </div>
  );
}
