import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import LoginView from './features/auth/LoginView';
import RegisterView from './features/auth/RegisterView';
import InventoryView from './features/inventory/InventoryView';
import RecipesView from './features/recipes/RecipesView';
import AnalyticsView from './features/analytics/AnalyticsView';
import ShoppingView from './features/shopping/ShoppingView';
import { useState } from 'react';
import AddItemModal from './features/inventory/AddItemModal';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

function AppLayout() {
  const { user, logout } = useAuth();
  const [currentView, setCurrentView] = useState<'inventory' | 'recipes' | 'analytics' | 'shopping'>('inventory');
  const [showAddModal, setShowAddModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleItemAdded = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">🏠 SmartPantry AI</h1>
              <span className="text-sm text-gray-500 hidden sm:inline">
                v2.0.0 Enterprise
              </span>
            </div>
            
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600 hidden sm:inline">
                👤 {user?.email}
              </span>
              <button
                onClick={logout}
                className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="mt-4 flex gap-2 flex-wrap">
            <button
              onClick={() => setCurrentView('inventory')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                currentView === 'inventory'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              📦 Inventario
            </button>
            <button
              onClick={() => setCurrentView('recipes')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                currentView === 'recipes'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              🍳 Recetas
            </button>
            <button
              onClick={() => setCurrentView('shopping')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                currentView === 'shopping'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              🛒 Compras
            </button>
            <button
              onClick={() => setCurrentView('analytics')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                currentView === 'analytics'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              📊 Estadísticas
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {currentView === 'inventory' && (
          <div>
            <div className="mb-6 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Mi Inventario</h2>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-md transition font-semibold"
              >
                ➕ Agregar Item
              </button>
            </div>
            <InventoryView key={refreshKey} />
          </div>
        )}
        
        {currentView === 'recipes' && <RecipesView />}
        {currentView === 'shopping' && <ShoppingView />}
        {currentView === 'analytics' && <AnalyticsView />}
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
        <div className="max-w-7xl mx-auto px-4 py-6 text-center">
          <p className="text-sm text-gray-600">
            SmartPantry AI Enterprise v2.0.0 - Gestión inteligente de despensa familiar
          </p>
          <p className="text-xs text-gray-500 mt-2">
            🔒 Conexión segura | 🚀 Production Ready | 📱 Responsive Design
          </p>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginView />} />
      <Route path="/register" element={<RegisterView />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
