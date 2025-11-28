import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Filter,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import AddItemModal from "./AddItemModal";
import { api } from "../../services/api";

type ProductStatus = "ok" | "low" | "expiring";

interface Item {
  id: number;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  expiration_date?: string;
  created_at: string;
}

const statusStyles: Record<
  ProductStatus,
  { label: string; icon: typeof CheckCircle2; className: string }
> = {
  ok: {
    label: "Disponible",
    icon: CheckCircle2,
    className: "bg-green-100 text-green-700 border-green-200",
  },
  low: {
    label: "Poco stock",
    icon: AlertCircle,
    className: "bg-yellow-100 text-yellow-700 border-yellow-200",
  },
  expiring: {
    label: "Caduca pronto",
    icon: Clock3,
    className: "bg-red-100 text-red-700 border-red-200",
  },
};

function getDaysUntilExpiration(expiration?: string) {
  if (!expiration) return null;
  const date = new Date(expiration);
  if (Number.isNaN(date.getTime())) return null;
  const diffMs = date.getTime() - Date.now();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

function getStatus(item: Item): ProductStatus {
  const daysUntil = getDaysUntilExpiration(item.expiration_date);
  if (daysUntil !== null && daysUntil <= 5) return "expiring";
  if (item.quantity <= 1) return "low";
  return "ok";
}

function formatExpiration(expiration?: string) {
  if (!expiration) return "Sin fecha de caducidad";
  const date = new Date(expiration);
  if (Number.isNaN(date.getTime())) return "Fecha no valida";
  return `Caduca: ${date.toLocaleDateString()}`;
}

function initials(name: string) {
  return name.trim().charAt(0).toUpperCase() || "?";
}

export default function InventoryView() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      setLoading(true);
      const data = await api.getItems();
      setItems(data);
      setError(null);
    } catch (err) {
      setError("Error al cargar el inventario");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async (id: number) => {
    if (!confirm("Eliminar este item?")) return;

    try {
      await api.deleteItem(id);
      await loadItems();
    } catch (err) {
      alert("Error al eliminar item");
      console.error(err);
    }
  };

  const categories = useMemo(() => {
    const unique = Array.from(new Set(items.map((item) => item.category || "Sin categoria")));
    return ["Todos", ...unique];
  }, [items]);

  const filteredItems = useMemo(
    () =>
      items.filter((item) => {
        const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === "Todos" || item.category === selectedCategory;
        return matchesSearch && matchesCategory;
      }),
    [items, searchQuery, selectedCategory],
  );

  const renderCards = () => {
    if (loading) {
      return (
        <div className="grid gap-4">
          {[...Array(4).keys()].map((key) => (
            <div
              key={key}
              className="h-28 bg-white rounded-3xl shadow-sm border border-gray-100 animate-pulse"
            />
          ))}
        </div>
      );
    }

    if (filteredItems.length === 0) {
      return (
        <div className="text-center py-12 text-gray-500 bg-white rounded-3xl border border-dashed border-gray-200">
          No hay items que coincidan con tu busqueda
        </div>
      );
    }

    return (
      <div className="grid gap-4">
        {filteredItems.map((item) => {
          const status = getStatus(item);
          const StatusIcon = statusStyles[status].icon;
          return (
            <div
              key={item.id}
              className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-4">
                <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gradient-to-br from-emerald-50 to-emerald-100 text-emerald-700 font-semibold flex items-center justify-center">
                  {initials(item.name)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-gray-900 font-semibold leading-snug">{item.name}</h3>
                      <p className="text-gray-500 mt-1 text-sm">
                        {item.category || "Sin categoria"}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full border whitespace-nowrap ${statusStyles[status].className}`}
                    >
                      <StatusIcon className="w-3.5 h-3.5" />
                      {statusStyles[status].label}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <div>
                      <p className="text-gray-900 font-semibold">
                        {item.quantity} {item.unit}
                      </p>
                      <p className="text-gray-400 mt-1 text-sm">
                        {formatExpiration(item.expiration_date)}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="text-gray-400 hover:text-red-500 transition"
                      title="Eliminar"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {isAddModalOpen && (
        <AddItemModal onClose={() => setIsAddModalOpen(false)} onItemAdded={loadItems} />
      )}

      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            placeholder="Buscar en tu despensa..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-2xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <Filter className="w-4 h-4 text-gray-500 flex-shrink-0" />
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-full whitespace-nowrap transition-all ${
                selectedCategory === category
                  ? "bg-emerald-500 text-white shadow-md"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-100"
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 border border-red-100 rounded-2xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
          <button
            onClick={loadItems}
            className="text-sm font-medium text-red-700 underline underline-offset-4"
          >
            Reintentar
          </button>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Inventario</h1>
            <p className="text-sm text-gray-500">
              {filteredItems.length} {filteredItems.length === 1 ? "producto" : "productos"}
            </p>
          </div>
          <button
            onClick={loadItems}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-xl border border-gray-200 bg-white hover:bg-gray-100"
          >
            <RefreshCw className="w-4 h-4" />
            Actualizar
          </button>
        </div>

        {renderCards()}
      </div>

      <button
        onClick={() => setIsAddModalOpen(true)}
        className="fixed bottom-24 right-6 w-14 h-14 rounded-full shadow-lg bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white flex items-center justify-center"
        aria-label="Agregar item"
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
}
