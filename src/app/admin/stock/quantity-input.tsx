"use client";

import { unitOptions } from "@/lib/units";

// Number input for an ingredient quantity. When the ingredient's base unit is
// convertible (kg/g, L/cl/ml), a unit picker named `${name}_unit` sits next to
// it and the server action converts the value back to the base unit.
export function QuantityInput({
  name,
  baseUnit,
  className,
  ...inputProps
}: {
  name: string;
  baseUnit: string;
  className?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "name" | "type" | "step">) {
  const options = unitOptions(baseUnit);
  return (
    <div className="flex items-center">
      <input
        type="number"
        name={name}
        step="any"
        min="0"
        {...inputProps}
        className={`${className ?? ""} ${options ? "rounded-e-none" : ""}`}
      />
      {options ? (
        <select
          name={`${name}_unit`}
          key={baseUnit}
          defaultValue={options[0].key}
          aria-label="Unité"
          className="cursor-pointer rounded-e-md border border-s-0 border-neutral-300 bg-neutral-50 px-1.5 py-1.5 text-xs text-neutral-600 focus:border-neutral-900 focus:outline-none"
        >
          {options.map((o) => (
            <option key={o.key} value={o.key}>
              {o.label}
            </option>
          ))}
        </select>
      ) : (
        <span className="ms-1.5 text-xs text-neutral-400">{baseUnit}</span>
      )}
    </div>
  );
}
