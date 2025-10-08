import { create } from "zustand";
import { persist, createJSONStorage, StateStorage } from "zustand/middleware";

/* ===================== Tipos de dominio ===================== */
export type Location = "Fridge" | "Freezer" | "Pantry";
export type Category =
  | "Vegetables"
  | "Meat"
  | "Dairy"
  | "Dry Goods"
  | "Condiments"
  | "Other";

export type InventoryItem = {
  id: string;           // clave estable (baseName|unit|location)
  name: string;         // "Tomatoes (3)"
  baseName: string;     // "Tomatoes"
  qty: number;
  unit: string;         // "units" | "g" | "kg" | "ml" | "L" | "packs"
  location: Location;
  status: string;       // "Fresh" | "Expires in 2 days" | ...
  statusColor: string;  // tailwind class
  category: Category;
};

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

export type ShoppingRow = {
  id: string;    // clave estable (name|unit|location)
  name: string;
  qty: number;
  unit: string;
  location: Location;
  purchased: boolean;
};

export type HistoryEntry = { recipe: string; ts: number };

export type Goals = {
  wastePct: number;
  savings: number;
  greenMealsPerWeek: number;
};

export type Prefs = {
  theme: "light" | "dark" | "system";
  filter: "all" | "fridge" | "freezer" | "pantry" | "expiring";
  sort: "az" | "qty" | "status";
  favorites: string[]; // nombres de receta
  goals: Goals;
};

/* ===================== Helpers ===================== */
export const normalize = (s: string) => (s ?? "").trim().toLowerCase();
export const keyItem = (b: string, unit: string, loc: Location) =>
  `${normalize(b)}|${unit}|${loc}`;
export const keyRow = (n: string, unit: string, loc: Location) =>
  `${normalize(n)}|${unit}|${loc}`;

export function inferCategory(name: string): Category {
  const n = name.toLowerCase();
  if (/(tomato|lettuce|broccoli|onion)/.test(n)) return "Vegetables";
  if (/(chicken|beef|pork|fish)/.test(n)) return "Meat";
  if (/(milk|yogurt|cheese)/.test(n)) return "Dairy";
  if (/(rice|pasta|flour|oats|bread)/.test(n)) return "Dry Goods";
  if (/(oil|olive)/.test(n)) return "Condiments";
  return "Other";
}

const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));

/* ===================== Estado inicial ===================== */
const initialItems: InventoryItem[] = [
  {
    id: keyItem("Tomatoes", "units", "Fridge"),
    name: "Tomatoes (3)",
    baseName: "Tomatoes",
    qty: 3,
    unit: "units",
    location: "Fridge",
    status: "Expires in 2 days",
    statusColor: "text-red-500",
    category: "Vegetables",
  },
  {
    id: keyItem("Milk", "L", "Fridge"),
    name: "Milk (1L)",
    baseName: "Milk",
    qty: 1,
    unit: "L",
    location: "Fridge",
    status: "Fresh",
    statusColor: "text-green-500",
    category: "Dairy",
  },
  {
    id: keyItem("Chicken", "g", "Freezer"),
    name: "Chicken (500g)",
    baseName: "Chicken",
    qty: 500,
    unit: "g",
    location: "Freezer",
    status: "Expires in 5 days",
    statusColor: "text-yellow-500",
    category: "Meat",
  },
  {
    id: keyItem("Rice", "kg", "Pantry"),
    name: "Rice (1kg)",
    baseName: "Rice",
    qty: 1,
    unit: "kg",
    location: "Pantry",
    status: "Expires in 12 months",
    statusColor: "text-green-500",
    category: "Dry Goods",
  },
  {
    id: keyItem("Olive Oil", "ml", "Pantry"),
    name: "Olive Oil (500ml)",
    baseName: "Olive Oil",
    qty: 500,
    unit: "ml",
    location: "Pantry",
    status: "Long Shelf Life",
    statusColor: "text-green-500",
    category: "Condiments",
  },
  {
    id: keyItem("Pasta", "packs", "Pantry"),
    name: "Pasta (2 packs)",
    baseName: "Pasta",
    qty: 2,
    unit: "packs",
    location: "Pantry",
    status: "Expires in 18 months",
    statusColor: "text-green-500",
    category: "Dry Goods",
  },
];

const initialShopping: ShoppingRow[] = [
  {
    id: keyRow("Lettuce", "unit", "Fridge"),
    name: "Lettuce",
    qty: 1,
    unit: "unit",
    location: "Fridge",
    purchased: false,
  },
  {
    id: keyRow("Sugar", "kg", "Pantry"),
    name: "Sugar",
    qty: 1,
    unit: "kg",
    location: "Pantry",
    purchased: false,
  },
  {
    id: keyRow("Eggs", "units", "Fridge"),
    name: "Eggs",
    qty: 12,
    unit: "units",
    location: "Fridge",
    purchased: false,
  },
];

const initialPrefs: Prefs = {
  theme: "system",
  filter: "all",
  sort: "az",
  favorites: [],
  goals: { wastePct: 20, savings: 50, greenMealsPerWeek: 3 },
};

/* ===================== Store shape ===================== */
type InventorySlice = {
  items: InventoryItem[];
  setItems: (next: InventoryItem[]) => void;
  addItem: (p: {
    baseName: string;
    qty: number;
    unit: string;
    location: Location;
  }) => void;
  updateItem: (id: string, patch: Partial<InventoryItem>) => void;
  removeItem: (id: string) => void;
  mergePurchase: (rows: ShoppingRow[]) => void;
};

type ShoppingSlice = {
  shopping: ShoppingRow[];
  setShopping: (next: ShoppingRow[]) => void;
  addRow: (row: Omit<ShoppingRow, "id">) => void;
  updateQty: (id: string, delta: number) => void;
  togglePurchased: (id: string) => void;
  changeLoc: (id: string, loc: Location) => void;
  removeRow: (id: string) => void;
  finalizePurchase: () => void;
};

type HistorySlice = {
  history: HistoryEntry[];
  addCook: (recipeName: string) => void;
  clearHistory: () => void;
};

type PrefsSlice = {
  prefs: Prefs;
  setTheme: (t: Prefs["theme"]) => void;
  setFilter: (f: Prefs["filter"]) => void;
  setSort: (s: Prefs["sort"]) => void;
  toggleFavorite: (name: string) => void;
  setGoals: (g: Partial<Goals>) => void;
};

export type AppState = InventorySlice & ShoppingSlice & HistorySlice & PrefsSlice;

/* ===================== Persistencia ===================== */
const storage: StateStorage = {
  getItem: (name) => localStorage.getItem(name) ?? null,
  setItem: (name, value) => localStorage.setItem(name, value),
  removeItem: (name) => localStorage.removeItem(name),
};

type PersistedState = {
  state: AppState;
  version: number;
};

const STORE_VERSION = 2;

const migrate = (persisted: PersistedState): AppState => {
  const s = persisted.state as any;
  if (persisted.version < 2) {
    if (!Array.isArray(s.prefs?.favorites)) {
      s.prefs = { ...(s.prefs || {}), favorites: [] };
    }
  }
  return s as AppState;
};

/* ===================== Implementación del store ===================== */
export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      /* ----- Inventory ----- */
      items: initialItems,
      setItems: (next) => set({ items: next }),
      addItem: ({ baseName, qty, unit, location }) =>
        set((state) => {
          const id = keyItem(baseName, unit, location);
          const exists = state.items.find((i) => i.id === id);
          if (exists) {
            const qtyNew = exists.qty + qty;
            const updated: InventoryItem = {
              ...exists,
              qty: qtyNew,
              name: `${exists.baseName} (${qtyNew} ${exists.unit})`,
              status: "Fresh",
              statusColor: "text-green-500"
            };
            return { items: state.items.map((i) => (i.id === id ? updated : i)) };
          } else {
            const created: InventoryItem = {
              id,
              name: `${baseName} (${qty} ${unit})`,
              baseName,
              qty,
              unit,
              location,
              status: "Fresh",
              statusColor: "text-green-500",
              category: inferCategory(baseName)
            };
            return { items: [...state.items, created] };
          }
        }),
      updateItem: (id, patch) =>
        set((state) => {
          const it = state.items.find((i) => i.id === id);
          if (!it) return {};
          const next = { ...it, ...patch } as InventoryItem;
          next.name = `${next.baseName} (${next.qty} ${next.unit})`;
          return { items: state.items.map((i) => (i.id === id ? next : i)) };
        }),
      removeItem: (id) =>
        set((state) => ({ items: state.items.filter((i) => i.id !== id) })),
      mergePurchase: (rows) =>
        set((state) => {
          let items = [...state.items];
          rows
            .filter((r) => r.purchased && r.qty > 0)
            .forEach((r) => {
              const id = keyItem(r.name, r.unit, r.location);
              const idx = items.findIndex((i) => i.id === id);
              if (idx >= 0) {
                const it = items[idx];
                const qtyNew = it.qty + r.qty;
                items[idx] = {
                  ...it,
                  qty: qtyNew,
                  name: `${it.baseName} (${qtyNew} ${it.unit})`,
                  status: "Fresh",
                  statusColor: "text-green-500"
                };
              } else {
                items.push({
                  id,
                  name: `${r.name} (${r.qty} ${r.unit})`,
                  baseName: r.name,
                  qty: r.qty,
                  unit: r.unit,
                  location: r.location,
                  status: "Fresh",
                  statusColor: "text-green-500",
                  category: inferCategory(r.name)
                });
              }
            });
          return { items };
        }),

      /* ----- Shopping ----- */
      shopping: initialShopping,
      setShopping: (next) => set({ shopping: next }),
      addRow: (row) =>
        set((state) => {
          const id = keyRow(row.name, row.unit, row.location);
          const exists = state.shopping.find((r) => r.id === id);
          if (exists) {
            return {
              shopping: state.shopping.map((r) =>
                r.id === id ? { ...r, qty: r.qty + row.qty } : r
              )
            };
          } else {
            return { shopping: [...state.shopping, { ...row, id }] };
          }
        }),
      updateQty: (id, delta) =>
        set((state) => ({
          shopping: state.shopping.map((r) =>
            r.id === id ? { ...r, qty: clamp(r.qty + delta, 0, 999999) } : r
          )
        })),
      togglePurchased: (id) =>
        set((state) => ({
          shopping: state.shopping.map((r) =>
            r.id === id ? { ...r, purchased: !r.purchased } : r
          )
        })),
      changeLoc: (id, loc) =>
        set((state) => ({
          shopping: state.shopping.map((r) =>
            r.id === id ? { ...r, location: loc, id: keyRow(r.name, r.unit, loc) } : r
          )
        })),
      removeRow: (id) =>
        set((state) => ({
          shopping: state.shopping.filter((r) => r.id !== id)
        })),
      finalizePurchase: () => {
        const rows = get().shopping;
        get().mergePurchase(rows);
        set((state) => ({
          shopping: state.shopping.map((r) =>
            r.purchased ? { ...r, purchased: false, qty: 0 } : r
          )
        }));
      },

      /* ----- History ----- */
      history: [],
      addCook: (recipeName) =>
        set((state) => ({
          history: [{ recipe: recipeName, ts: Date.now() }, ...state.history].slice(0, 200)
        })),
      clearHistory: () => set({ history: [] }),

      /* ----- Prefs ----- */
      prefs: initialPrefs,
      setTheme: (t) => set((s) => ({ prefs: { ...s.prefs, theme: t } })),
      setFilter: (f) => set((s) => ({ prefs: { ...s.prefs, filter: f } })),
      setSort: (sort) => set((s) => ({ prefs: { ...s.prefs, sort } })),
      toggleFavorite: (name) =>
        set((s) => {
          const exists = s.prefs.favorites.includes(name);
          const favorites = exists
            ? s.prefs.favorites.filter((n) => n !== name)
            : [...s.prefs.favorites, name];
          return { prefs: { ...s.prefs, favorites } };
        }),
      setGoals: (g) =>
        set((s) => ({ prefs: { ...s.prefs, goals: { ...s.prefs.goals, ...g } } }))
    }),
    {
      name: "sp:store",
      version: STORE_VERSION,
      storage: createJSONStorage(() => storage),
      migrate,
      partialize: (s) => ({
        items: s.items,
        shopping: s.shopping,
        history: s.history,
        prefs: s.prefs
      })
    }
  )
);

/* ===================== Selectores útiles ===================== */
export const selectors = {
  items: (s: AppState) => s.items,
  shopping: (s: AppState) => s.shopping,
  history: (s: AppState) => s.history,
  prefs: (s: AppState) => s.prefs,
  favoritesSet: (s: AppState) => new Set(s.prefs.favorites)
};
