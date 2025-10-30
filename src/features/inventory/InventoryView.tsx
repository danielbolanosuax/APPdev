import React, {
  useCallback,
  useDeferredValue,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Boxes,
  Search,
  Filter,
  LayoutGrid,
  PlusCircle,
  Minus,
  Plus,
  Trash2,
  MapPin,
  Tag,
  ArrowRightLeft,
  Info,
} from "lucide-react";
import { useStore, selectors, InventoryItem, Location, Category } from "../../state/store";

const LOCS: Location[] = ["Pantry", "Fridge", "Freezer"];
const UNITS = ["units", "kg", "g", "L", "ml", "packs"] as const;

type SortKey = "az" | "qty" | "status";
type GroupKey = "location" | "category";
type FilterKey = "all" | "fridge" | "freezer" | "pantry" | "expiring";

type ScanInfo = {
  name: string;
  calories?: number;
  nutriScore?: string;
  barcode?: string;
};

function statusTone(s: string): "ok" | "warn" | "neutral" {
  const t = (s || "").toLowerCase();
  if (t.includes("expire")) return "warn";
  if (t.includes("fresh") || t.includes("long")) return "ok";
  return "neutral";
}

function useDebouncedValue<T>(value: T, delayMs = 180) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return v;
}

function useStateWithStorage<T>(key: string, initial: T) {
  const [state, setState] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [key, state]);
  return [state, setState] as const;
}

type ToastKind = "success" | "error" | "info";
type Toast = { id: number; kind: ToastKind; text: string };
function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(1);
  const add = useCallback((kind: ToastKind, text: string) => {
    const id = idRef.current++;
    setToasts((t) => [...t, { id, kind, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000);
  }, []);
  return { toasts, add };
}

/** Tipado mínimo del BarcodeDetector */
type DetectorCtor = new (opts: { formats: string[] }) => {
  detect: (source: CanvasImageSource) => Promise<Array<{ rawValue: string }>>;
};
declare global {
  interface Window {
    BarcodeDetector?: DetectorCtor;
  }
}

export default function InventoryView() {
  const items = useStore(selectors.items);
  const addItem = useStore((s) => s.addItem);
  const updateItem = useStore((s) => s.updateItem);
  const removeItem = useStore((s) => s.removeItem);

  const { toasts, add: addToast } = useToasts();
  const liveRef = useRef<HTMLDivElement | null>(null);

  const [query, setQuery] = useStateWithStorage<string>("inv.query", "");
  const [filterKey, setFilterKey] = useStateWithStorage<FilterKey>("inv.filter", "all");
  const [groupBy, setGroupBy] = useStateWithStorage<GroupKey>("inv.groupBy", "location");
  const [sortBy, setSortBy] = useStateWithStorage<SortKey>("inv.sortBy", "az");

  const [addName, setAddName] = useState("");
  const [addQty, setAddQty] = useState<number>(1);
  const [addUnit, setAddUnit] = useState<string>("units");
  const [addLoc, setAddLoc] = useState<Location>("Pantry");

  const [showScanner, setShowScanner] = useState(false);
  const [scanInfo, setScanInfo] = useState<ScanInfo | null>(null);

  const searchId = useId();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        const el = document.getElementById(searchId) as HTMLInputElement | null;
        el?.focus();
      } else if (e.key.toLowerCase() === "s") {
        setShowScanner(true);
      } else if (e.key.toLowerCase() === "g") {
        handleGenerateRecipes();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const debouncedQuery = useDebouncedValue(query, 150);
  const deferredQuery = useDeferredValue(debouncedQuery);

  const filtered = useMemo(() => {
    const q = (deferredQuery || "").toLowerCase().trim();
    return items
      .filter((it) => {
        const byFilter =
          filterKey === "all"
            ? true
            : filterKey === "expiring"
              ? it.status.toLowerCase().includes("expires")
              : it.location.toLowerCase() === filterKey;
        const byQuery =
          !q ||
          it.name?.toLowerCase().includes(q) ||
          it.baseName.toLowerCase().includes(q) ||
          (it.category || "").toLowerCase().includes(q);
        return byFilter && byQuery;
      })
      .sort((a, b) => {
        if (sortBy === "az") return a.baseName.localeCompare(b.baseName);
        if (sortBy === "qty") return (b.qty || 0) - (a.qty || 0);
        if (sortBy === "status") return a.status.localeCompare(b.status);
        return 0;
      });
  }, [items, deferredQuery, filterKey, sortBy]);

  const groups = useMemo(() => {
    const map = new Map<string, InventoryItem[]>();
    for (const it of filtered) {
      const key = groupBy === "location" ? it.location : it.category || "Uncategorized";
      const list = map.get(key) || [];
      list.push(it);
      map.set(key, list);
    }
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([k, arr]) => [k, arr.sort((a, b) => a.baseName.localeCompare(b.baseName))] as const);
  }, [filtered, groupBy]);

  const addQuick = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();
      const name = addName.trim();
      const qty = Number.isFinite(addQty) ? Math.max(0, addQty) : 0;
      if (!name || qty <= 0) {
        addToast("error", "Nombre y cantidad válidos son requeridos.");
        return;
      }
      addItem({ baseName: name, qty, unit: addUnit, location: addLoc });
      setAddName("");
      setAddQty(1);
      setAddUnit("units");
      setAddLoc("Pantry");
      setScanInfo(null);
      addToast("success", "Elemento añadido.");
    },
    [addName, addQty, addUnit, addLoc, addItem, addToast],
  );

  const stepQty = useCallback(
    (id: string, delta: number) => {
      const it = items.find((i) => i.id === id);
      if (!it) return;
      const next = Math.max(0, (it.qty || 0) + delta);
      updateItem(id, { qty: next });
    },
    [items, updateItem],
  );

  const moveTo = useCallback(
    (it: InventoryItem, loc: Location) => {
      removeItem(it.id);
      addItem({ baseName: it.baseName, qty: it.qty, unit: it.unit, location: loc });
      addToast("info", `Movido a ${loc}.`);
    },
    [addItem, removeItem, addToast],
  );

  const handleScan = useCallback(
    async (barcode: string) => {
      setShowScanner(false);
      const code = String(barcode || "").trim();
      if (!code) return;

      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 8000);

      try {
        const res = await fetch(
          `https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(code)}.json`,
          { signal: ctrl.signal },
        );
        clearTimeout(timer);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (data.status !== 1) {
          addToast("error", "Producto no encontrado.");
          return;
        }
        const product = data.product;
        const name: string =
          product.product_name || product.generic_name || product.brands || "Producto desconocido";
        let calories: number | undefined;
        const n = product.nutriments || {};
        if (typeof n["energy-kcal_100g"] === "number") calories = n["energy-kcal_100g"];
        else if (typeof n["energy_100g"] === "number")
          calories = Math.round(n["energy_100g"] / 4.184);
        const rawGrade: string | undefined =
          product.nutrition_grade_fr ||
          product.nutrition_grades ||
          product.nutrition_grade ||
          undefined;

        setAddName(name);
        setAddQty(1);
        setAddUnit("units");
        setAddLoc("Pantry");
        setScanInfo({
          name,
          calories,
          nutriScore: rawGrade ? String(rawGrade).toUpperCase() : undefined,
          barcode: code,
        });
        addToast("success", "Producto detectado. Revisa el Quick Add.");
      } catch (err: unknown) {
        clearTimeout(timer);
        const isAbort = (err as { name?: string })?.name === "AbortError";
        addToast(
          "error",
          isAbort ? "Tiempo de espera agotado." : "Error al consultar OpenFoodFacts.",
        );
      }
    },
    [addToast],
  );

  const handleGenerateRecipes = useCallback(() => {
    const names = items.map((i) => i.baseName.toLowerCase());
    const ideas: string[] = [];
    if (names.some((n) => /tomate|tomato/.test(n)) && names.some((n) => /pasta/.test(n)))
      ideas.push("Pasta con tomate y hierbas.");
    if (names.some((n) => /arroz|rice/.test(n)) && names.some((n) => /pollo|chicken/.test(n)))
      ideas.push("Arroz con pollo sencillo.");
    if (names.some((n) => /huevo|egg/.test(n)) && names.some((n) => /patata|potato/.test(n)))
      ideas.push("Tortilla de patatas.");
    if (ideas.length === 0) ideas.push("Sopa/Salteado con lo que tengas a mano.");
    alert("Ideas rápidas:\n• " + ideas.join("\n• "));
  }, [items]);

  return (
    <section className="inventory-wrap">
      {/* Header */}
      <div className="card-head">
        <div className="card-title">
          <span className="ringed">
            <Boxes className="w-4 h-4" />
          </span>
          <div>
            <h3>Inventory</h3>
            <p className="eyebrow">Track what you have across pantry, fridge and freezer</p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="inv-toolbar">
        <div className="tool search">
          <Search className="tool-icon" />
          <input
            id={searchId}
            className="search-input"
            placeholder="Search items…  (atajos: / buscar, s escanear, g recetas)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search inventory"
          />
        </div>

        <div className="tool seg-group" aria-label="Filter" role="tablist">
          <Filter className="tool-icon" />
          {(["all", "fridge", "freezer", "pantry", "expiring"] as FilterKey[]).map((f) => (
            <button
              key={f}
              role="tab"
              aria-checked={filterKey === f}
              onClick={() => setFilterKey(f)}
              className="seg"
              title={`Filter: ${f}`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="tool seg-group" aria-label="Group" role="tablist">
          <LayoutGrid className="tool-icon" />
          {(["location", "category"] as const).map((g) => (
            <button
              key={g}
              role="tab"
              aria-checked={groupBy === g}
              onClick={() => setGroupBy(g)}
              className="seg"
              title={`Group by ${g}`}
            >
              {g}
            </button>
          ))}
        </div>

        <div className="tool seg-group" aria-label="Sort" role="tablist">
          {(["az", "qty", "status"] as SortKey[]).map((s) => (
            <button
              key={s}
              role="tab"
              aria-checked={sortBy === s}
              onClick={() => setSortBy(s)}
              className="seg"
              title={`Sort by ${s}`}
            >
              {s.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="tool">
          <button
            className="sp-btn sp-btn-secondary"
            onClick={() => setShowScanner(true)}
            type="button"
          >
            Escanear
          </button>
        </div>
        <div className="tool">
          <button className="sp-btn sp-btn-ghost" onClick={handleGenerateRecipes} type="button">
            Generar recetas
          </button>
        </div>
      </div>

      {/* Quick Add */}
      <form onSubmit={addQuick} className="sticky-add inv-add">
        <input
          className="input"
          placeholder="Add item (e.g. Tomatoes)"
          value={addName}
          onChange={(e) => setAddName(e.target.value)}
        />
        <input
          type="number"
          min={1}
          className="input"
          value={Number.isFinite(addQty) ? addQty : 1}
          onChange={(e) =>
            setAddQty(Number.isNaN(parseFloat(e.target.value)) ? 1 : parseFloat(e.target.value))
          }
        />
        <select className="select" value={addUnit} onChange={(e) => setAddUnit(e.target.value)}>
          {UNITS.map((u) => (
            <option key={u}>{u}</option>
          ))}
        </select>
        <select
          className="select"
          value={addLoc}
          onChange={(e) => setAddLoc(e.target.value as Location)}
        >
          {LOCS.map((l) => (
            <option key={l}>{l}</option>
          ))}
        </select>
        <button className="sp-btn sp-btn-primary" type="submit">
          <PlusCircle className="w-4 h-4" /> Add
        </button>
        <button
          className="sp-btn sp-btn-secondary"
          type="button"
          onClick={() => setShowScanner(true)}
          aria-label="Scan barcode"
        >
          Escanear
        </button>
      </form>

      {/* Info nutricional */}
      {scanInfo && (
        <div
          className="group-card"
          style={{
            marginTop: "0.5rem",
            padding: "0.5rem 0.75rem",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
          }}
        >
          <Info className="w-4 h-4" />
          <div className="gh-title">
            Detectado: <b>{scanInfo.name}</b>
          </div>
          <div className="gh-meta" style={{ display: "flex", gap: "0.75rem" }}>
            {typeof scanInfo.calories === "number" && (
              <span className="chip">≈ {scanInfo.calories} kcal/100g</span>
            )}
            {scanInfo.nutriScore && (
              <span className="badge neutral">Nutri-Score {scanInfo.nutriScore}</span>
            )}
            {scanInfo.barcode && <span className="chip">EAN: {scanInfo.barcode}</span>}
          </div>
          <div style={{ marginLeft: "auto" }}>
            <button className="sp-btn sp-btn-ghost" onClick={() => setScanInfo(null)}>
              Ocultar
            </button>
          </div>
        </div>
      )}

      {/* Listado */}
      <div className="space-y-4">
        {groups.map(([key, arr]) => {
          const totalQty = arr.reduce((s, x) => s + (x.qty || 0), 0);
          return (
            <div key={key} className="group-card">
              <div className="group-head">
                <div className="gh-title">
                  {groupBy === "location" ? (
                    <MapPin className="w-4 h-4" />
                  ) : (
                    <Tag className="w-4 h-4" />
                  )}{" "}
                  {key}
                </div>
                <div className="gh-meta">
                  Items: <b>{arr.length}</b> · Total qty:{" "}
                  <b>{Number.isInteger(totalQty) ? totalQty : totalQty.toFixed(1)}</b>
                </div>
              </div>

              <ul className="divide-y border-subtle/50" role="list" aria-label={`Items in ${key}`}>
                {arr.map((it) => (
                  <Row
                    key={it.id}
                    it={it}
                    onDec={() => stepQty(it.id, -1)}
                    onInc={() => stepQty(it.id, +1)}
                    onMove={(loc) => moveTo(it, loc)}
                    onRemove={() => removeItem(it.id)}
                  />
                ))}
              </ul>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="empty">
            <div className="empty-card">
              <div className="empty-title">No items match your filters</div>
              <p className="eyebrow">Try clearing search or add something above.</p>
            </div>
          </div>
        )}
      </div>

      {/* Overlay escáner */}
      {showScanner && (
        <div
          className="scanner-overlay"
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "grid",
            placeItems: "center",
            zIndex: 50,
          }}
        >
          <div
            className="scanner-card"
            style={{
              background: "white",
              width: "min(680px, 92vw)",
              padding: "1rem",
              borderRadius: "0.75rem",
              boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
            }}
          >
            <h4 style={{ fontWeight: 600, marginBottom: "0.5rem" }}>Escanear código de barras</h4>
            <p className="eyebrow" style={{ marginBottom: "0.75rem" }}>
              Si tu navegador no soporta cámara, usa entrada manual.
            </p>
            <BarcodeScanner onScan={handleScan} onCancel={() => setShowScanner(false)} />
          </div>
        </div>
      )}

      {/* Toasts */}
      <div
        style={{ position: "fixed", right: 12, bottom: 12, display: "grid", gap: 8, zIndex: 60 }}
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className="toast"
            style={{
              padding: "8px 12px",
              borderRadius: 10,
              boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
              background:
                t.kind === "success" ? "#e6fffa" : t.kind === "error" ? "#ffe6e6" : "#eef2ff",
            }}
          >
            {t.text}
          </div>
        ))}
      </div>

      {/* Live region */}
      <div
        ref={liveRef}
        aria-live="polite"
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          overflow: "hidden",
          clip: "rect(1px, 1px, 1px, 1px)",
        }}
      />
    </section>
  );
}

const Row = React.memo(function Row({
  it,
  onDec,
  onInc,
  onMove,
  onRemove,
}: {
  it: InventoryItem;
  onDec: () => void;
  onInc: () => void;
  onMove: (loc: Location) => void;
  onRemove: () => void;
}) {
  const tone = statusTone(it.status);
  return (
    <li className="row-pro inv-row">
      <div className="qty-stepper">
        <button className="btn-icon" onClick={onDec} aria-label="Decrease">
          <Minus className="w-4 h-4" />
        </button>
        <span className="qty">
          {Number.isInteger(it.qty) ? it.qty : (it.qty as number).toFixed(1)}
        </span>
        <button className="btn-icon" onClick={onInc} aria-label="Increase">
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="info">
        <div className="title">
          {it.baseName} <span className="muted">({it.unit})</span>
        </div>
        <div className="meta">
          <span className={`badge ${tone}`}>{it.status}</span>
          <span className="chip inv-chip">{it.location}</span>
          <span className="chip">{(it.category as Category) || "—"}</span>
        </div>
      </div>

      <div className="actions">
        <div className="move">
          <ArrowRightLeft className="w-4 h-4" />
          <select
            className="select"
            value={it.location}
            onChange={(e) => onMove(e.target.value as Location)}
          >
            {LOCS.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </div>
        <button className="btn-icon" onClick={onRemove} aria-label="Remove item">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </li>
  );
}, areEqualRow);

function areEqualRow(
  prev: Readonly<React.ComponentProps<typeof Row>>,
  next: Readonly<React.ComponentProps<typeof Row>>,
) {
  const a = prev.it;
  const b = next.it;
  return (
    a.id === b.id &&
    a.qty === b.qty &&
    a.location === b.location &&
    a.unit === b.unit &&
    a.baseName === b.baseName &&
    a.status === b.status &&
    a.category === b.category
  );
}

/* ====== BarcodeScanner ====== */
function BarcodeScanner({
  onScan,
  onCancel,
}: {
  onScan: (barcode: string) => void;
  onCancel?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const detectorRef = useRef<InstanceType<NonNullable<Window["BarcodeDetector"]>> | null>(null);

  const [supported, setSupported] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function setup() {
      const hasDetector = typeof window !== "undefined" && !!window.BarcodeDetector;
      setSupported(hasDetector);

      if (!hasDetector) {
        setLoading(false);
        return;
      }

      try {
        const Ctor = window.BarcodeDetector!;
        detectorRef.current = new Ctor({
          formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"],
        });

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          // @ts-expect-error: srcObject está soportado por navegadores modernos
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          startDetectLoop();
        }
      } catch (e) {
        const name = (e as { name?: string }).name;
        setError(
          name === "NotAllowedError"
            ? "Permiso de cámara denegado."
            : "No se pudo iniciar la cámara.",
        );
      } finally {
        setLoading(false);
      }
    }
    setup();

    return () => {
      cancelled = true;
      stopAll();
    };
  }, []);

  function stopAll() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }

  function startDetectLoop() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !detectorRef.current) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const loop = async () => {
      if (!videoRef.current || video.readyState < 2) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      try {
        const detections = await detectorRef.current!.detect(canvas);
        const code = detections?.[0]?.rawValue;
        if (code) {
          stopAll();
          onScan(String(code));
          return;
        }
      } catch {
        // silencioso
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    loop();
  }

  return (
    <div>
      {supported ? (
        <div style={{ display: "grid", gap: "0.5rem" }}>
          <div style={{ position: "relative", overflow: "hidden", borderRadius: "0.5rem" }}>
            <video
              ref={videoRef}
              style={{
                width: "100%",
                background: "#000",
                maxHeight: 360,
                objectFit: "cover",
                display: loading ? "none" : "block",
              }}
              muted
              playsInline
            />
            {loading && (
              <div
                style={{
                  height: 200,
                  display: "grid",
                  placeItems: "center",
                  background: "#111",
                  color: "#fff",
                }}
              >
                Iniciando cámara…
              </div>
            )}
          </div>
          <canvas ref={canvasRef} style={{ display: "none" }} />
          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
            <button className="sp-btn sp-btn-ghost" onClick={() => onCancel?.()}>
              Cancelar
            </button>
          </div>
          {error && (
            <div className="eyebrow" style={{ color: "#b00" }}>
              {error}
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: "grid", gap: "0.5rem" }}>
          <input
            className="input"
            inputMode="numeric"
            placeholder="Pega el código de barras (EAN/UPC)"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
          />
          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
            <button
              className="sp-btn sp-btn-primary"
              onClick={() => onScan(manualCode.trim())}
              disabled={!manualCode.trim()}
            >
              Buscar producto
            </button>
            <button className="sp-btn sp-btn-ghost" onClick={() => onCancel?.()}>
              Cancelar
            </button>
          </div>
          {error && (
            <div className="eyebrow" style={{ color: "#b00" }}>
              {error}
            </div>
          )}
          {!error && (
            <div className="eyebrow" style={{ opacity: 0.8 }}>
              Tu navegador no soporta lector en cámara; usando entrada manual.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
