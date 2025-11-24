// src/main.tsx
import React, { StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";

/** Por qué: persistencia + sistema = cero parpadeos y UI coherente. */
const THEME_KEY = "smartpantry:theme";
type ThemePref = "light" | "dark" | "system";
type EffectiveTheme = "light" | "dark";

function prefersDark(): boolean {
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
}

function resolveTheme(pref: ThemePref): EffectiveTheme {
  return pref === "system" ? (prefersDark() ? "dark" : "light") : pref;
}

function setThemeMetaColor(theme: EffectiveTheme): void {
  const light = "#16a34a";
  const dark = "#0b6e3e";
  const color = theme === "dark" ? dark : light;
  // Por qué: barra de estado coherente en iOS/Android.
  const metas = Array.from(document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]'));
  if (metas.length) metas.forEach((m) => (m.content = color));
}

function applyTheme(theme: EffectiveTheme): void {
  const html = document.documentElement;
  // Por qué: una sola clase → evita estilos en conflicto/solapes por temas mezclados.
  html.classList.remove("light", "dark");
  html.classList.add(theme);
  html.style.colorScheme = theme;
  setThemeMetaColor(theme);
}

function getStoredPref(): ThemePref | null {
  const raw = localStorage.getItem(THEME_KEY);
  if (raw === "light" || raw === "dark" || raw === "system") return raw;
  return null;
}

function savePref(pref: ThemePref): void {
  try {
    localStorage.setItem(THEME_KEY, pref);
  } catch {
    /* Por qué: entornos privados pueden bloquear localStorage */
  }
}

/** Inicializa tema sin parpadeos: respeta guardado o cae a light si nada existe. */
function setupTheme(): void {
  const stored = getStoredPref();
  const pref: ThemePref = stored ?? "light";
  applyTheme(resolveTheme(pref));

  // Reaccionar si el usuario cambia el tema del SO (sólo si usa 'system').
  const mql = window.matchMedia?.("(prefers-color-scheme: dark)");
  const mediaListener = () => {
    if ((getStoredPref() ?? "light") === "system") {
      applyTheme(resolveTheme("system"));
    }
  };
  try {
    mql?.addEventListener?.("change", mediaListener);
  } catch {
    // Safari viejo
    mql?.addListener?.(mediaListener);
  }

  // Sincronizar entre pestañas.
  window.addEventListener("storage", (e) => {
    if (e.key === THEME_KEY) applyTheme(resolveTheme(getStoredPref() ?? "light"));
  });

  // Exponer helper opcional para tu Settings UI.
  (window as any).__setAppTheme = (next: ThemePref) => {
    savePref(next);
    applyTheme(resolveTheme(next));
  };
}

/** Accesibilidad: reduce motion a nivel global si el usuario lo pide. */
function setupA11y(): void {
  const html = document.documentElement;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
    html.classList.add("reduced-motion"); // úsalo en CSS para desactivar animaciones
  } else {
    html.classList.remove("reduced-motion");
  }
}

/** Captura errores globales para evitar pantallas en blanco. */
function installGlobalErrorHandlers(): void {
  window.addEventListener("error", (ev) => {
    // Por qué: registro mínimo; integra Sentry más tarde si quieres.
    console.error("[GlobalError]", ev.error || ev.message);
  });
  window.addEventListener("unhandledrejection", (ev) => {
    console.error("[UnhandledRejection]", ev.reason);
  });
}

/** Fallback visual discreto para Suspense. */
function AppFallback() {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: "grid",
        placeItems: "center",
        minHeight: "100dvh",
      }}
    >
      Cargando…
    </div>
  );
}

/** ErrorBoundary para impedir que un error derribe toda la UI. */
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: unknown, info: unknown) {
    // Por qué: centraliza reporte (consola por ahora).
    console.error("[ErrorBoundary]", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          style={{
            display: "grid",
            gap: "1rem",
            placeItems: "center",
            minHeight: "100dvh",
            padding: "2rem",
            textAlign: "center",
          }}
        >
          <h1>Algo no ha ido bien</h1>
          <p>Hemos detenido esta pantalla para proteger tu sesión.</p>
          <button
            onClick={() => location.reload()}
            style={{
              minWidth: 120,
              minHeight: 44,
              borderRadius: 12,
              padding: "0.5rem 1rem",
            }}
          >
            Reintentar
          </button>
        </div>
      );
    }
    return this.props.children as React.ReactElement;
  }
}

function startApp(): void {
  setupTheme();
  setupA11y();
  installGlobalErrorHandlers();

  const rootEl = document.getElementById("root");
  if (!(rootEl instanceof HTMLElement)) {
    throw new Error("No se encontró el elemento #root en index.html");
  }

  createRoot(rootEl).render(
    <StrictMode>
      <ErrorBoundary>
        <Suspense fallback={<AppFallback />}>
          <App />
        </Suspense>
      </ErrorBoundary>
    </StrictMode>,
  );
}

startApp();
