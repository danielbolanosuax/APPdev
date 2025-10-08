import React, { useMemo, useState } from "react";
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
} from "lucide-react";
import {
  useStore,
  selectors,
  InventoryItem,
  Location,
  Category,
} from "../../state/store";

/* ====== Constantes UI ====== */
const LOCS: Location[] = ["Pantry", "Fridge", "Freezer"];
const UNITS = ["units", "kg", "g", "L", "ml", "packs"] as const;

type SortKey = "az" | "qty" | "status";
type GroupKey = "location" | "category";
type FilterKey = "all" | "fridge" | "freezer" | "pantry" | "expiring";

/* ====== Helpers ====== */
function statusTone(s: string): "ok" | "warn" | "neutral" {
  const t = (s || "").toLowerCase();
  if (t.includes("expire")) return "warn";
  if (t.includes("fresh") || t.includes("long")) return "ok";
  return "neutral";
}

export default function InventoryView() {
  // Store
  const items = useStore(selectors.items);
  const addItem = useStore((s) => s.addItem);
  const updateItem = useStore((s) => s.updateItem);
  const removeItem = useStore((s) => s.removeItem);

  // UI state
  const [query, setQuery] = useState("");
  const [filterKey, setFilterKey] = useState<FilterKey>("all");
  const [groupBy, setGroupBy] = useState<GroupKey>("location");
  const [sortBy, setSortBy] = useState<SortKey>("az");

  // Quick add
  const [addName, setAddName] = useState("");
  const [addQty, setAddQty] = useState<number>(1);
  const [addUnit, setAddUnit] = useState<string>("units");
  const [addLoc, setAddLoc] = useState<Location>("Pantry");

  /* ============== Derived ============== */
  const filtered = useMemo(() => {
    const q = (query || "").toLowerCase().trim();
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
          it.name.toLowerCase().includes(q) ||
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
  }, [items, query, filterKey, sortBy]);

  const groups = useMemo(() => {
    const map = new Map<string, InventoryItem[]>();
    filtered.forEach((it) => {
      const key = groupBy === "location" ? it.location : it.category;
      const list = map.get(key) || [];
      list.push(it);
      map.set(key, list);
    });
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([k, arr]) => [k, arr.sort((a, b) => a.baseName.localeCompare(b.baseName))] as const);
  }, [filtered, groupBy]);

  /* ============== Actions ============== */
  const addQuick = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!addName.trim() || addQty <= 0) return;
    addItem({ baseName: addName.trim(), qty: addQty, unit: addUnit, location: addLoc });
    setAddName("");
    setAddQty(1);
    setAddUnit("units");
    setAddLoc("Pantry");
  };

  const stepQty = (id: string, delta: number) => {
    const it = items.find((i) => i.id === id);
    if (!it) return;
    const next = Math.max(0, (it.qty || 0) + delta);
    updateItem(id, { qty: next });
  };

  const moveTo = (it: InventoryItem, loc: Location) => {
    // Mantener simple: eliminamos y volvemos a crear en la nueva ubicación
    removeItem(it.id);
    addItem({ baseName: it.baseName, qty: it.qty, unit: it.unit, location: loc });
  };

  return (
    <section className="inventory-wrap">
      {/* Header */}
      <div className="card-head">
        <div className="card-title">
          <span className="ringed"><Boxes className="w-4 h-4" /></span>
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
            className="search-input"
            placeholder="Search items…"
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
          value={addQty}
          onChange={(e) => setAddQty(parseFloat(e.target.value || "1"))}
        />
        <select className="select" value={addUnit} onChange={(e) => setAddUnit(e.target.value)}>
          {UNITS.map((u) => (
            <option key={u}>{u}</option>
          ))}
        </select>
        <select className="select" value={addLoc} onChange={(e) => setAddLoc(e.target.value as Location)}>
          {LOCS.map((l) => (
            <option key={l}>{l}</option>
          ))}
        </select>
        <button className="sp-btn sp-btn-primary" type="submit">
          <PlusCircle className="w-4 h-4" /> Add
        </button>
      </form>

      {/* Groups */}
      <div className="space-y-4">
        {groups.map(([key, arr]) => {
          const totalQty = arr.reduce((s, x) => s + (x.qty || 0), 0);
          return (
            <div key={key} className="group-card">
              <div className="group-head">
                <div className="gh-title">
                  {groupBy === "location" ? <MapPin className="w-4 h-4" /> : <Tag className="w-4 h-4" />} {key}
                </div>
                <div className="gh-meta">
                  Items: <b>{arr.length}</b> · Total qty: <b>{Number.isInteger(totalQty) ? totalQty : totalQty.toFixed(1)}</b>
                </div>
              </div>

              <ul className="divide-y border-subtle/50">
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
    </section>
  );
}

/* ========= Row ========= */
function Row({
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
        <span className="qty">{Number.isInteger(it.qty) ? it.qty : it.qty.toFixed(1)}</span>
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
          <span className="chip">{it.category as Category}</span>
        </div>
      </div>

      <div className="actions">
        <div className="move">
          <ArrowRightLeft className="w-4 h-4" />
          <select className="select" value={it.location} onChange={(e) => onMove(e.target.value as Location)}>
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
}
