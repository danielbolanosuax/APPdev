import React, { useMemo, useState } from "react";
import { Heart, HeartOff, Timer, ChefHat, Star, Plus, Minus, ShoppingCart } from "lucide-react";
import { normalize, InventoryItem } from "../../state/store";

export type Recipe = {
  name: string;
  ingredients: string;                // texto legible
  uses: Record<string, number>;       // { baseName: qtyBaseFor1Serving }
  time: string;                       // "20 min"
  difficulty: "Easy" | "Medium" | "Hard";
  rating: number;
  tags: string[];
  steps?: string[];
  allergens?: string[];
};

type Props = {
  recipe: Recipe;
  isFavorite: boolean;
  inventory: InventoryItem[];
  onToggleFavorite: (name: string) => void;
  onCook: (recipe: Recipe, servings: number) => void;
  onAddMissingToShopping: (missingNames: string[]) => void;
};

export default function RecipeCard({
  recipe,
  isFavorite,
  inventory,
  onToggleFavorite,
  onCook,
  onAddMissingToShopping,
}: Props) {
  const [servings, setServings] = useState(1);

  const invMap = useMemo(() => {
    const m = new Map<string, number>();
    inventory.forEach((it) => m.set(normalize(it.baseName), it.qty));
    return m;
  }, [inventory]);

  const stats = useMemo(() => {
    const req = Object.entries(recipe.uses || {});
    const have = req.filter(([k, v]) => (invMap.get(normalize(k)) ?? 0) >= v * servings).map(([k]) => k);
    const missing = req.filter(([k, v]) => (invMap.get(normalize(k)) ?? 0) < v * servings).map(([k]) => k);
    const haveCount = have.length;
    const baseScore = (haveCount / Math.max(1, req.length)) * 100;
    const timeBoost = parseMins(recipe.time) <= 20 ? 8 : 0;
    const favBoost = isFavorite ? 10 : 0;
    const score = Math.round(baseScore + timeBoost + favBoost);
    return { have, missing, score, haveCount, missingCount: missing.length };
  }, [recipe, invMap, servings, isFavorite]);

  return (
    <article className="rounded-2xl p-3 border-subtle surface sp-card-hover">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-base">{recipe.name}</h3>
          <p className="text-xs text-muted flex items-center gap-2">
            <span className="inline-flex items-center gap-1"><Timer className="w-3.5 h-3.5" />{recipe.time}</span>
            <span>· {recipe.difficulty}</span>
            <span className="inline-flex items-center gap-1"><Star className="w-3.5 h-3.5" />{recipe.rating}</span>
            <span>· Score {stats.score}</span>
          </p>
        </div>
        <button onClick={() => onToggleFavorite(recipe.name)} className="btn-icon" title={isFavorite ? "Unfavorite" : "Favorite"}>
          {isFavorite ? <HeartOff className="w-4 h-4" /> : <Heart className="w-4 h-4" />}
        </button>
      </div>

      <p className="text-[12px] mt-2"><span className="font-semibold">Ingredients:</span> {recipe.ingredients}</p>

      {!!recipe.tags?.length && (
        <div className="flex gap-2 mt-2 flex-wrap">
          {recipe.tags.map((t) => (<span key={t} className="badge">{t}</span>))}
        </div>
      )}

      {/* Have / Missing */}
      <div className="grid grid-cols-2 gap-3 mt-3 text-[12px]">
        <div className="surface-2 rounded-lg p-2 border-subtle">
          <p className="text-muted font-semibold mb-1">Have</p>
          <p>{stats.have.length ? stats.have.join(", ") : "—"}</p>
        </div>
        <div className="surface-2 rounded-lg p-2 border-subtle">
          <p className="text-muted font-semibold mb-1">Missing</p>
          <p>{stats.missing.length ? stats.missing.join(", ") : "—"}</p>
        </div>
      </div>

      {/* Servings & actions */}
      <div className="flex flex-wrap items-center gap-2 mt-3">
        <div className="inline-flex items-center gap-1">
          <button className="btn-icon" onClick={() => setServings(Math.max(1, servings - 1))}><Minus className="w-4 h-4" /></button>
          <span className="min-w-[48px] text-center font-semibold">{servings}x</span>
          <button className="btn-icon" onClick={() => setServings(Math.min(12, servings + 1))}><Plus className="w-4 h-4" /></button>
        </div>
        <button onClick={() => onCook(recipe, servings)} className="sp-btn sp-btn-primary px-3 py-2 text-xs">
          <ChefHat className="w-4 h-4" /> Cook now
        </button>
        {stats.missingCount > 0 && (
          <button onClick={() => onAddMissingToShopping(stats.missing)} className="sp-btn sp-btn-ghost px-3 py-2 text-xs">
            <ShoppingCart className="w-4 h-4" /> Add Missing
          </button>
        )}
      </div>

      {!!recipe.steps?.length && (
        <details className="mt-3">
          <summary className="text-xs text-muted cursor-pointer">Steps</summary>
          <ol className="list-decimal list-inside text-xs mt-1 space-y-1">
            {recipe.steps.map((s, i) => (<li key={i}>{s}</li>))}
          </ol>
        </details>
      )}
    </article>
  );
}

function parseMins(s: string) {
  const m = /(\d+)\s*min/i.exec(s || "");
  return m ? parseInt(m[1], 10) : 60;
}
