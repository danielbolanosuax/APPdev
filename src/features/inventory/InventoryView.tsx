import { useState, useEffect } from "react";
import { api } from "../../services/api";

interface Item {
  id: number;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  expiration_date?: string;
  created_at: string;
}

export default function InventoryView() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar items del backend
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
      setError("Error al cargar items");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async (id: number) => {
    if (!confirm("¿Eliminar este item?")) return;

    try {
      await api.deleteItem(id);
      await loadItems(); // Recargar lista
    } catch (err) {
      alert("Error al eliminar item");
      console.error(err);
    }
  };

  if (loading) {
    return <div className="p-4">Cargando inventario...</div>;
  }

  if (error) {
    return (
      <div className="p-4 text-red-600">
        {error}
        <button onClick={loadItems} className="ml-4 px-4 py-2 bg-blue-500 text-white rounded">
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Inventario ({items.length})</h1>
        <button
          onClick={loadItems}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Actualizar
        </button>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No hay items en el inventario</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div key={item.id} className="border rounded-lg p-4 shadow hover:shadow-lg transition">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-lg">{item.name}</h3>
                  <p className="text-gray-600 text-sm">{item.category}</p>
                </div>
                <button
                  onClick={() => handleDeleteItem(item.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  🗑️
                </button>
              </div>

              <div className="mt-3">
                <p className="text-lg font-semibold">
                  {item.quantity} {item.unit}
                </p>
                {item.expiration_date && (
                  <p className="text-sm text-gray-500 mt-1">
                    Expira: {new Date(item.expiration_date).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
