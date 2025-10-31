import { Recipe } from "../types.js";

export const RECIPE_DB: Recipe[] = [
  {
    id: "tortilla-patata",
    title: "Tortilla de patata jugosa",
    ingredients: ["patatas", "huevos", "cebolla", "aceite de oliva", "sal"],
    steps: [
      "Pelar y cortar patatas finas; pochar con cebolla en aceite suave.",
      "Batir huevos con sal; mezclar con patata escurrida.",
      "Cuajar a fuego medio; girar y dar el punto.",
    ],
    time_minutes: 35,
    servings: 4,
    allergens: ["huevo"],
    tags: ["clásico", "sin gluten"],
  },
  {
    id: "pisto-rapido",
    title: "Pisto rápido con huevo",
    ingredients: ["calabacin", "pimiento", "cebolla", "tomate triturado", "huevo", "aceite", "sal"],
    steps: [
      "Pochar verduras en dados.",
      "Añadir tomate y reducir.",
      "Servir con huevo a la plancha.",
    ],
    time_minutes: 30,
    servings: 2,
    allergens: ["huevo"],
    tags: ["vegetariano"],
  },
  {
    id: "garbanzos-espinacas",
    title: "Garbanzos con espinacas y pimentón",
    ingredients: ["garbanzos cocidos", "espinacas", "ajo", "pimenton", "aceite", "sal", "comino"],
    steps: [
      "Dorar ajo; añadir pimentón sin quemar.",
      "Agregar espinacas hasta que caigan.",
      "Incorporar garbanzos y comino; ajustar sal.",
    ],
    time_minutes: 18,
    servings: 2,
    tags: ["vegano", "rápido"],
  },
];
