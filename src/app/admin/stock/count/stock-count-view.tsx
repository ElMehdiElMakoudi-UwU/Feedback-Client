"use client";

import { useState } from "react";
import { useLanguage, pick } from "@/lib/language-context";
import { logRestock, submitStockCount } from "@/app/actions/stock";

type WorkstationIngredient = {
  id: string;
  currentQuantity: number;
  ingredient: { id: string; name: string; unit: string };
};

type Workstation = {
  id: string;
  name: string;
  kitchen: { name: string };
  ingredients: WorkstationIngredient[];
};

type ExistingEntry = { workstationIngredientId: string; actualQuantity: number };

export function StockCountView({
  workstation,
  alreadySubmitted,
  existingEntries,
}: {
  workstation: Workstation;
  alreadySubmitted: boolean;
  existingEntries: ExistingEntry[];
}) {
  const { lang } = useLanguage();
  const [restockOpenFor, setRestockOpenFor] = useState<string | null>(null);

  function existingQty(workstationIngredientId: string) {
    const found = existingEntries.find(
      (e) => e.workstationIngredientId === workstationIngredientId
    );
    return found ? String(found.actualQuantity) : "";
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">
        {workstation.kitchen.name} — {workstation.name}
      </h1>
      <p className="mb-8 text-sm text-neutral-500">
        {pick(
          lang,
          "سجل التموين أثناء الوردية، وأدخل الكمية المتبقية في نهاية اليوم.",
          "Enregistrez les réapprovisionnements pendant le service, et saisissez la quantité restante en fin de journée."
        )}
      </p>

      {alreadySubmitted && (
        <p className="mb-6 rounded-md bg-green-50 px-4 py-3 text-sm text-green-800">
          {pick(
            lang,
            "تم إرسال جرد اليوم بالفعل.",
            "L'inventaire de fin de journée a déjà été envoyé aujourd'hui."
          )}
        </p>
      )}

      <div className="mb-10 flex flex-col divide-y divide-neutral-100">
        {workstation.ingredients.map((wi) => (
          <div key={wi.id} className="py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {wi.ingredient.name}{" "}
                <span className="font-normal text-neutral-400">
                  · {wi.currentQuantity} {wi.ingredient.unit}
                </span>
              </span>
              <button
                type="button"
                onClick={() =>
                  setRestockOpenFor(restockOpenFor === wi.id ? null : wi.id)
                }
                className="text-xs text-neutral-600 hover:underline"
              >
                {pick(lang, "تموين", "Réappro")}
              </button>
            </div>
            {restockOpenFor === wi.id && (
              <form
                action={logRestock}
                className="mt-2 flex items-center gap-2"
                onSubmit={() => setRestockOpenFor(null)}
              >
                <input type="hidden" name="workstationIngredientId" value={wi.id} />
                <input
                  type="number"
                  name="quantity"
                  step="0.01"
                  min="0"
                  required
                  placeholder={pick(lang, "الكمية المضافة", "Quantité ajoutée")}
                  className="w-40 rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
                />
                <input
                  type="text"
                  name="note"
                  placeholder={pick(lang, "ملاحظة (اختياري)", "Note (optionnel)")}
                  className="flex-1 rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
                />
                <button
                  type="submit"
                  className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-700"
                >
                  {pick(lang, "تسجيل", "Enregistrer")}
                </button>
              </form>
            )}
          </div>
        ))}
        {workstation.ingredients.length === 0 && (
          <p className="py-3 text-sm text-neutral-400">
            {pick(lang, "لا توجد مكوّنات في هذه المحطة.", "Aucun ingrédient sur ce poste.")}
          </p>
        )}
      </div>

      {!alreadySubmitted && workstation.ingredients.length > 0 && (
        <form action={submitStockCount} className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">
            {pick(lang, "جرد نهاية اليوم", "Inventaire de fin de journée")}
          </h2>
          {workstation.ingredients.map((wi) => (
            <div key={wi.id} className="flex items-center justify-between gap-3">
              <label className="text-sm">
                {wi.ingredient.name} ({wi.ingredient.unit})
              </label>
              <input
                type="number"
                name={`qty_${wi.id}`}
                step="0.01"
                min="0"
                defaultValue={existingQty(wi.id)}
                required
                className="w-32 rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
              />
            </div>
          ))}
          <button
            type="submit"
            className="mt-2 self-start rounded-lg bg-neutral-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-neutral-700"
          >
            {pick(lang, "إرسال الجرد", "Envoyer l'inventaire")}
          </button>
        </form>
      )}
    </main>
  );
}
