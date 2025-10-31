import { RECIPE_DB } from "./recipes.db.js";
import { Dietary, Recipe } from "../types.js";
import { intersectCount, normalize } from "../utils.js";

const violatesDiet = (r: Recipe, d?: Dietary) => {
  const ing = r.ingredients.map(normalize);
  if (!d) return false;
  if (
    d.vegan &&
    (ing.includes("huevo") ||
      ing.includes("queso") ||
      ing.includes("leche") ||
      ing.includes("miel"))
  )
    return true;
  if (
    d.vegetarian &&
    (ing.includes("pollo") ||
      ing.includes("carne") ||
      ing.includes("jamon") ||
      ing.includes("atun"))
  )
    return true;
  if (d.glutenFree && ing.some((x) => /trigo|pan|harina|cuscus|pasta/.test(x))) return true;
  if (d.lactoseFree && ing.some((x) => /leche|nata|queso|mantequilla|yogur/.test(x))) return true;
  if (d.nutFree && ing.some((x) => /nuez|almendra|avellana|cacahuete/.test(x))) return true;
  return false;
};

export function pickCandidates(pantry: string[], dietary?: Dietary, max = 6): Recipe[] {
  const scored = RECIPE_DB.filter((r) => !violatesDiet(r, dietary))
    .map((r) => ({ r, score: intersectCount(r.ingredients, pantry) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map((x) => x.r);

  return scored.length ? scored : RECIPE_DB.slice(0, Math.min(max, RECIPE_DB.length));
}
