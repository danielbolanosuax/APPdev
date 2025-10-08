import React from "react";
import {
  ListChecks,
  ChefHat,
  ShoppingCart,
  BarChart,
  Settings,
  Search,
} from "lucide-react";

type TabKey = "inventory" | "recipes" | "shopping" | "analytics" | "settings";

export default function AppShell({
  activeTab,
  setActiveTab,
  globalSearch,
  setGlobalSearch,
  children,
}: {
  activeTab: TabKey;
  setActiveTab: (t: TabKey) => void;
  globalSearch: string;
  setGlobalSearch: (s: string) => void;
  children: React.ReactNode;
}) {
  const items = [
    { k: "inventory", label: "Inventory", icon: <ListChecks className="w-5 h-5" /> },
    { k: "recipes", label: "Recipes", icon: <ChefHat className="w-5 h-5" /> },
    { k: "shopping", label: "Shopping", icon: <ShoppingCart className="w-5 h-5" /> },
    { k: "analytics", label: "Analytics", icon: <BarChart className="w-5 h-5" /> },
    { k: "settings", label: "Settings", icon: <Settings className="w-5 h-5" /> },
  ] as const;

  return (
    <div className="app-shell">
      {/* Header */}
      <header className="app-header-pro">
        <div className="brand">
          <div className="logo-dot" />
          <h1 className="brand-title">SmartPantry</h1>
        </div>

        <div className="search-wrap">
          <Search className="search-icon" />
          <input
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            className="search-input-lg"
            placeholder="Search inventory & recipes…"
            aria-label="Global search"
          />
        </div>
      </header>

      {/* Sidebar (desktop) */}
      <aside className="nav-rail">
        {items.map((it) => {
          const active = activeTab === it.k;
          return (
            <button
              key={it.k}
              className={`nav-rail-btn ${active ? "is-active" : ""}`}
              onClick={() => setActiveTab(it.k as any)}
              title={it.label}
              aria-current={active ? "page" : undefined}
            >
              {it.icon}
              <span className="label">{it.label}</span>
            </button>
          );
        })}
      </aside>

      {/* Main content */}
      <main className="app-main">{children}</main>

      {/* Bottom nav (mobile) */}
      <nav className="bottom-nav-pro">
        {items.map((it) => {
          const active = activeTab === it.k;
          return (
            <button
              key={it.k}
              className={`bottom-nav-btn ${active ? "is-active" : ""}`}
              onClick={() => setActiveTab(it.k as any)}
              aria-current={active ? "page" : undefined}
            >
              {it.icon}
              <span className="label">{it.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
