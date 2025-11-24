import { useState, useEffect } from "react";
import { api } from "../../services/api";

interface Recipe {
  id: number;
  name: string;
  ingredients: string[];
  instructions: string[];
  prep_time: number;
  difficulty: string;
  match_percentage?: number;
}

export default function RecipesView() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRecipes();
  }, []);

  const loadRecipes = async () => {
    try {
      setLoading(true);
      const data = await api.getRecipes();
      setRecipes(data);
      setError(null);
    } catch (err) {
      setError("Error al cargar recetas");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-4">Cargando recetas...</div>;
  }

  if (error) {
    return (
      <div className="p-4 text-red-600">
        {error}
        <button onClick={loadRecipes} className="ml-4 px-4 py-2 bg-blue-500 text-white rounded">
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Recetas Sugeridas</h1>
        <button
          onClick={loadRecipes}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Actualizar
        </button>
      </div>

      {recipes.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No hay recetas disponibles</div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {recipes.map((recipe) => (
            <div
              key={recipe.id}
              className="border rounded-lg p-6 shadow hover:shadow-lg transition"
            >
              <h3 className="font-bold text-xl mb-2">{recipe.name}</h3>

              <div className="flex gap-4 text-sm text-gray-600 mb-4">
                <span>⏱️ {recipe.prep_time} min</span>
                <span>📊 {recipe.difficulty}</span>
                {recipe.match_percentage && (
                  <span className="text-green-600 font-semibold">
                    {recipe.match_percentage}% match
                  </span>
                )}
              </div>

              <div className="mb-4">
                <p className="font-semibold mb-2">Ingredientes:</p>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {recipe.ingredients.slice(0, 5).map((ing, idx) => (
                    <li key={idx}>{ing}</li>
                  ))}
                  {recipe.ingredients.length > 5 && (
                    <li className="text-gray-500">+{recipe.ingredients.length - 5} más...</li>
                  )}
                </ul>
              </div>

              <button className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">
                Ver Receta Completa
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
