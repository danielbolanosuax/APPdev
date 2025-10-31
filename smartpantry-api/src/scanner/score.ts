import type { OFFProduct } from "./offClient.js";

export type ScoreResult = {
  barcode: string;
  name: string;
  brand?: string;
  nutriScore?: "A" | "B" | "C" | "D" | "E";
  nova?: 1 | 2 | 3 | 4;
  score: number;
  warnings: string[];
  nutrients: {
    energy_kcal_100g?: number;
    sugars_100g?: number;
    fat_saturated_100g?: number;
    salt_100g?: number;
    fiber_100g?: number;
    proteins_100g?: number;
  };
  image?: string;
  quantity?: string;
  categories?: string[];
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function computeScore(off: OFFProduct): ScoreResult {
  const p = off.product ?? {};
  const n = p.nutriments ?? {};
  const toNum = (x: unknown) => (typeof x === "number" ? x : x ? Number(x) : undefined);
  const energy = toNum((n as any)["energy-kcal_100g"]);
  const sugars = toNum((n as any)["sugars_100g"]);
  const sat = toNum((n as any)["saturated-fat_100g"]);
  const salt = toNum((n as any)["salt_100g"]);
  const fiber = toNum((n as any)["fiber_100g"]);
  const proteins = toNum((n as any)["proteins_100g"]);

  const gradeMap: Record<string, number> = { a: 90, b: 75, c: 60, d: 40, e: 20 };
  let base = p.nutriscore_grade ? gradeMap[p.nutriscore_grade] : 60;

  if (sugars != null) base -= clamp((sugars - 5) * 2, 0, 30);
  if (sat != null) base -= clamp((sat - 2) * 4, 0, 30);
  if (salt != null) base -= clamp((salt - 0.3) * 25, 0, 25);
  if (fiber != null) base += clamp((fiber - 3) * 4, -10, 20);
  if (proteins != null) base += clamp((proteins - 5) * 2, -10, 20);

  const score = clamp(Math.round(base), 0, 100);

  const warnings: string[] = [];
  if (sugars != null && sugars > 10) warnings.push("Alto en azúcares (>10g/100g)");
  if (sat != null && sat > 5) warnings.push("Alto en grasas saturadas (>5g/100g)");
  if (salt != null && salt > 1.2) warnings.push("Alto en sal (>1.2g/100g)");
  if (energy != null && energy > 400) warnings.push("Muy calórico (>400kcal/100g)");
  if (p.nova_group && p.nova_group >= 4) warnings.push("Ultraprocesado (NOVA 4)");

  return {
    barcode: off.code,
    name: p.product_name ?? "Producto",
    brand: p.brands,
    nutriScore: p.nutriscore_grade?.toUpperCase() as any,
    nova: p.nova_group,
    score,
    warnings,
    nutrients: {
      energy_kcal_100g: energy,
      sugars_100g: sugars,
      fat_saturated_100g: sat,
      salt_100g: salt,
      fiber_100g: fiber,
      proteins_100g: proteins,
    },
    image: p.image_small_url,
    quantity: p.quantity,
    categories: (p.categories ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  };
}
