// src/main.tsx
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

// Hoja global con Tailwind + Design System
import "./styles.css";

// Tema por defecto: 'light' si aún no hay tema aplicado
const html = document.documentElement;
if (!html.classList.contains("light") && !html.classList.contains("dark")) {
  html.classList.add("light"); // compatible con tu Settings
}

// Montaje seguro
const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error("No se encontró el elemento #root en index.html");
}

createRoot(rootEl).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
