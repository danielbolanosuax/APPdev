import React, { useRef, useState } from "react";
import {
  ListChecks,
  ShoppingCart,
  ChefHat,
  BarChart,
  Settings,
  Search,
} from "lucide-react";
import { useStore, selectors } from "./state/store";
import InventoryView from "./features/inventory/InventoryView";
import RecipesView from "./features/recipes/RecipesView";
import AnalyticsView from "./features/analytics/AnalyticsView";
import ShoppingView from "./features/shopping/ShoppingView";

function useToasts() {
  const [toasts, setToasts] = useState<{ id: number; msg: string }[]>([]);
  const add = (msg: string) => {
    const id = Date.now();
    setToasts((t) => [...t, { id, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2200);
  };
  const View = () => (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 space-y-2">
      {toasts.map((t) => (
        <div key={t.id} className="px-4 py-2 rounded-xl surface border-subtle text-sm shadow-elev">
          {t.msg}
        </div>
      ))}
    </div>
  );
  return { add, View };
}

export default function App() {
  const toast = useToasts();
  const Toasts = toast.View;

  const items = useStore(selectors.items);
  const setTheme = useStore((s) => s.setTheme);

  const [activeTab, setActiveTab] = useState<
    "inventory" | "recipes" | "shopping" | "analytics" | "settings"
  >("inventory");
  const [globalSearch, setGlobalSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  return (
    <div className="min-h-screen flex flex-col">
      {/* TOPBAR */}
      <header className="sticky top-0 z-40">
        <div className="mx-auto max-w-5xl px-4 py-3 app-topbar">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div
                className="size-8 rounded-xl"
                style={{ background: "color-mix(in oklab, var(--brand) 22%, transparent)" }}
              />
              <h1 className="text-lg font-extrabold tracking-wide">SmartPantry AI</h1>
            </div>
            <div className="flex-1" />
            <div className="relative w-[46%] min-w-[240px]">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted" />
              <input
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                placeholder="Buscar inventario y recetas…"
                className="search-input"
                aria-label="Global search"
                ref={searchRef}
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
          {activeTab === "inventory" && <InventoryView />}

          {activeTab === "recipes" && <RecipesView />}

          {activeTab === "shopping" && <ShoppingView />}

          {activeTab === "analytics" && <AnalyticsView />}

          {activeTab === "settings" && (
            <section className="sp-card p-4 sp-card-lg">
              <h2 className="text-lg font-extrabold mb-2 flex items-center gap-2">
                <Settings className="w-5 h-5" style={{ color: "var(--brand)" }} /> Settings
              </h2>
              <div className="grid md:grid-cols-2 gap-3 text-sm">
                <div className="rounded-2xl border-subtle surface p-3">
                  <p className="font-semibold">Appearance</p>
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      onClick={() => {
                        document.documentElement.classList.add("light");
                        setTheme("light");
                        toast.add("Theme: Light");
                      }}
                      className="sp-btn sp-btn-ghost px-3 py-2"
                    >
                      Light
                    </button>
                    <button
                      onClick={() => {
                        document.documentElement.classList.remove("light");
                        setTheme("dark");
                        toast.add("Theme: Dark");
                      }}
                      className="sp-btn sp-btn-ghost px-3 py-2"
                    >
                      Dark
                    </button>
                    <button
                      onClick={() => {
                        const prefersDark =
                          window.matchMedia &&
                          window.matchMedia("(prefers-color-scheme: dark)").matches;
                        document.documentElement.classList.toggle("light", !prefersDark);
                        setTheme("system");
                        toast.add("Theme: System");
                      }}
                      className="sp-btn sp-btn-ghost px-3 py-2"
                    >
                      System
                    </button>
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>
      </main>

      <Toasts />
    </div>
  );
}
