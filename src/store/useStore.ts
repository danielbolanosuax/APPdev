import { create } from "zustand";

// Definimos la estructura de un alimento en el inventario
interface FoodItem {
  name: string;
  calories?: number; // calorías (por 100g o por porción, según datos disponibles)
  nutriScore?: string; // letra de Nutri-Score (ej: "A", "B", ...), si está disponible
}

// Definimos la estructura del estado global de la aplicación
interface AppState {
  inventory: FoodItem[]; // Lista de alimentos en el inventario (escaneados o añadidos manualmente)
  searchResults: FoodItem[]; // Resultados de búsqueda (no usado en MVP, preparado para futuras búsquedas)
  theme: "light" | "dark"; // Tema visual actual
  recipeOutput: string | null; // Texto de la receta generada por el LLM (null si no hay receta visible)
  // Acciones para modificar el estado:
  addFood: (item: FoodItem) => void;
  setSearchResults: (results: FoodItem[]) => void;
  toggleTheme: () => void;
  generateRecipe: () => Promise<void>;
  setRecipeOutput: (text: string | null) => void;
}

// Crear el store global de Zustand
export const useStore = create<AppState>((set, get) => ({
  // Estado inicial
  inventory: [], // Inventario vacío por defecto (sin alimentos predefinidos al iniciar)
  searchResults: [], // Sin resultados de búsqueda iniciales
  theme: "light", // Tema por defecto: claro
  recipeOutput: null, // Sin receta generada inicialmente

  // Implementación de acciones:
  addFood: (item) => {
    set((state) => ({
      inventory: [...state.inventory, item],
    }));
  },

  setSearchResults: (results) => {
    set({ searchResults: results });
  },

  toggleTheme: () => {
    set((state) => ({
      theme: state.theme === "light" ? "dark" : "light",
    }));
  },

  generateRecipe: async () => {
    const state = get();
    if (state.inventory.length === 0) {
      // Si no hay ingredientes en el inventario, no generamos nada
      set({ recipeOutput: "No hay ingredientes en el inventario para generar una receta." });
      return;
    }
    // Construir el prompt para el modelo LLM usando los nombres de ingredientes actuales
    const ingredientsList = state.inventory.map((item) => item.name).join(", ");
    const prompt = `Genera una receta creativa en español utilizando estos ingredientes: ${ingredientsList}.`;

    try {
      // Establecer un mensaje inicial mientras se obtiene la respuesta del LLM
      set({ recipeOutput: "Generando receta..." });
      // Llamar a la API local de Ollama para generar la respuesta
      const response = await fetch("http://localhost:11434/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "llama2", // Modelo LLM a usar (asegúrate de tener este modelo cargado en Ollama)
          prompt: prompt,
          stream: false, // Deshabilitamos streaming para obtener la respuesta completa de una vez
        }),
      });
      const data = await response.json();
      // Extraer el texto de la receta de la respuesta del modelo
      const recipeText = data.response || "No se obtuvo respuesta del modelo.";
      // Actualizar el estado con la receta generada
      set({ recipeOutput: recipeText });
    } catch (error) {
      console.error("Error generando la receta:", error);
      set({ recipeOutput: "Error al generar la receta. Intenta de nuevo." });
    }
  },

  setRecipeOutput: (text) => {
    set({ recipeOutput: text });
  },
}));
