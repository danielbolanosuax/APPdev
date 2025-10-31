const OFF_BASE_URL = process.env.OFF_BASE_URL ?? "https://world.openfoodfacts.org";

export type OFFProduct = {
  code: string;
  product?: {
    product_name?: string;
    brands?: string;
    categories?: string;
    nutriments?: Record<string, unknown>;
    nutriscore_grade?: "a" | "b" | "c" | "d" | "e";
    nova_group?: 1 | 2 | 3 | 4;
    ingredients_text_es?: string;
    additives_tags?: string[];
    image_small_url?: string;
    quantity?: string;
    lang?: string;
  };
  status: number;
  status_verbose?: string;
};

export async function fetchOFF(barcode: string): Promise<OFFProduct> {
  const url = `${OFF_BASE_URL}/api/v2/product/${encodeURIComponent(barcode)}.json`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`OFF ${res.status}`);
  return res.json() as Promise<OFFProduct>;
}
