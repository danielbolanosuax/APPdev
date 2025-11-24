import { useState } from "react";
import InventoryView from "./features/inventory/InventoryView";
import AddItemModal from "./features/inventory/AddItemModal";
import RecipesView from "./features/recipes/RecipesView";
import "./styles.css";

export default function App() {
  const [currentView, setCurrentView] = useState<"inventory" | "recipes" | "analytics">(
    "inventory",
  );
  const [showAddModal, setShowAddModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleItemAdded = () => {
    setRefreshKey((prev) => prev + 1); // Force refresh
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">🏠 SmartPantry AI</h1>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentView("inventory")}
                className={`px-4 py-2 rounded ${
                  currentView === "inventory"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 hover:bg-gray-300"
                }`}
              >
                📦 Inventario
              </button>
              <button
                onClick={() => setCurrentView("recipes")}
                className={`px-4 py-2 rounded ${
                  currentView === "recipes"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 hover:bg-gray-300"
                }`}
              >
                🍳 Recetas
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {currentView === "inventory" && (
          <div>
            <div className="mb-4">
              <button
                onClick={() => setShowAddModal(true)}
                className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 shadow"
              >
                ➕ Agregar Item
              </button>
            </div>
            <InventoryView key={refreshKey} />
          </div>
        )}

        {currentView === "recipes" && <RecipesView />}
      </main>

      {/* Add Item Modal */}
      {showAddModal && (
        <AddItemModal
          onClose={() => setShowAddModal(false)}
          onItemAdded={() => {
            handleItemAdded();
            setShowAddModal(false);
          }}
        />
      )}

      {/* Footer */}
      <footer className="bg-white border-t mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-4 text-center text-gray-600 text-sm">
          <p>SmartPantry AI v2.0.0 - Gestión inteligente de despensa familiar</p>
          <p className="mt-1">
            Backend: <span className="text-green-600">●</span> Conectado | API:{" "}
            <a
              href="http://localhost:8000/docs"
              target="_blank"
              className="text-blue-500 hover:underline"
            >
              Documentación
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
