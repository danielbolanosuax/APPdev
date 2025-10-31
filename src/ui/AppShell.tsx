// FILE: src/ui/AppShell.tsx
import React from "react";
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

const TABS: { key: Tab; label: string; Icon: React.ComponentType<any> }[] = [
  { key: "inventory", label: "Inventory", Icon: Boxes },
  { key: "recipes", label: "Recipes", Icon: ChefHat },
  { key: "shopping", label: "Shopping", Icon: ShoppingBasket },
  { key: "analytics", label: "Analytics", Icon: BarChart3 },
];

export default function AppShell({
  activeTab,
  setActiveTab,
  globalSearch,
  setGlobalSearch,
  children,
}: Props) {
  return (
    <div className="app-shell">
      <header className="appbar surface border-subtle">
        <div className="sp-container appbar-row">
          <div className="appbar-left">
            <span className="brand-dot" />
            <span className="brand">
              SmartPantry&nbsp;<b>AI</b>
            </span>
          </div>

          <div className="appbar-center">
            <div className="tool search search-lg">
              <SearchIcon className="tool-icon" />
              <input
                value={globalSearch}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setGlobalSearch(e.target.value)
                }
                className="search-input"
                placeholder="Search…"
                aria-label="Search"
              />
            </div>
          </div>

          <div className="appbar-right">
            <button
              className={`tab-ghost ${activeTab === "settings" ? "on" : ""}`}
              onClick={() => setActiveTab("settings")}
              title="Settings"
              aria-label="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <nav className="tabs-bar">
        <div className="sp-container tabs-row">
          {TABS.map(({ key, label, Icon }) => (
            <button
              key={key}
              className={`tab-pill ${activeTab === key ? "on" : ""}`}
              onClick={() => setActiveTab(key)}
              aria-current={activeTab === key ? "page" : undefined}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </nav>

      <main className="content">
        <div className="sp-container">{children}</div>
      </main>
    </div>
  );
}
