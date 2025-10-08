import React, { useEffect, useRef, useState } from "react";
import { X, PlusCircle } from "lucide-react";
import { Location } from "../../state/store";

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (args: {
    baseName: string;
    qty: number;
    unit: string;
    location: Location;
  }) => void;
};

const UNITS = ["units", "kg", "g", "L", "ml", "packs"] as const;
const LOCS: Location[] = ["Pantry", "Fridge", "Freezer"];

export default function AddItemModal({ open, onClose, onSubmit }: Props) {
  const [name, setName] = useState("");
  const [qty, setQty] = useState(1);
  const [unit, setUnit] = useState<string>("units");
  const [loc, setLoc] = useState<Location>("Pantry");
  const first = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => first.current?.focus(), 0);
    }
  }, [open]);

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!name.trim() || qty <= 0) return;
    onSubmit({ baseName: name.trim(), qty, unit, location: loc });
    setName(""); setQty(1); setUnit("units"); setLoc("Pantry");
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[92%] max-w-md sp-card sp-card-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-extrabold">Add item</h3>
          <button className="btn-icon" onClick={onClose} aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="text-sm">Name</label>
            <input
              ref={first}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input mt-1"
              placeholder="e.g. Tomatoes"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-sm">Qty</label>
              <input
                type="number"
                min={1}
                value={qty}
                onChange={(e) => setQty(parseInt(e.target.value || "1"))}
                className="input mt-1"
              />
            </div>
            <div>
              <label className="text-sm">Unit</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="select mt-1"
              >
                {UNITS.map((u) => (
                  <option key={u}>{u}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm">Location</label>
              <select
                value={loc}
                onChange={(e) => setLoc(e.target.value as Location)}
                className="select mt-1"
              >
                {LOCS.map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </select>
            </div>
          </div>

          <button type="submit" className="sp-btn sp-btn-primary w-full mt-2">
            <PlusCircle className="w-4 h-4" /> Add
          </button>
        </form>
      </div>
    </div>
  );
}
