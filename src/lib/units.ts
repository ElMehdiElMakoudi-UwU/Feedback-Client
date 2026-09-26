// Unit conversion for ingredient quantities. Each ingredient stores every
// quantity in its own base unit (Ingredient.unit, free text). When that base
// unit is a recognized mass or volume unit, forms let the user type a quantity
// in any compatible unit (e.g. grams for a Kg ingredient) and the server
// converts it back to the base unit before saving.

type UnitDef = { key: string; label: string; family: "mass" | "volume"; toSmallest: number };

const UNITS: UnitDef[] = [
  { key: "kg", label: "kg", family: "mass", toSmallest: 1000 },
  { key: "g", label: "g", family: "mass", toSmallest: 1 },
  { key: "l", label: "L", family: "volume", toSmallest: 1000 },
  { key: "cl", label: "cl", family: "volume", toSmallest: 10 },
  { key: "ml", label: "ml", family: "volume", toSmallest: 1 },
];

const ALIASES: Record<string, string> = {
  kg: "kg", kgs: "kg", kilo: "kg", kilos: "kg", kilogramme: "kg", kilogrammes: "kg", kilogram: "kg", "كغ": "kg", "كلغ": "kg",
  g: "g", gr: "g", grs: "g", gramme: "g", grammes: "g", gram: "g", grams: "g", "غ": "g", "غرام": "g",
  l: "l", litre: "l", litres: "l", liter: "l", liters: "l", "ل": "l", "لتر": "l",
  cl: "cl", centilitre: "cl", centilitres: "cl",
  ml: "ml", millilitre: "ml", millilitres: "ml", "مل": "ml",
};

function findUnit(label: string): UnitDef | undefined {
  const key = ALIASES[label.trim().toLowerCase().replace(/\.$/, "")];
  return UNITS.find((u) => u.key === key);
}

export type UnitOption = { key: string; label: string };

// Units a quantity can be typed in for an ingredient whose base unit is
// `baseUnit`, base unit first. Null when the base unit isn't convertible
// (e.g. "Packet x18", "Unit"), in which case forms show no picker.
export function unitOptions(baseUnit: string): UnitOption[] | null {
  const base = findUnit(baseUnit);
  if (!base) return null;
  const others = UNITS.filter((u) => u.family === base.family && u.key !== base.key);
  return [base, ...others].map(({ key, label }) => ({ key, label }));
}

// Converts `value` typed in `unitKey` into the ingredient's base unit. An
// unknown or incompatible unit key is treated as the base unit itself.
export function toBaseUnit(value: number, unitKey: string | null | undefined, baseUnit: string): number {
  const base = findUnit(baseUnit);
  const from = UNITS.find((u) => u.key === unitKey);
  if (!base || !from || from.family !== base.family) return value;
  return Math.round(((value * from.toSmallest) / base.toSmallest) * 1e6) / 1e6;
}

// Suggestions for the ingredient creation form, so new ingredients use a
// label the converter recognizes.
export const SUGGESTED_UNITS = ["kg", "g", "L", "cl", "ml", "Unité"];
