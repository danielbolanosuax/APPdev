import React, { useMemo, useState } from "react";
import {
  ShoppingCart,
  Search,
  Minus,
  Plus,
  CheckSquare,
  Square,
  Trash2,
  ClipboardCopy,
  Download,
  CheckCircle2,
  LayoutGrid,
} from "lucide-react";
import { useStore, selectors, ShoppingRow, Location } from "../../state/store";

/* ====== Heurística simple de pasillos (aisles) ====== */
function inferAisle(name: string): string {
  const n = (name || "").toLowerCase();
  if (/(tomato|lettuce|pepper|onion|garlic|apple|banana|spinach|carrot|cucumber)/.test(n)) return "Produce";
  if (/(milk|yogurt|cheese|butter|cream)/.test(n)) return "Dairy";
  if (/(chicken|beef|pork|ham|turkey|sausage)/.test(n)) return "Meat";
  if (/(bread|bakery|rolls|baguette|buns)/.test(n)) return "Bakery";
  if (/(rice|pasta|flour|oats|sugar|salt|cereal|beans|lentil)/.test(n)) return "Dry Goods";
  if (/(oil|olive|vinegar|sauce|ketchup|mustard|mayo|spice)/.test(n)) return "Condiments";
  if (/(frozen|ice cream|peas|pizza)/.test(n)) return "Frozen";
  if (/(soap|detergent|paper|napkin|foil|wrap)/.test(n)) return "Household";
  return "Other";
}

const LOCS: Location[] = ["Pantry", "Fridge", "Freezer"];
const UNITS = ["units", "kg", "g", "L", "ml", "packs"] as const;

export default function ShoppingView() {
  // store
  const shopping = useStore(selectors.shopping);
  const addRow = useStore((s) => s.addRow);
  const updateQty = useStore((s) => s.updateQty);
  const togglePurchased = useStore((s) => s.togglePurchased);
  const changeLoc = useStore((s) => s.changeLoc);
  const removeRow = useStore((s) => s.removeRow);
  const finalizePurchase = useStore((s) => s.finalizePurchase);
  const setShopping = useStore((s) => s.setShopping);

  // UI
  const [q, setQ] = useState("");
  const [groupBy, setGroupBy] = useState<"location" | "aisle">("location");
  const [filter, setFilter] = useState<"all" | "todo" | "purchased">("all");
  const [supermarketMode, setSupermarketMode] = useState(true);

  /* ============== derived ============== */
  const filtered = useMemo(() => {
    let arr = shopping;
    if (filter === "todo") arr = arr.filter((r) => !r.purchased);
    if (filter === "purchased") arr = arr.filter((r) => r.purchased);
    const qq = q.trim().toLowerCase();
    if (qq) arr = arr.filter((r) => r.name.toLowerCase().includes(qq));
    return arr;
  }, [shopping, filter, q]);

  const groups = useMemo(() => {
    const map = new Map<string, ShoppingRow[]>();
    filtered.forEach((r) => {
      const key = groupBy === "location" ? r.location : inferAisle(r.name);
      const list = map.get(key) || [];
      list.push(r);
      map.set(key, list);
    });
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([k, arr]) => [k, arr.sort((a, b) => a.name.localeCompare(b.name))] as const);
  }, [filtered, groupBy]);

  const purchasedCount = shopping.filter((r) => r.purchased).length;
  const zerosCount = shopping.filter((r) => r.qty === 0).length;

  /* ============== actions ============== */
  const addQuick = (name: string, qty = 1, unit = "units", location: Location = "Pantry") => {
    if (!name.trim() || qty <= 0) return;
    addRow({ name: name.trim(), qty, unit, location, purchased: false });
  };

  const markAll = (val: boolean) => setShopping(shopping.map((r) => ({ ...r, purchased: val })));
  const clearZeros = () => setShopping(shopping.filter((r) => r.qty !== 0));

  const exportText = () => {
    const txt = groups
      .map(([k, arr]) => {
        const lines = arr.map(
          (r) => `- [${r.purchased ? "x" : " "}] ${r.qty} ${r.unit} ${r.name} (${r.location})`
        );
        return `## ${k}\n${lines.join("\n")}`;
      })
      .join("\n\n");
    navigator.clipboard?.writeText(`Shopping List — ${new Date().toLocaleString()}\n\n${txt}\n`);
    alert("Copied to clipboard!");
  };

  const downloadTxt = () => {
    const lines = shopping
      .map((r) => `- [${r.purchased ? "x" : " "}] ${r.qty} ${r.unit} ${r.name} (${r.location})`)
      .join("\n");
    const blob = new Blob([lines], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `shopping-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="card-pro hero span-2">
      {/* HEADER */}
      <div className="card-head">
        <div className="card-title">
          <span className="ringed"><ShoppingCart className="w-4 h-4" /></span>
          <div>
            <h3>Shopping</h3>
            <p className="eyebrow">Plan your groceries and sync to inventory</p>
          </div>
        </div>
      </div>

      {/* TOOLBAR SUPERIOR */}
      <div className="toolbar">
        <div className="tool search">
          <Search className="tool-icon" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="search-input"
            placeholder="Search item…"
            aria-label="Search in list"
          />
        </div>

        <div className="tool seg-group" role="tablist" aria-label="Filter">
          {(["all", "todo", "purchased"] as const).map((f) => (
            <button
              key={f}
              role="tab"
              aria-checked={filter === f}
              onClick={() => setFilter(f)}
              className="seg"
              title={`Filter: ${f}`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="tool seg-group" role="tablist" aria-label="Group by">
          <LayoutGrid className="tool-icon" />
          {(["location", "aisle"] as const).map((g) => (
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

        <label className="tool checkbox">
          <input
            type="checkbox"
            checked={supermarketMode}
            onChange={(e) => setSupermarketMode(e.target.checked)}
          />
          Supermarket mode
        </label>
      </div>

      {/* QUICK ADD – STICKY */}
      <QuickAdd onAdd={addQuick} />

      {/* GROUPS */}
      <div className="space-y-4">
        {groups.map(([key, arr]) => {
          const totalQty = arr.reduce((s, r) => s + r.qty, 0);
          return (
            <div key={key} className="group-card">
              <div className="group-head">
                <div className="gh-title">{key}</div>
                <div className="gh-meta">
                  Items: <b>{arr.length}</b> · Qty: <b>{totalQty}</b>
                </div>
              </div>
              <ul className="divide-y border-subtle/50">
                {arr.map((it) => (
                  <Row
                    key={it.id}
                    it={it}
                    supermarket={supermarketMode}
                    onDec={() => updateQty(it.id, -1)}
                    onInc={() => updateQty(it.id, +1)}
                    onToggle={() => togglePurchased(it.id)}
                    onLoc={(loc) => changeLoc(it.id, loc)}
                    onRemove={() => removeRow(it.id)}
                  />
                ))}
              </ul>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <EmptyState />
        )}
      </div>

      {/* BULK DOCK (sticky bottom-right) */}
      <div className="bulk-dock">
        <div className="dock-left">
          <button className="sp-btn sp-btn-ghost" onClick={() => markAll(true)}>
            <CheckSquare className="w-4 h-4" /> Mark all purchased
          </button>
          <button className="sp-btn sp-btn-ghost" onClick={() => markAll(false)}>
            <Square className="w-4 h-4" /> Unmark all
          </button>
          <button className="sp-btn sp-btn-ghost" onClick={exportText}>
            <ClipboardCopy className="w-4 h-4" /> Copy text
          </button>
          <button className="sp-btn sp-btn-ghost" onClick={downloadTxt}>
            <Download className="w-4 h-4" /> Download .txt
          </button>
          <button
            className="sp-btn sp-btn-ghost"
            onClick={clearZeros}
            title="Remove rows with qty 0"
            disabled={zerosCount === 0}
            style={{ opacity: zerosCount ? 1 : 0.6 }}
          >
            <Trash2 className="w-4 h-4" /> Clear qty=0
          </button>
        </div>

        <div className="dock-right">
          <span className="eyebrow">Purchased: <b>{purchasedCount}</b></span>
          <button
            onClick={() => finalizePurchase()}
            className="sp-btn sp-btn-primary"
            disabled={purchasedCount === 0}
            title="Move purchased to inventory and reset"
            style={{ opacity: purchasedCount ? 1 : 0.7 }}
          >
            <CheckCircle2 className="w-5 h-5" /> Finalize & Update Inventory
          </button>
        </div>
      </div>
    </section>
  );
}

/* ====== Row ====== */
function Row({
  it,
  supermarket,
  onDec,
  onInc,
  onToggle,
  onLoc,
  onRemove,
}: {
  it: ShoppingRow;
  supermarket: boolean;
  onDec: () => void;
  onInc: () => void;
  onToggle: () => void;
  onLoc: (loc: Location) => void;
  onRemove: () => void;
}) {
  return (
    <li className="row-pro">
      {/* Big checkbox in supermarket mode */}
      <button
        onClick={onToggle}
        className={`btn-icon ${supermarket ? "check-lg" : ""}`}
        title="Purchased"
        aria-label="Purchased"
      >
        {it.purchased ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
      </button>

      <div className="qty-stepper">
        <button onClick={onDec} className="btn-icon" aria-label="Decrease">
          <Minus className="w-4 h-4" />
        </button>
        <span className="qty">{it.qty}</span>
        <button onClick={onInc} className="btn-icon" aria-label="Increase">
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="info">
        <div className={`title ${it.purchased ? "purchased" : ""}`}>
          {it.name} <span className="muted">({it.unit})</span>
        </div>
        <div className="meta">{it.location}</div>
      </div>

      <div className="actions">
        <select
          value={it.location}
          onChange={(e) => onLoc(e.target.value as Location)}
          className="select"
          title="Move to"
        >
          {LOCS.map((l) => (
            <option key={l}>{l}</option>
          ))}
        </select>
        <button onClick={onRemove} className="btn-icon" aria-label="Remove item">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </li>
  );
}

/* ====== Quick Add ====== */
function QuickAdd({
  onAdd,
}: {
  onAdd: (name: string, qty?: number, unit?: string, loc?: Location) => void;
}) {
  const [name, setName] = useState("");
  const [qty, setQty] = useState(1);
  const [unit, setUnit] = useState<string>("units");
  const [loc, setLoc] = useState<Location>("Pantry");

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!name.trim() || qty <= 0) return;
    onAdd(name, qty, unit, loc);
    setName("");
    setQty(1);
    setUnit("units");
    setLoc("Pantry");
  };

  return (
    <form onSubmit={submit} className="sticky-add">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Add item (e.g. Tomatoes)"
        className="input"
        aria-label="Item name"
      />
      <input
        type="number"
        min={1}
        value={qty}
        onChange={(e) => setQty(parseInt(e.target.value || "1"))}
        className="input"
        aria-label="Quantity"
      />
      <select value={unit} onChange={(e) => setUnit(e.target.value)} className="select" aria-label="Unit">
        {UNITS.map((u) => (
          <option key={u}>{u}</option>
        ))}
      </select>
      <select value={loc} onChange={(e) => setLoc(e.target.value as Location)} className="select" aria-label="Location">
        {LOCS.map((l) => (
          <option key={l}>{l}</option>
        ))}
      </select>
      <button type="submit" className="sp-btn sp-btn-primary" aria-label="Add item">
        Add
      </button>
    </form>
  );
}

/* ====== Empty state ====== */
function EmptyState() {
  return (
    <div className="empty">
      <div className="empty-card">
        <div className="empty-title">No items match your filters</div>
        <p className="eyebrow">Try clearing search or add something above.</p>
      </div>
    </div>
  );
}
