import React, { useEffect, useMemo, useRef, useState } from "react";
import { Filter, Search, SortAsc, Flame, Timer, UtensilsCrossed } from "lucide-react";
import { useStore, selectors, normalize, InventoryItem, Location } from "../../state/store";
import RecipeCard, { Recipe } from "./RecipeCard";

/* ======= base data (puedes mover a slice en el futuro) ======= */
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

/* ======= local toasts (minimalistas) ======= */
function useToasts() {
  const [toasts, setToasts] = useState<{ id: number; msg: string }[]>([]);
  const add = (msg: string) => {
    const id = Date.now();
    setToasts((t) => [...t, { id, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2200);
  };
  const View = () => (
    <div className="fixed bottom-6 right-6 z-50 space-y-2">
      {toasts.map((t) => (
        <div key={t.id} className="px-4 py-2 rounded-xl surface border-subtle text-sm shadow-elev">{t.msg}</div>
      ))}
    </div>
  );
  return { add, View };
}

/* ======= Recipes View ======= */
export default function RecipesView() {
  const toast = useToasts();

  const items = useStore(selectors.items);
  const favorites = useStore((s) => new Set(s.prefs.favorites));

  const toggleFavorite = useStore((s) => s.toggleFavorite);
  const setItems = useStore((s) => s.setItems);
  const addCook = useStore((s) => s.addCook);
  const addRow = useStore((s) => s.addRow);

  // filtros
  const [query, setQuery] = useState("");
  const [onlyCookable, setOnlyCookable] = useState(false);
  const [maxTime, setMaxTime] = useState<number | null>(null); // null = sin límite
  const [difficulties, setDifficulties] = useState<Set<Recipe["difficulty"]>>(new Set());
  const [sortBy, setSortBy] = useState<"score"|"time"|"name">("score");

  const invMap = useMemo(() => {
    const m = new Map<string, number>();
    items.forEach((it) => m.set(normalize(it.baseName), it.qty));
    return m;
  }, [items]);

  const parsed = useMemo(() => {
    return BASE_RECIPES.map((r) => {
      const req = Object.entries(r.uses || {});
      const haveCount = req.filter(([k, v]) => (invMap.get(normalize(k)) ?? 0) >= v).length;
      const baseScore = (haveCount / Math.max(1, req.length)) * 100;
      const timeBoost = parseMins(r.time) <= 20 ? 8 : 0;
      const favBoost = favorites.has(r.name) ? 10 : 0;
      const score = Math.round(baseScore + timeBoost + favBoost);
      return { r, haveCount, missingCount: req.length - haveCount, score, mins: parseMins(r.time) };
    });
  }, [invMap, favorites]);

  const filtered = useMemo(() => {
    let arr = parsed;

    // cookable filter
    if (onlyCookable) arr = arr.filter(x => x.missingCount === 0);

    // search
    const q = normalize(query);
    if (q) {
      arr = arr.filter(x =>
        normalize(x.r.name).includes(q) ||
        x.r.tags.some((t) => normalize(t).includes(q)) ||
        normalize(x.r.ingredients).includes(q)
      );
    }

    // time
    if (typeof maxTime === "number") {
      arr = arr.filter(x => x.mins <= maxTime);
    }

    // difficulty
    if (difficulties.size > 0) {
      arr = arr.filter(x => difficulties.has(x.r.difficulty));
    }

    // sort
    arr = [...arr].sort((a,b)=>{
      if (sortBy==="score") return b.score - a.score;
      if (sortBy==="time") return a.mins - b.mins;
      return a.r.name.localeCompare(b.r.name);
    });

    return arr;
  }, [parsed, onlyCookable, query, maxTime, difficulties, sortBy]);

  const onCook = (recipe: Recipe, servings: number) => {
    const next = items.map((it) => ({ ...it }));
    Object.entries(recipe.uses || {}).forEach(([base, amount]) => {
      const idx = next.findIndex((i) => normalize(i.baseName) === normalize(base));
      if (idx >= 0) {
        const scaled = (amount as number) * servings;
        next[idx].qty = Math.max(0, (next[idx].qty || 0) - scaled);
        next[idx].name = `${next[idx].baseName} (${next[idx].qty} ${next[idx].unit})`;
        next[idx].status = next[idx].qty === 0 ? "Used" : next[idx].status;
      }
    });
    setItems(next);
    addCook(recipe.name);
    toast.add("Cooked!");
  };

  const onAddMissingToShopping = (missingNames: string[]) => {
    if (!missingNames?.length) return;
    missingNames.forEach((m) => {
      // inferir unit & location del inventario si existe, si no defaults
      const it = items.find((i) => normalize(i.baseName) === normalize(m));
      addRow({
        name: m,
        qty: 1,
        unit: it?.unit || "units",
        location: (it?.location as Location) || "Pantry",
        purchased: false,
      });
    });
    toast.add("Missing items added to Shopping");
  };

  return (
    <section className="sp-card p-4 sp-card-lg">
      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <Filter className="w-4 h-4" style={{ color: "var(--brand)" }} />

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted" />
          <input
            value={query}
            onChange={(e)=>setQuery(e.target.value)}
            className="search-input w-[240px]"
            placeholder="Search recipes…"
          />
        </div>

        {/* Cookable toggle */}
        <label className="text-xs inline-flex items-center gap-2 surface-2 px-2 py-1 rounded-md border-subtle">
          <input type="checkbox" checked={onlyCookable} onChange={(e)=>setOnlyCookable(e.target.checked)} />
          Cookable now
        </label>

        {/* Max time */}
        <div className="text-xs inline-flex items-center gap-2 surface-2 px-2 py-1 rounded-md border-subtle">
          <Timer className="w-3.5 h-3.5" />
          <select
            className="select px-2 py-1 text-xs w-[120px]"
            value={maxTime ?? ""}
            onChange={(e)=>{
              const v = e.target.value;
              setMaxTime(v==="" ? null : Number(v));
            }}
          >
            <option value="">Any time</option>
            <option value="15">≤ 15 min</option>
            <option value="20">≤ 20 min</option>
            <option value="30">≤ 30 min</option>
            <option value="45">≤ 45 min</option>
            <option value="60">≤ 60 min</option>
          </select>
        </div>

        {/* Difficulty pills */}
        <div className="inline-flex items-center gap-1">
          {(["Easy","Medium","Hard"] as const).map(d => {
            const active = difficulties.has(d);
            return (
              <button
                key={d}
                onClick={()=>{
                  const n = new Set(difficulties);
                  if (active) n.delete(d); else n.add(d);
                  setDifficulties(n);
                }}
                className={`px-2 py-1 rounded-full text-xs font-semibold border ${active ? "sp-btn-primary" : "sp-btn-ghost"}`}
                title={`Filter: ${d}`}
              >
                {d}
              </button>
            );
          })}
        </div>

        <div className="flex-1" />

        {/* Sort */}
        <div className="flex items-center gap-2">
          <SortAsc className="w-4 h-4 text-muted" />
          {(["score","time","name"] as const).map(k=>(
            <button
              key={k}
              className={`px-2 py-1 rounded-md text-xs border ${sortBy===k ? "surface border-subtle" : "sp-btn-ghost"}`}
              onClick={()=>setSortBy(k)}
              title={`Sort by ${k}`}
            >
              {k.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid md:grid-cols-2 gap-3">
        {filtered.map(({ r }) => (
          <RecipeCard
            key={r.name}
            recipe={r}
            isFavorite={favorites.has(r.name)}
            inventory={items}
            onToggleFavorite={toggleFavorite}
            onCook={onCook}
            onAddMissingToShopping={onAddMissingToShopping}
          />
        ))}
      </div>

      {filtered.length===0 && (
        <div className="text-center text-sm text-muted py-8">
          <p className="font-semibold">No recipes match</p>
          <p className="text-xs mt-1">Ajusta filtros o búsqueda.</p>
        </div>
      )}

      <toast.View />
    </section>
  );
}

function parseMins(s: string) {
  const m = /(\d+)\s*min/i.exec(s || "");
  return m ? parseInt(m[1], 10) : 60;
}
