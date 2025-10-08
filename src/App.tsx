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
import { motion, AnimatePresence } from "framer-motion";
import { useStore, selectors, normalize } from "./state/store";

/** ===================== Tipos para UI ===================== */
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

/** ===================== Toasts ===================== */
function useToasts() {
  const [toasts, setToasts] = useState<{ id: number; msg: string }[]>([]);
  const add = (msg: string) => {
    const id = Date.now();
    setToasts((t) => [...t, { id, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2200);
  };
  const View = () => (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 space-y-2">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 16, scale: .98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10 }}
            className="px-4 py-2 rounded-xl surface border-subtle text-sm shadow-elev"
            role="status"
          >
            {t.msg}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
  return { add, View };
}

/** ===================== App ===================== */
export default function App() {
  const toast = useToasts();
  const Toasts = toast.View;

  // ======= STORE =======
  const items = useStore(selectors.items);
  const shoppingList = useStore(selectors.shopping);
  const prefs = useStore(selectors.prefs);

  const setItems = useStore((s) => s.setItems);
  const addRow = useStore((s) => s.addRow);
  const updateQtyRow = useStore((s) => s.updateQty);
  const togglePurchasedRow = useStore((s) => s.togglePurchased);
  const changeLocRow = useStore((s) => s.changeLoc);
  const removeRow = useStore((s) => s.removeRow);
  const finalizePurchase = useStore((s) => s.finalizePurchase);
  const addCook = useStore((s) => s.addCook);
  const setTheme = useStore((s) => s.setTheme);
  const setSort = useStore((s) => s.setSort);
  const toggleFavorite = useStore((s) => s.toggleFavorite);
  const setGoals = useStore((s) => s.setGoals);
  const favorites = useStore((s) => new Set(s.prefs.favorites));

  // ======= Tabs + búsqueda global =======
  const [activeTab, setActiveTab] = useState<"inventory" | "recipes" | "shopping" | "analytics" | "settings">("inventory");
  const searchRef = useRef<HTMLInputElement>(null);
  const [globalSearch, setGlobalSearch] = useState("");
  const [recipeQuery, setRecipeQuery] = useState("");

  useEffect(() => {
    const q = normalize(globalSearch);
    if (activeTab === "inventory") setQuery(q);
    if (activeTab === "recipes") setRecipeQuery(q);
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

  // ======= RECIPES =======
  const baseRecipes: Recipe[] = [
    {
      name: "Tomato Pasta",
      ingredients: "Tomatoes, Pasta, Olive Oil",
      difficulty: "Easy",
      time: "20 min",
      rating: 4.5,
      tags: ["Vegetarian", "Quick"],
      uses: { Tomatoes: 2, Pasta: 1, "Olive Oil": 15 },
      steps: ["Cuece la pasta.", "Saltea tomate.", "Mezcla y sirve."]
    },
    {
      name: "Chicken & Rice Bowl",
      ingredients: "Chicken, Rice, Olive Oil",
      difficulty: "Medium",
      time: "35 min",
      rating: 4.8,
      tags: ["High Protein"],
      uses: { Chicken: 250, Rice: 0.25, "Olive Oil": 10 },
      steps: ["Dora el pollo.", "Cuece el arroz.", "Monta el plato."]
    },
    {
      name: "Milk Pudding",
      ingredients: "Milk, Rice, Sugar",
      difficulty: "Easy",
      time: "25 min",
      rating: 4.2,
      tags: ["Dessert"],
      uses: { Milk: 0.3, Rice: 0.1, Sugar: 25 },
      steps: ["Cocina arroz en leche.", "Endulza.", "Enfría."]
    }
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

  const favoritesSet = favorites;
  const scoredRecipes = useMemo(() => {
    const q = normalize(recipeQuery);
    let arr = baseRecipes.map((r) => {
      const req = Object.entries(r.uses || {});
      const haveCount = req.filter(
        ([k, v]) => (invMap.get(normalize(k)) ?? 0) >= v
      ).length;
      const scoreBase = (haveCount / Math.max(1, req.length)) * 100;
      const timeBoost = parseMins(r.time) <= 20 ? 8 : 0;
      const favBoost = favoritesSet.has(r.name) ? 10 : 0;
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
  }, [baseRecipes, invMap, favoritesSet, onlyCookable, recipeQuery]);

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

  // ======= Analytics “mini” =======
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

  /** ===================== UI ===================== */
  return (
    <div className="min-h-screen flex flex-col">
      {/* TOPBAR */}
      <header className="sticky top-0 z-40">
        <div className="mx-auto max-w-5xl px-4 py-3 app-topbar">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-xl" style={{ background: "color-mix(in oklab, var(--brand) 22%, transparent)" }} />
              <h1 className="text-lg font-extrabold tracking-wide">SmartPantry AI</h1>
            </div>
            <div className="flex-1" />
            <div className="relative w-[46%] min-w-[240px]">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted" />
              <input
                ref={searchRef}
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                placeholder="Buscar inventario y recetas…"
                className="search-input"
                aria-label="Global search"
              />
            </div>
            <button
              onClick={() => setActiveTab("settings")}
              className="btn-icon ml-2"
              aria-label="Settings"
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>

          {/* TABS */}
          <nav className="mt-3">
            <div className="mx-auto max-w-5xl tabs">
              {[
                { k: "inventory", icon: <ListChecks className="w-4 h-4" />, label: "Inventory" },
                { k: "recipes", icon: <ChefHat className="w-4 h-4" />, label: "Recipes" },
                { k: "shopping", icon: <ShoppingCart className="w-4 h-4" />, label: "Shopping" },
                { k: "analytics", icon: <BarChart className="w-4 h-4" />, label: "Analytics" },
              ].map((t) => (
                <button
                  key={t.k}
                  onClick={() => setActiveTab(t.k as any)}
                  className="tab"
                  aria-current={activeTab === t.k ? "page" : undefined}
                >
                  {t.icon}
                  {t.label}
                </button>
              ))}
            </div>
          </nav>
        </div>
      </header>

      {/* CONTENT */}
      <main className="flex-1">
        <div className="max-w-5xl mx-auto p-4 space-y-6">
          {/* INVENTORY */}
          {activeTab === "inventory" && (
            <motion.section
              className="sp-card p-4 sp-card-lg"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <Filter className="w-4 h-4" style={{ color: "var(--brand)" }} />
                <div className="flex gap-2">
                  {["all", "fridge", "freezer", "pantry", "expiring"].map((f) => (
                    <button
                      key={f}
                      onClick={() => useStore.getState().setFilter(f as any)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                        prefs.filter === f
                          ? "sp-btn-primary"
                          : "sp-btn-ghost"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
                <div className="flex-1" />
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted">Sort</span>
                  {(["az", "qty", "status"] as const).map((k) => (
                    <button
                      key={k}
                      className={`px-2 py-1 rounded-md text-xs border ${
                        prefs.sort === k ? "surface border-subtle" : "sp-btn-ghost"
                      }`}
                      onClick={() => setSort(k)}
                    >
                      {k.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {filteredItems.length === 0 ? (
                <EmptyState
                  title="No items found"
                  subtitle="Prueba a limpiar filtros o añade productos desde Shopping."
                />
              ) : (
                <ul className="grid md:grid-cols-2 gap-3">
                  {filteredItems.map((item) => (
                    <motion.li
                      key={item.id}
                      className="flex justify-between items-center surface p-3 rounded-xl border-subtle sp-card-hover"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <div>
                        <p className="font-semibold">{item.name}</p>
                        <p className="text-xs text-muted">
                          {item.location} · {item.category}
                        </p>
                      </div>
                      <span className="text-xs" style={{ color: item.statusColor.includes("red") ? "#ef4444" : item.statusColor.includes("yellow") ? "#f59e0b" : "#10b981" }}>
                        {item.status}
                      </span>
                    </motion.li>
                  ))}
                </ul>
              )}
            </motion.section>
          )}

          {/* RECIPES */}
          {activeTab === "recipes" && (
            <motion.section
              className="sp-card p-4 sp-card-lg"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center gap-2 mb-3">
                <ChefHat className="w-5 h-5" style={{ color: "var(--brand)" }} />
                <h2 className="text-lg font-extrabold">Recipes (Smart)</h2>
                <div className="flex-1" />
                <label className="flex items-center gap-2 text-xs text-muted">
                  <input
                    type="checkbox"
                    checked={onlyCookable}
                    onChange={(e) => setOnlyCookable(e.target.checked)}
                  />
                  Cookable now
                </label>
              </div>

              <div className="grid md:grid-cols-2 gap-3">
                {scoredRecipes.map(({ r, score, missingCount }) => {
                  const have = Object.keys(r.uses).filter(
                    (b) => (invMap.get(normalize(b)) ?? 0) >= (r.uses[b] || 0)
                  );
                  const missing = Object.keys(r.uses).filter((b) => !have.includes(b));
                  const fav = favorites.has(r.name);

                  return (
                    <motion.article
                      key={r.name}
                      className="rounded-2xl p-3 border-subtle surface sp-card-hover"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-bold text-base">{r.name}</h3>
                          <p className="text-xs text-muted">
                            {r.time} · {r.difficulty} · Score {score}
                          </p>
                        </div>
                        <button
                          onClick={() => toggleFavorite(r.name)}
                          className="btn-icon"
                          title={fav ? "Unfavorite" : "Favorite"}
                        >
                          {fav ? <HeartOff className="w-4 h-4" /> : <Heart className="w-4 h-4" />}
                        </button>
                      </div>

                      <p className="text-[12px] mt-2">
                        <span className="font-semibold">Ingredients:</span> {r.ingredients}
                      </p>
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {r.tags.map((t) => (
                          <span key={t} className="badge">{t}</span>
                        ))}
                      </div>

                      <div className="grid grid-cols-2 gap-3 mt-3 text-[12px]">
                        <div className="surface-2 rounded-lg p-2 border-subtle">
                          <p className="text-muted font-semibold mb-1">Have</p>
                          <p>{have.length ? have.join(", ") : "—"}</p>
                        </div>
                        <div className="surface-2 rounded-lg p-2 border-subtle">
                          <p className="text-muted font-semibold mb-1">Missing</p>
                          <p>{missing.length ? missing.join(", ") : "—"}</p>
                        </div>
                      </div>

                      <div className="flex gap-2 mt-3">
                        <button onClick={() => cookNow(r)} className="sp-btn sp-btn-primary px-3 py-2 text-xs">
                          Cook now
                        </button>
                        {missingCount > 0 && (
                          <button onClick={() => addMissingToShopping(missing)} className="sp-btn sp-btn-ghost px-3 py-2 text-xs">
                            Add Missing
                          </button>
                        )}
                      </div>

                      {!!r.steps?.length && (
                        <details className="mt-3">
                          <summary className="text-xs text-muted cursor-pointer">Steps</summary>
                          <ol className="list-decimal list-inside text-xs mt-1 space-y-1">
                            {r.steps.map((s, i) => (<li key={i}>{s}</li>))}
                          </ol>
                        </details>
                      )}
                    </motion.article>
                  );
                })}
              </div>

              {scoredRecipes.length === 0 && (
                <EmptyState
                  title="No recipes match"
                  subtitle="Prueba a desactivar ‘Cookable now’ o ajusta la búsqueda."
                />
              )}
            </motion.section>
          )}

          {/* SHOPPING */}
          {activeTab === "shopping" && (
            <motion.section className="sp-card p-4 sp-card-lg" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex items-center gap-2 mb-3">
                <ShoppingCart className="w-5 h-5" style={{ color: "var(--brand)" }} />
                <h2 className="text-lg font-extrabold">Shopping List</h2>
              </div>

              <div className="flex flex-wrap gap-2 mb-3">
                <input value={newItem} onChange={(e) => setNewItem(e.target.value)} placeholder="Add item" className="input min-w-[200px] flex-1" />
                <input type="number" min={1} value={newItemQty} onChange={(e) => setNewItemQty(parseInt(e.target.value || "1"))} className="input w-20" />
                <select value={newItemUnit} onChange={(e) => setNewItemUnit(e.target.value)} className="select">
                  <option value="units">units</option><option value="kg">kg</option><option value="g">g</option>
                  <option value="L">L</option><option value="ml">ml</option><option value="packs">packs</option>
                </select>
                <select value={newItemLoc} onChange={(e) => setNewItemLoc(e.target.value as any)} className="select">
                  <option>Pantry</option><option>Fridge</option><option>Freezer</option>
                </select>
                <button onClick={addNewItemToList} className="sp-btn sp-btn-primary px-4 py-2 text-sm">Add</button>
              </div>

              <div className="space-y-4">
                {["Pantry", "Fridge", "Freezer"].map((loc) => {
                  const arr = shoppingList.filter((r) => r.location === (loc as any));
                  if (arr.length === 0) return null;
                  const total = arr.reduce((s, r) => s + r.qty, 0);
                  return (
                    <div key={loc} className="rounded-2xl border-subtle surface">
                      <div className="px-3 py-2 flex items-center justify-between">
                        <div className="font-semibold">{loc}</div>
                        <div className="text-xs text-muted">Items: {arr.length} · Qty: {total}</div>
                      </div>
                      <ul className="divide-y border-subtle/50">
                        {arr.map((it) => (
                          <li key={it.id} className="p-3 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <button onClick={() => updateQtyRow(it.id, -1)} className="btn-icon"><Minus className="w-4 h-4" /></button>
                              <span className="min-w-[48px] text-center font-semibold">{it.qty}</span>
                              <button onClick={() => updateQtyRow(it.id, +1)} className="btn-icon"><Plus className="w-4 h-4" /></button>
                              <span className="ml-2 font-medium">{it.name}</span>
                              <span className="text-xs text-muted">({it.unit})</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <select value={it.location} onChange={(e) => changeLocRow(it.id, e.target.value as any)} className="select px-2 py-1 text-xs w-[110px]">
                                <option>Pantry</option><option>Fridge</option><option>Freezer</option>
                              </select>
                              <label className="flex items-center gap-1 text-xs">
                                <input type="checkbox" checked={it.purchased} onChange={() => togglePurchasedRow(it.id)} />
                                purchased
                              </label>
                              <button onClick={() => removeRow(it.id)} className="btn-icon" aria-label="Remove item">
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
                onClick={() => { finalizePurchase(); toast.add("Inventory updated"); }}
                className="w-full mt-4 sp-btn sp-btn-primary py-3 text-sm"
              >
                <CheckCircle2 className="w-5 h-5" /> Finalize Purchase & Update Inventory
              </button>
            </motion.section>
          )}

          {/* ANALYTICS */}
          {activeTab === "analytics" && (
            <motion.section className="sp-card p-4 sp-card-lg" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <h2 className="text-lg font-extrabold mb-2 flex items-center gap-2">
                <BarChart className="w-5 h-5" style={{ color: "var(--brand)" }} /> Analytics Dashboard
              </h2>
              <div className="grid sm:grid-cols-2 gap-3">
                <KPI title="Veg share" value={`${macroPct.greens}%`} />
                <KPI title="Protein share" value={`${macroPct.protein}%`} />
                <KPI title="Carbs share" value={`${macroPct.carbs}%`} />
                <KPI title="Fats share" value={`${macroPct.fats}%`} />
              </div>

              <div className="mt-4 rounded-2xl border-subtle surface p-3">
                <h3 className="font-semibold mb-2">At risk</h3>
                {atRiskItems.length === 0 ? (
                  <p className="text-xs text-muted">Sin riesgo ahora mismo.</p>
                ) : (
                  <ul className="text-sm">
                    {atRiskItems.slice(0, 8).map((i) => (
                      <li key={i.id} className="flex justify-between py-1">
                        <span>{i.baseName}</span>
                        <span style={{ color: "#ef4444" }} className="text-xs">{i.status}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </motion.section>
          )}

          {/* SETTINGS */}
          {activeTab === "settings" && (
            <motion.section className="sp-card p-4 sp-card-lg" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <h2 className="text-lg font-extrabold mb-2 flex items-center gap-2">
                <Settings className="w-5 h-5" style={{ color: "var(--brand)" }} /> Settings
              </h2>

              <div className="grid md:grid-cols-2 gap-3 text-sm">
                {/* Theme */}
                <div className="rounded-2xl border-subtle surface p-3">
                  <p className="font-semibold">Appearance</p>
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      onClick={() => { document.documentElement.classList.add("light"); setTheme("light"); }}
                      className="sp-btn sp-btn-ghost px-3 py-2"
                    >Light</button>
                    <button
                      onClick={() => { document.documentElement.classList.remove("light"); setTheme("dark"); }}
                      className="sp-btn sp-btn-ghost px-3 py-2"
                    >Dark</button>
                    <button
                      onClick={() => {
                        const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
                        document.documentElement.classList.toggle("light", !prefersDark);
                        setTheme("system");
                      }}
                      className="sp-btn sp-btn-ghost px-3 py-2"
                    >System</button>
                  </div>
                </div>

                {/* Goals */}
                <div className="rounded-2xl border-subtle surface p-3">
                  <p className="font-semibold">Goals</p>
                  <div className="mt-2 flex flex-wrap gap-2 items-center">
                    <label className="text-xs">
                      Waste ≤
                      <input type="number" className="input ml-1 w-16 inline-block"
                        onChange={(e) => setGoals({ wastePct: Number(e.target.value || 0) })}
                      />
                      %
                    </label>
                    <label className="text-xs">
                      Savings ≥ €
                      <input type="number" className="input ml-1 w-20 inline-block"
                        onChange={(e) => setGoals({ savings: Number(e.target.value || 0) })}
                      />
                    </label>
                    <label className="text-xs">
                      Green meals / week ≥
                      <input type="number" className="input ml-1 w-16 inline-block"
                        onChange={(e) => setGoals({ greenMealsPerWeek: Number(e.target.value || 0) })}
                      />
                    </label>
                  </div>
                </div>

                {/* Data */}
                <div className="rounded-2xl border-subtle surface p-3 md:col-span-2">
                  <p className="font-semibold">Data</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      onClick={() => { localStorage.clear(); window.location.reload(); }}
                      className="sp-btn sp-btn-danger px-3 py-2"
                    >
                      Clear localStorage
                    </button>
                  </div>
                </div>
              </div>
            </motion.section>
          )}
        </div>
      </main>

      {/* TOASTS */}
      <Toasts />
    </div>
  );
}

/** ===================== Small UI pieces ===================== */
function KPI({ title, value }: { title: string; value: string }) {
  return (
    <div className="kpi">
      <p className="kpi-title">{title}</p>
      <p className="kpi-value">{value}</p>
    </div>
  );
}

function EmptyState({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="text-center text-sm text-muted py-8">
      <p className="font-semibold">{title}</p>
      {subtitle && <p className="text-xs mt-1">{subtitle}</p>}
    </div>
  );
}
