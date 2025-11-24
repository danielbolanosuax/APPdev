// src/App.tsx
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom"; // Por qué: toasts fuera del flujo → sin solapes
import AppShell from "./ui/AppShell";
import InventoryView from "./features/inventory/InventoryView";
import RecipesView from "./features/recipes/RecipesView";
import AnalyticsView from "./features/analytics/AnalyticsView";
import ShoppingView from "./features/shopping/ShoppingView";
import { useStore } from "./state/store";

type Theme = "light" | "dark" | "system";
type Tabs = "inventory" | "recipes" | "shopping" | "analytics" | "settings";
type StoreShape = {
  theme?: Theme;
  setTheme?: (t: Theme) => void;
  recipeOutput?: string | null;
};

function useToasts() {
  const [toasts, setToasts] = useState<Array<{ id: number; msg: string }>>([]);

  function add(msg: string) {
    const id = Date.now();
    setToasts((t) => [...t, { id, msg }]);
    // Por qué: autocierre corto, no invade la interacción
    window.setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 2200);
  }

  function View() {
    // Por qué: portal evita solapar tabs/overlays; pointer-events none evita bloquear clicks
    return createPortal(
      <div
        role="status"
        aria-live="polite"
        style={{
          position: "fixed",
          insetInline: 0,
          bottom: `calc(env(safe-area-inset-bottom) + var(--bottom-nav-h, 64px) + 8px)`,
          display: "grid",
          justifyItems: "center",
          gap: "8px",
          zIndex: 30, // usa var(--z-toast) si la tienes
          pointerEvents: "none",
          paddingInline: 12,
        }}
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className="surface border-subtle shadow-elev"
            style={{
              borderRadius: 14,
              padding: "8px 12px",
              fontSize: "0.9rem",
              maxWidth: "min(520px, 92vw)",
              pointerEvents: "auto",
            }}
          >
            {t.msg}
          </div>
        ))}
      </div>,
      document.body,
    );
  }

  return { add, View };
}

export default function App() {
  const toast = useToasts();
  const Toasts = toast.View;

  const [activeTab, setActiveTab] = useState<Tabs>("inventory");
  const [globalSearch, setGlobalSearch] = useState("");

  const themeFromStore: Theme = useStore((s) => (s as StoreShape).theme ?? "system");
  const setTheme = useStore((s) => (s as StoreShape).setTheme);
  const recipeOutput = useStore((s) => (s as StoreShape).recipeOutput ?? null);

  // Por qué: una sola fuente de verdad del tema (evita choques con main.tsx)
  useEffect(() => {
    (window as any).__setAppTheme?.(themeFromStore);
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
                      setTheme?.("light");
                      (window as any).__setAppTheme?.("light");
                      toast.add("Theme: Light");
                    }}
                    className="sp-btn sp-btn-ghost px-3 py-2"
                  >
                    Light
                  </button>
                  <button
                    onClick={() => {
                      setTheme?.("dark");
                      (window as any).__setAppTheme?.("dark");
                      toast.add("Theme: Dark");
                    }}
                    className="sp-btn sp-btn-ghost px-3 py-2"
                  >
                    Dark
                  </button>
                  <button
                    onClick={() => {
                      setTheme?.("system");
                      (window as any).__setAppTheme?.("system");
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
