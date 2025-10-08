import React, { useMemo, useState } from "react";
import {
  ChefHat,
  Search,
  Star,
  Heart,
  HeartOff,
  Timer,
  SlidersHorizontal,
  ListChecks,
  ShoppingBasket,
  SortAsc,
} from "lucide-react";
import { useStore, selectors, normalize, Location } from "../../state/store";

/* ===== Base recipes ===== */
export type Recipe = {
  name: string;
  ingredients: string;
  uses: Record<string, number>;
  time: string; // "20 min"
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
    steps: ["Boil pasta.", "Sauté tomatoes.", "Mix & serve."],
  },
  {
    name: "Chicken & Rice Bowl",
    ingredients: "Chicken, Rice, Olive Oil",
    difficulty: "Medium",
    time: "35 min",
    rating: 4.8,
    tags: ["High Protein"],
    uses: { Chicken: 250, Rice: 0.25, "Olive Oil": 10 },
    steps: ["Sear chicken.", "Cook rice.", "Assemble bowl."],
  },
  {
    name: "Milk Pudding",
    ingredients: "Milk, Rice, Sugar",
    difficulty: "Easy",
    time: "25 min",
    rating: 4.2,
    tags: ["Dessert"],
    uses: { Milk: 0.3, Rice: 0.1, Sugar: 25 },
    steps: ["Simmer rice in milk.", "Sweeten.", "Chill."],
  },
];

/* ===== Helpers ===== */
const parseMins = (s: string) => {
  const m = /(\d+)\s*min/i.exec(s || "");
  return m ? parseInt(m[1], 10) : 60;
};
const TIME_FILTERS: { k: string; label: string; max?: number }[] = [
  { k: "any", label: "Any time" },
  { k: "15", label: "≤ 15 min", max: 15 },
  { k: "30", label: "≤ 30", max: 30 },
  { k: "45", label: "≤ 45", max: 45 },
  { k: "60", label: "> 45", max: undefined },
];

export default function RecipesView() {
  // store
  const items = useStore(selectors.items);
  const setItems = useStore((s) => s.setItems);
  const addCook = useStore((s) => s.addCook);
  const addRow = useStore((s) => s.addRow);
  const toggleFavorite = useStore((s) => s.toggleFavorite);
  const favorites = useStore(selectors.favoritesSet);

  // UI filters
  const [query, setQuery] = useState("");
  const [onlyCookable, setOnlyCookable] = useState(false);
  const [timeKey, setTimeKey] = useState<"any" | "15" | "30" | "45" | "60">("any");
  const [levels, setLevels] = useState<Set<Recipe["difficulty"]>>(
    () => new Set(["Easy", "Medium", "Hard"])
  );
  const [sortBy, setSortBy] = useState<"score" | "time" | "name">("score");

  const invMap = useMemo(() => {
    const m = new Map<string, number>();
    items.forEach((it) => m.set(normalize(it.baseName), it.qty));
    return m;
  }, [items]);

  const q = normalize(query);

  const scored = useMemo(() => {
    let arr = BASE_RECIPES.map((r) => {
      const req = Object.entries(r.uses || {});
      const haveCount = req.filter(([k, v]) => (invMap.get(normalize(k)) ?? 0) >= v).length;
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

    // filters
    if (onlyCookable) arr = arr.filter((x) => x.missingCount === 0);
    if (timeKey !== "any") {
      const conf = TIME_FILTERS.find((t) => t.k === timeKey)!;
      if (conf.max) {
        arr = arr.filter((x) => parseMins(x.r.time) <= (conf.max as number));
      } else {
        arr = arr.filter((x) => parseMins(x.r.time) > 45);
      }
    }
    if (levels.size !== 3) {
      arr = arr.filter((x) => levels.has(x.r.difficulty));
    }
    if (q) {
      arr = arr.filter(
        (x) =>
          normalize(x.r.name).includes(q) ||
          normalize(x.r.ingredients).includes(q) ||
          x.r.tags.some((t) => normalize(t).includes(q))
      );
    }

    // sort
    arr = arr.sort((a, b) => {
      if (sortBy === "score") return b.score - a.score;
      if (sortBy === "time") return parseMins(a.r.time) - parseMins(b.r.time);
      return a.r.name.localeCompare(b.r.name);
    });

    return arr;
  }, [invMap, favorites, onlyCookable, timeKey, levels, q, sortBy]);

  const cookNow = (r: Recipe, servings = 1) => {
    const next = items.map((it) => ({ ...it }));
    Object.entries(r.uses || {}).forEach(([base, amount]) => {
      const idx = next.findIndex((i) => normalize(i.baseName) === normalize(base));
      if (idx >= 0) {
        const scaled = (amount as number) * servings;
        next[idx].qty = Math.max(0, (next[idx].qty || 0) - scaled);
        next[idx].name = `${next[idx].baseName} (${next[idx].qty} ${next[idx].unit})`;
        next[idx].status = next[idx].qty === 0 ? "Used" : next[idx].status;
      }
    });
    setItems(next);
    addCook(r.name);
    alert("Cooked!");
  };

  const addMissingToShopping = (names: string[]) => {
    names.forEach((m) =>
      addRow({ name: m, qty: 1, unit: "units", location: "Pantry" as Location, purchased: false })
    );
    alert("Missing items added");
  };

  return (
    <section className="recipes-wrap">
      {/* Header */}
      <div className="card-head">
        <div className="card-title">
          <span className="ringed"><ChefHat className="w-4 h-4" /></span>
          <div>
            <h3>Recipes</h3>
            <p className="eyebrow">Smart suggestions based on your pantry</p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="recipes-toolbar">
        <div className="tool search">
          <Search className="tool-icon" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="search-input"
            placeholder="Search recipes…"
            aria-label="Search recipes"
          />
        </div>

        <label className="tool checkbox">
          <input type="checkbox" checked={onlyCookable} onChange={(e) => setOnlyCookable(e.target.checked)} />
          Cookable now
        </label>

        <div className="tool seg-group" role="tablist" aria-label="Time">
          <Timer className="tool-icon" />
          {TIME_FILTERS.map((t) => (
            <button
              key={t.k}
              role="tab"
              aria-checked={timeKey === (t.k as any)}
              onClick={() => setTimeKey(t.k as any)}
              className="seg"
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="tool seg-group" role="tablist" aria-label="Difficulty">
          <SlidersHorizontal className="tool-icon" />
          {(["Easy", "Medium", "Hard"] as const).map((d) => {
            const on = levels.has(d);
            return (
              <button
                key={d}
                role="tab"
                aria-checked={on}
                onClick={() => {
                  const s = new Set(levels);
                  if (on) s.delete(d);
                  else s.add(d);
                  setLevels(s);
                }}
                className="seg"
              >
                {d}
              </button>
            );
          })}
        </div>

        <div className="tool seg-group" role="tablist" aria-label="Sort">
          <SortAsc className="tool-icon" />
          {(["score", "time", "name"] as const).map((s) => (
            <button
              key={s}
              role="tab"
              aria-checked={sortBy === s}
              onClick={() => setSortBy(s)}
              className="seg"
              title={`Sort by ${s}`}
            >
              {s.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="recipes-list">
        {scored.map(({ r, score }) => {
          const have = Object.keys(r.uses).filter((b) => (invMap.get(normalize(b)) ?? 0) >= (r.uses[b] || 0));
          const missing = Object.keys(r.uses).filter((b) => !have.includes(b));
          const fav = favorites.has(r.name);
          return (
            <RecipeCard
              key={r.name}
              r={r}
              score={score}
              have={have}
              missing={missing}
              fav={fav}
              onToggleFav={() => toggleFavorite(r.name)}
              onCook={(serv) => cookNow(r, serv)}
              onAddMissing={() => addMissingToShopping(missing)}
            />
          );
        })}

        {scored.length === 0 && (
          <div className="empty">
            <div className="empty-card">
              <div className="empty-title">No recipes match</div>
              <p className="eyebrow">Try clearing filters or search.</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/* ========= Card ========= */
function RecipeCard({
  r,
  score,
  have,
  missing,
  fav,
  onToggleFav,
  onCook,
  onAddMissing,
}: {
  r: Recipe;
  score: number;
  have: string[];
  missing: string[];
  fav: boolean;
  onToggleFav: () => void;
  onCook: (servings: number) => void;
  onAddMissing: () => void;
}) {
  const [servings, setServings] = useState(1);

  return (
    <article className="recipe-card">
      <header className="rc-head">
        <div className="rc-title">{r.name}</div>
        <button className="btn-icon" onClick={onToggleFav} aria-label="Favorite">
          {fav ? <HeartOff className="w-4 h-4" /> : <Heart className="w-4 h-4" />}
        </button>
      </header>

      <div className="rc-meta">
        <span className="pill">
          <Timer className="w-3 h-3" /> {r.time}
        </span>
        <span className="pill">{r.difficulty}</span>
        <span className="pill">
          <Star className="w-3 h-3" /> {r.rating.toFixed(1)}
        </span>
        <span className="pill score">SCORE {score}</span>
      </div>

      <p className="eyebrow">
        Ingredients: <b>{r.ingredients}</b>
      </p>

      <div className="rc-row">
        <div>
          <div className="eyebrow">Have</div>
          <div className="chips">
            {have.length ? have.map((x) => <span key={x} className="chip ok">{x}</span>) : <span className="chip">{'—'}</span>}
          </div>
        </div>
        <div>
          <div className="eyebrow">Missing</div>
          <div className="chips">
            {missing.length ? missing.map((x) => <span key={x} className="chip warn">{x}</span>) : <span className="chip">{'—'}</span>}
          </div>
        </div>
      </div>

      <div className="rc-actions">
        <div className="servings">
          <button className="btn-icon" onClick={() => setServings(Math.max(1, servings - 1))}>-</button>
          <span className="qty">{servings}x</span>
          <button className="btn-icon" onClick={() => setServings(servings + 1)}>+</button>
        </div>
        <div className="rc-buttons">
          <button className="sp-btn sp-btn-ghost" onClick={onAddMissing} disabled={missing.length === 0}>
            <ShoppingBasket className="w-4 h-4" /> Add Missing
          </button>
          <button className="sp-btn sp-btn-primary" onClick={() => onCook(servings)}>
            <ListChecks className="w-4 h-4" /> Cook now
          </button>
        </div>
      </div>

      {!!r.steps?.length && (
        <details className="rc-steps">
          <summary>Steps</summary>
          <ol>
            {r.steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        </details>
      )}
    </article>
  );
}
