import React from "react";
import { Minus, Plus } from "lucide-react";

type Props = {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
};

export default function QuantityStepper({
  value,
  onChange,
  min = 0,
  max = 999999,
  step = 1,
  className = "",
}: Props) {
  const dec = () => onChange(Math.max(min, (value || 0) - step));
  const inc = () => onChange(Math.min(max, (value || 0) + step));

  return (
    <div className={`inline-flex items-center gap-1 ${className}`}>
      <button
        type="button"
        onClick={dec}
        className="btn-icon"
        aria-label="Decrease"
        title="Decrease"
      >
        <Minus className="w-4 h-4" />
      </button>
      <span className="min-w-[52px] text-center font-semibold">{value}</span>
      <button
        type="button"
        onClick={inc}
        className="btn-icon"
        aria-label="Increase"
        title="Increase"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
}
