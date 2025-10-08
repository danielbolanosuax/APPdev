import React, { useMemo, useState } from "react";
import { Filter, Package, MapPin, SortAsc, Search, Trash2, MoveRight, LayoutGrid } from "lucide-react";
import { useStore, selectors, normalize, InventoryItem, Location } from "../../state/store";
import QuantityStepper from "./QuantityStepper";
import AddItemModal from "./AddItemModal";

/* Helpers UI */
function StatusBadge({ status, color }: { status: string; color: string }) {
  const tone =
    color.includes("red") ? "warn"
    : color.includes("yellow") ? "info"
    : "success";
  return <span className={`badge ${tone}`}>{status}</span>;
}

const LOCS: Location[] = ["Pantry", "Fridge", "Freezer"];
const UNITS = ["units", "kg", "g", "L", "ml", "packs"] as const;

export default function InventoryView() {
  // store
  const items = useStore(selectors.items);
  const prefs = useStore(selectors.prefs);

  const setFilter = useStore((s) => s.setFilter);
  const setSort   = useStore((s) => s.setSort);
  const update    = useStore((s) => s.updateItem);
  const remove    = useStore((s) => s.removeItem);
  const addItem   = useStore((s) => s.addItem);

  // local ui
  const [q, setQ] = useState("");
  const [groupBy, setGroupBy] = useState<"location" | "category">("location");
  const [openAdd, setOpenAdd] = useState(false);

  // filter + sort
  const filtered = useMemo(() => {
    let arr = items.filter((i) => {
      const byTab =
        prefs.filter === "all"
          ? true
          : prefs.filter === "expiring"
          ? i.status.toLowerCase().includes("expires")
          : i.location.toLowerCase() === prefs.filter;
      const byQ =
        !q.trim() ||
        normalize(i.name).includes(normalize(q)) ||
        normalize(i.baseName).includes(normalize(q)) ||
        normalize(i.category).includes(normalize(q));
      return byTab && byQ;
    });

    arr = [...arr].sort((a, b) => {
      if (prefs.sort === "az") return a.baseName.localeCompare(b.baseName);
      if (prefs.sort === "qty") return (b.qty || 0) - (a.qty || 0);
      if (prefs.sort === "status") return a.status.localeCompare(b.status);
      return 0;
    });
    return arr;
  }, [items, prefs.filter, prefs.sort, q]);

  // group
  const groups = useMemo(() => {
    const map = new Map<string, InventoryItem[]>();
    filtered.forEach((it) => {
      const key = groupBy === "location" ? it.location : it.category;
      const arr = map.get(key) || [];
      arr.push(it);
      map.set(key, arr);
    });
    return Array.from(map.entries()).sort((a,b)=>a[0].localeCompare(b[0]));
  }, [filtered, groupBy]);

  return (
    <section className="sp-card p-4 sp-card-lg">
      {/* header row */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <Filter className="w-4 h-4" style={{ color: "var(--brand)" }} />
        <div className="flex gap-2">
          {["all","fridge","freezer","pantry","expiring"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={`px-3 py-1 rounded-full text-xs font-semibold border ${prefs.filter===f ? "sp-btn-primary" : "sp-btn-ghost"}`}
              title={`Filter: ${f}`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        {/* search local */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted" />
          <input
            value={q}
            onChange={(e)=>setQ(e.target.value)}
            className="search-input w-[220px]"
            placeholder="Search items…"
          />
        </div>

        {/* sort */}
        <div className="flex items-center gap-2">
          <SortAsc className="w-4 h-4 text-muted" />
          {(["az","qty","status"] as const).map(k=>(
            <button
              key={k}
              className={`px-2 py-1 rounded-md text-xs border ${prefs.sort===k ? "surface border-subtle" : "sp-btn-ghost"}`}
              onClick={()=>setSort(k)}
              title={`Sort by ${k}`}
            >
              {k.toUpperCase()}
            </button>
          ))}
        </div>

        {/* group by */}
        <div className="flex items-center gap-2">
          <LayoutGrid className="w-4 h-4 text-muted" />
          <div className="tabs">
            {(["location","category"] as const).map(k => (
              <button
                key={k}
                className="tab"
                aria-current={groupBy===k ? "page": undefined}
                onClick={()=>setGroupBy(k)}
              >
                {k}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* groups */}
      <div className="space-y-4">
        {groups.map(([key, arr]) => {
          const total = arr.reduce((s, it) => s + (it.qty || 0), 0);
          return (
            <div key={key} className="rounded-2xl border-subtle surface">
              <div className="px-3 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {groupBy === "location" ? <MapPin className="w-4 h-4"/> : <Package className="w-4 h-4"/>}
                  <div className="font-semibold">{key}</div>
                </div>
                <div className="text-xs text-muted">Items: {arr.length} · Total qty: {total}</div>
              </div>
              <ul className="divide-y border-subtle/50">
                {arr.map((it)=>(
                  <ItemRow key={it.id} it={it} onUpdate={update} onRemove={remove}/>
                ))}
              </ul>
            </div>
          );
        })}

        {filtered.length===0 && (
          <div className="text-center text-sm text-muted py-8">
            <p className="font-semibold">No items match your filters.</p>
          </div>
        )}
      </div>

      {/* FAB Add */}
      <button
        className="fixed bottom-6 right-6 sp-btn sp-btn-primary shadow-elev"
        onClick={()=>setOpenAdd(true)}
        aria-label="Add item"
        title="Add item"
      >
        + Add
      </button>

      <AddItemModal
        open={openAdd}
        onClose={()=>setOpenAdd(false)}
        onSubmit={(p)=>addItem(p)}
      />
    </section>
  );
}

/* ---- Item row/card ---- */
function ItemRow({
  it,
  onUpdate,
  onRemove
}: {
  it: InventoryItem;
  onUpdate: (id: string, patch: Partial<InventoryItem>) => void;
  onRemove: (id: string) => void;
}) {
  const setQty = (v: number) => onUpdate(it.id, { qty: v, name: `${it.baseName} (${v} ${it.unit})` });

  return (
    <li className="p-3 flex items-center justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold truncate">{it.baseName}</p>
          <StatusBadge status={it.status} color={it.statusColor} />
        </div>
        <p className="text-xs text-muted">
          {it.location} · {it.category}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <QuantityStepper value={it.qty} onChange={setQty} />

        <select
          className="select px-2 py-1 text-xs w-[92px]"
          value={it.unit}
          onChange={(e)=>onUpdate(it.id, { unit: e.target.value, name: `${it.baseName} (${it.qty} ${e.target.value})` })}
          title="Unit"
        >
          {UNITS.map(u => <option key={u}>{u}</option>)}
        </select>

        <select
          className="select px-2 py-1 text-xs w-[110px]"
          value={it.location}
          onChange={(e)=>onUpdate(it.id, { location: e.target.value as Location })}
          title="Move to"
        >
          {LOCS.map(l => <option key={l}>{l}</option>)}
        </select>

        <button
          onClick={()=>onRemove(it.id)}
          className="btn-icon"
          title="Remove"
          aria-label="Remove"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </li>
  );
}
