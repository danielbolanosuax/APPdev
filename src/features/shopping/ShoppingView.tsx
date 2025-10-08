import React, { useMemo, useState } from "react";
import {
  ShoppingCart,
  Filter,
  LayoutGrid,
  Search,
  Minus,
  Plus,
  CheckSquare,
  Square,
  Trash2,
  ClipboardCopy,
  Download,
  CheckCircle2,
} from "lucide-react";
import { useStore, selectors, ShoppingRow, Location } from "../../state/store";

/* ====== Heurística simple de pasillos (aisles) ====== */
function inferAisle(name: string): string {
  const n = (name || "").toLowerCase();
  if (/(tomato|lettuce|pepper|onion|garlic|apple|banana|spinach|carrot)/.test(n)) return "Produce";
  if (/(milk|yogurt|cheese|butter)/.test(n)) return "Dairy";
  if (/(chicken|beef|pork|ham|turkey)/.test(n)) return "Meat";
  if (/(bread|bakery|rolls|baguette)/.test(n)) return "Bakery";
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

  /* ====== acciones ====== */
  const addQuick = (name: string, qty = 1, unit = "units", location: Location = "Pantry") => {
    if (!name.trim() || qty <= 0) return;
    addRow({ name: name.trim(), qty, unit, location, purchased: false });
  };

  const markAll = (val: boolean) => {
    const next = shopping.map((r) => ({ ...r, purchased: val }));
    setShopping(next);
  };

  const clearZeros = () => {
    setShopping(shopping.filter((r) => r.qty !== 0));
  };

  const exportText = () => {
    const byGroup = groups
      .map(([k, arr]) => {
        const lines = arr.map(
          (r) => `- [${r.purchased ? "x" : " "}] ${r.qty} ${r.unit} ${r.name} (${r.location})`
        );
        return `## ${k}\n${lines.join("\n")}`;
      })
      .join("\n\n");
    const content = `Shopping List — ${new Date().toLocaleString()}\n\n${byGroup}\n`;
    navigator.clipboard?.writeText(content);
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
    <section className="sp-card p-4 sp-card-lg">
      <div className="flex items-center gap-2 mb-3">
        <ShoppingCart className="w-5 h-5" style={{ color: "var(--brand)" }} />
        <h2 className="text-lg font-extrabold">Shopping</h2>
        <div className="flex-1" />

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="search-input w-[220px]"
            placeholder="Search item…"
          />
        </div>

        {/* Filter */}
        <div className="inline-flex items-center gap-1">
          {(["all", "todo", "purchased"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2 py-1 rounded-full text-xs font-semibold border ${
                filter === f ? "sp-btn-primary" : "sp-btn-ghost"
              }`}
              title={`Filter: ${f}`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Group */}
        <div className="inline-flex items-center gap-2">
          <LayoutGrid className="w-4 h-4 text-muted" />
          <div className="tabs">
            {(["location", "aisle"] as const).map((g) => (
              <button
                key={g}
                className="tab"
                aria-current={groupBy === g ? "page" : undefined}
                onClick={() => setGroupBy(g)}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Mode */}
        <label className="text-xs inline-flex items-center gap-2 surface-2 px-2 py-1 rounded-md border-subtle ml-2">
          <input
            type="checkbox"
            checked={supermarketMode}
            onChange={(e) => setSupermarketMode(e.target.checked)}
          />
          Supermarket mode
        </label>
      </div>

      {/* Quick Add */}
      <QuickAdd onAdd={addQuick} />

      {/* Groups */}
      <div className="space-y-4 mt-3">
        {groups.map(([key, arr]) => {
          const totalQty = arr.reduce((s, r) => s + r.qty, 0);
          return (
            <div key={key} className="rounded-2xl border-subtle surface">
              <div className="px-3 py-2 flex items-center justify-between">
                <div className="font-semibold">{key}</div>
                <div className="text-xs text-muted">
                  Items: {arr.length} · Qty: {totalQty}
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
          <div className="text-center text-sm text-muted py-8">
            <p className="font-semibold">No items match your filters.</p>
          </div>
        )}
      </div>

      {/* Bulk bar */}
      <div className="mt-4 grid md:grid-cols-2 gap-3">
        <div className="rounded-2xl border-subtle surface p-3 flex flex-wrap items-center gap-2">
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

        <div className="rounded-2xl border-subtle surface p-3 flex items-center justify-between gap-2">
          <div className="text-sm">
            Purchased: <b>{purchasedCount}</b>
          </div>
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
    <li className="p-3 flex items-center justify-between">
      <div className="flex items-center gap-3 min-w-0">
        {/* Big checkbox in supermarket mode */}
        <button
          onClick={onToggle}
          className="btn-icon"
          title="Purchased"
          aria-label="Purchased"
          style={supermarket ? { width: 44, height: 44 } : undefined}
        >
          {it.purchased ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
        </button>

        <div className="flex items-center gap-2">
          <button onClick={onDec} className="btn-icon">
            <Minus className="w-4 h-4" />
          </button>
          <span className="min-w-[48px] text-center font-semibold">{it.qty}</span>
          <button onClick={onInc} className="btn-icon">
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="min-w-0">
          <p className={`font-semibold truncate ${it.purchased ? "line-through opacity-70" : ""}`}>
            {it.name} <span className="text-muted font-normal">({it.unit})</span>
          </p>
          <p className="text-xs text-muted">{it.location}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <select
          value={it.location}
          onChange={(e) => onLoc(e.target.value as Location)}
          className="select px-2 py-1 text-xs"
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
    <form onSubmit={submit} className="grid md:grid-cols-[1fr,100px,120px,140px,120px] gap-2">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Add item (e.g. Tomatoes)"
        className="input"
      />
      <input
        type="number"
        min={1}
        value={qty}
        onChange={(e) => setQty(parseInt(e.target.value || "1"))}
        className="input"
      />
      <select value={unit} onChange={(e) => setUnit(e.target.value)} className="select">
        {UNITS.map((u) => (
          <option key={u}>{u}</option>
        ))}
      </select>
      <select value={loc} onChange={(e) => setLoc(e.target.value as Location)} className="select">
        {LOCS.map((l) => (
          <option key={l}>{l}</option>
        ))}
      </select>
      <button type="submit" className="sp-btn sp-btn-primary">
        Add
      </button>
    </form>
  );
}
