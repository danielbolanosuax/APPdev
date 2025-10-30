import React, { useEffect, useState } from "react";
import AppShell from "./ui/AppShell";
import InventoryView from "./features/inventory/InventoryView";
import RecipesView from "./features/recipes/RecipesView";
import AnalyticsView from "./features/analytics/AnalyticsView";
import ShoppingView from "./features/shopping/ShoppingView";
import { useStore } from "./state/store";

type Theme = "light" | "dark" | "system";
type StoreShape = {
  theme?: Theme;
  setTheme?: (t: Theme) => void;
  recipeOutput?: string | null;
};

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

  const [activeTab, setActiveTab] = useState<
    "inventory" | "recipes" | "shopping" | "analytics" | "settings"
  >("inventory");
  const [globalSearch, setGlobalSearch] = useState("");

  const themeFromStore: Theme = useStore((s) => (s as StoreShape).theme ?? "system");
  const setTheme = useStore((s) => (s as StoreShape).setTheme);
  const recipeOutput = useStore((s) => (s as StoreShape).recipeOutput ?? null);

  useEffect(() => {
    const root = document.documentElement;
    const prefersDark =
      window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (themeFromStore === "light") root.classList.add("light");
    else if (themeFromStore === "dark") root.classList.remove("light");
    else root.classList.toggle("light", !prefersDark);
  }, [themeFromStore]);

  useEffect(() => {
    if (recipeOutput) setActiveTab("recipes");
  }, [recipeOutput]);

  return (
    <>
      <AppShell
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        globalSearch={globalSearch}
        setGlobalSearch={setGlobalSearch}
      >
        {activeTab === "inventory" && <InventoryView />}
        {activeTab === "recipes" && <RecipesView />}
        {activeTab === "shopping" && <ShoppingView />}
        {activeTab === "analytics" && <AnalyticsView />}

        {activeTab === "settings" && (
          <section className="sp-card p-4 sp-card-lg">
            <h2 className="section-title">Settings</h2>
            <div className="grid md:grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl border-subtle surface p-3">
                <p className="font-semibold">Appearance</p>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    onClick={() => {
                      document.documentElement.classList.add("light");
                      setTheme?.("light");
                      toast.add("Theme: Light");
                    }}
                    className="sp-btn sp-btn-ghost px-3 py-2"
                  >
                    Light
                  </button>
                  <button
                    onClick={() => {
                      document.documentElement.classList.remove("light");
                      setTheme?.("dark");
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
                      setTheme?.("system");
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
      </AppShell>

      <Toasts />
    </>
  );
}
