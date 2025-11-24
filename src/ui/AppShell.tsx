// FILE: src/ui/AppShell.tsx
import React, { useEffect, useMemo, useRef } from "react";
import {
  Boxes,
  ChefHat,
  ShoppingBasket,
  BarChart3,
  Settings,
  Search as SearchIcon,
} from "lucide-react";

type Tab = "inventory" | "recipes" | "shopping" | "analytics" | "settings";

type Props = {
  activeTab: Tab;
  setActiveTab: (t: Tab) => void;
  globalSearch: string;
  setGlobalSearch: (v: string) => void;
  children: React.ReactNode;
};

const TABS: { key: Exclude<Tab, "settings">; label: string; Icon: React.ComponentType<any> }[] = [
  { key: "inventory", label: "Inventory", Icon: Boxes },
  { key: "recipes", label: "Recipes", Icon: ChefHat },
  { key: "shopping", label: "Shopping", Icon: ShoppingBasket },
  { key: "analytics", label: "Analytics", Icon: BarChart3 },
];

/** Por qué: garantizamos que main no quede tapado por header/bottom-nav en ningún viewport. */
function useHeightVar(ref: React.RefObject<HTMLElement>, cssVar: string) {
  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const root = document.documentElement;
    const ro = new ResizeObserver(() => {
      root.style.setProperty(cssVar, `${el.getBoundingClientRect().height}px`);
    });
    ro.observe(el);
    // Primera medición inmediata
    root.style.setProperty(cssVar, `${el.getBoundingClientRect().height}px`);
    return () => ro.disconnect();
  }, [ref, cssVar]);
}

export default function AppShell({
  activeTab,
  setActiveTab,
  globalSearch,
  setGlobalSearch,
  children,
}: Props) {
  const headerRef = useRef<HTMLElement>(null);
  const navRef = useRef<HTMLElement>(null);
  useHeightVar(headerRef, "--appbar-h");
  useHeightVar(navRef, "--bottom-nav-h");

  const tabOrder = useMemo(() => TABS.map((t) => t.key), []);
  const onTabsKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const currentIndex = tabOrder.indexOf(activeTab as any);
    if (currentIndex < 0) return;
    const move = (idx: number) => {
      const key = tabOrder[(idx + tabOrder.length) % tabOrder.length];
      setActiveTab(key as Tab);
      // Foco al botón activo para lector de pantalla/teclado
      const btn = document.querySelector<HTMLButtonElement>(`button[data-tab="${key}"]`);
      btn?.focus();
    };
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        e.preventDefault();
        move(currentIndex + 1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        e.preventDefault();
        move(currentIndex - 1);
        break;
      case "Home":
        e.preventDefault();
        move(0);
        break;
      case "End":
        e.preventDefault();
        move(tabOrder.length - 1);
        break;
      default:
        break;
    }
  };

  return (
    <div
      className="app-shell"
      style={{
        minHeight: "100dvh", // evita solapes por viewports móviles
        paddingTop: "calc(var(--appbar-h, 56px) + env(safe-area-inset-top))",
        paddingBottom:
          "calc(var(--bottom-nav-h, 64px) + env(safe-area-inset-bottom))",
      }}
    >
      {/* App Bar */}
      <header
        ref={headerRef}
        className="appbar surface border-subtle"
        style={{
          position: "fixed", // evita salto de layout al hacer scroll
          top: 0,
          insetInline: 0,
          zIndex: 20, // por debajo de modales/toasts
          paddingTop: "env(safe-area-inset-top)",
        }}
      >
        <div className="sp-container appbar-row" style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 12 }}>
          <div className="appbar-left" style={{ minHeight: 44, display: "flex", alignItems: "center", gap: 8 }}>
            <span aria-hidden className="brand-dot" />
            <span className="brand">
              SmartPantry&nbsp;<b>AI</b>
            </span>
          </div>

          <div className="appbar-center">
            <div className="tool search search-lg" role="search" aria-label="Global search">
              <SearchIcon className="tool-icon" aria-hidden />
              <input
                type="search"
                inputMode="search"
                value={globalSearch}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGlobalSearch(e.target.value)}
                className="search-input"
                placeholder="Search…"
                aria-label="Search"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
            </div>
          </div>

          <div className="appbar-right" style={{ display: "flex", justifyContent: "end" }}>
            <button
              type="button"
              className={`tab-ghost ${activeTab === "settings" ? "on" : ""}`}
              data-tab="settings"
              onClick={() => setActiveTab("settings")}
              title="Settings"
              aria-label="Settings"
              aria-current={activeTab === "settings" ? "page" : undefined}
              style={{ minInlineSize: 44, minBlockSize: 44, borderRadius: 12 }}
            >
              <Settings className="w-5 h-5" aria-hidden />
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="content">
        <div className="sp-container">{children}</div>
      </main>

      {/* Bottom Tabs */}
      <nav
        ref={navRef}
        className="tabs-bar"
        aria-label="Primary"
        style={{
          position: "fixed",
          bottom: 0,
          insetInline: 0,
          zIndex: 15,
          paddingBottom: "env(safe-area-inset-bottom)",
          background: "inherit",
          backdropFilter: "saturate(180%) blur(8px)", // suaviza, sin tapar
        }}
      >
        <div
          className="sp-container tabs-row"
          role="tablist"
          aria-orientation="horizontal"
          onKeyDown={onTabsKeyDown}
          style={{ display: "grid", gridAutoFlow: "column", gap: 8 }}
        >
          {TABS.map(({ key, label, Icon }) => {
            const active = activeTab === key;
            return (
              <button
                key={key}
                type="button"
                data-tab={key}
                role="tab"
                aria-selected={active}
                aria-current={active ? "page" : undefined}
                className={`tab-pill ${active ? "on" : ""}`}
                onClick={() => setActiveTab(key)}
                style={{
                  minInlineSize: 44,
                  minBlockSize: 44, // tap target mínimo → anti-solape táctil
                  borderRadius: 14,
                }}
              >
                <Icon className="w-4 h-4" aria-hidden />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
