import React from "react";
import { LayoutGrid, Search, Settings } from "lucide-react";

type Tab = "inventory" | "recipes" | "shopping" | "analytics" | "settings";

type Props = {
  activeTab: Tab;
  setActiveTab: (t: Tab) => void;
  globalSearch: string;
  setGlobalSearch: (v: string) => void;
  children: React.ReactNode;
};

export default function AppShell({
  activeTab,
  setActiveTab,
  globalSearch,
  setGlobalSearch,
  children,
}: Props) {
  return (
    <div className="app-shell">
      <header className="appbar">
        <div className="left">
          <LayoutGrid className="w-5 h-5" />
          <span className="brand">SmartPantry AI</span>
        </div>
        <div className="center">
          <div className="tool search">
            <Search className="tool-icon" />
            <input
              value={globalSearch}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGlobalSearch(e.target.value)}
              className="search-input"
              placeholder="Search…"
              aria-label="Search"
            />
          </div>
        </div>
        <div className="right">
          <button
            className={`tab ${activeTab === "settings" ? "on" : ""}`}
            onClick={() => setActiveTab("settings")}
            aria-label="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      <nav className="tabs">
        {(["inventory", "recipes", "shopping", "analytics"] as Tab[]).map((t) => (
          <button
            key={t}
            className={`tab ${activeTab === t ? "on" : ""}`}
            onClick={() => setActiveTab(t)}
          >
            {t}
          </button>
        ))}
      </nav>

      <main className="content">{children}</main>
    </div>
  );
}
