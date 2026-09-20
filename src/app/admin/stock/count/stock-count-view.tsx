"use client";

import { useState } from "react";
import { useLanguage, pick } from "@/lib/language-context";
import { logRestock, submitOpeningCount, submitClosingCount } from "@/app/actions/stock";
import {
  IconCheckCircle,
  IconMoonStars,
  IconSunrise,
} from "@/app/admin/stock/icons";

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

function StepBadge({ done }: { done: boolean }) {
  const { lang } = useLanguage();
  if (!done) return null;
  return (
    <span className="flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
      <IconCheckCircle className="h-3.5 w-3.5" />
      {pick(lang, "تم", "Fait")}
    </span>
  );
}

export function StockCountView({
  workstation,
  openingSubmitted,
  closingSubmitted,
  openingEntries,
  closingEntries,
}: {
  workstation: Workstation;
  openingSubmitted: boolean;
  closingSubmitted: boolean;
  openingEntries: ExistingEntry[];
  closingEntries: ExistingEntry[];
}) {
  const { lang } = useLanguage();
  const [restockOpenFor, setRestockOpenFor] = useState<string | null>(null);

  function entryQty(entries: ExistingEntry[], workstationIngredientId: string) {
    const found = entries.find((e) => e.workstationIngredientId === workstationIngredientId);
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
          "أدخل الكمية عند بداية الوردية، سجل التموين أثناء الخدمة، ثم أدخل الكمية المتبقية في النهاية.",
          "Saisissez la quantité au début du service, enregistrez les réapprovisionnements pendant le service, puis la quantité restante à la fin."
        )}
      </p>

      {/* Step 1: beginning of shift */}
      <section className="mb-8 rounded-lg border-2 border-neutral-300 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <IconSunrise className="h-5 w-5 text-amber-500" />
            {pick(lang, "بداية الوردية", "Début de service")}
          </h2>
          <StepBadge done={openingSubmitted} />
        </div>

        {openingSubmitted ? (
          <div className="flex flex-col divide-y divide-neutral-100">
            {workstation.ingredients.map((wi) => (
              <div key={wi.id} className="flex items-center justify-between py-2 text-sm">
                <span>{wi.ingredient.name}</span>
                <span className="text-neutral-500">
                  {entryQty(openingEntries, wi.id) || "—"} {wi.ingredient.unit}
                </span>
              </div>
            ))}
          </div>
        ) : workstation.ingredients.length > 0 ? (
          <form action={submitOpeningCount} className="flex flex-col gap-3">
            <p className="text-xs text-neutral-500">
              {pick(
                lang,
                "الكمية المقترحة هي ما توقعه النظام، صححها حسب ما تراه فعلياً على الطاولة.",
                "La quantité suggérée est celle attendue par le système ; corrigez-la selon ce que vous voyez réellement sur le poste."
              )}
            </p>
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
                  defaultValue={wi.currentQuantity}
                  required
                  className="w-32 rounded-md border border-neutral-300 px-2 py-1.5 text-sm focus:border-neutral-900 focus:outline-none"
                />
              </div>
            ))}
            <button
              type="submit"
              className="mt-2 self-start cursor-pointer rounded-lg bg-neutral-900 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-700"
            >
              {pick(lang, "تأكيد بداية الوردية", "Confirmer le début de service")}
            </button>
          </form>
        ) : (
          <p className="text-sm text-neutral-400">
            {pick(lang, "لا توجد مكوّنات في هذه المحطة.", "Aucun ingrédient sur ce poste.")}
          </p>
        )}
      </section>

      {/* Live stock + mid-shift restocks, available once the shift has started */}
      {openingSubmitted && (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-medium text-neutral-500">
            {pick(lang, "المخزون الحالي", "Stock en cours")}
          </h2>
          <div className="flex flex-col divide-y divide-neutral-100 rounded-lg border border-neutral-200 px-4">
            {workstation.ingredients.map((wi) => (
              <div key={wi.id} className="py-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {wi.ingredient.name}{" "}
                    <span className="font-normal text-neutral-400">
                      · {wi.currentQuantity} {wi.ingredient.unit}
                    </span>
                  </span>
                  {!closingSubmitted && (
                    <button
                      type="button"
                      onClick={() => setRestockOpenFor(restockOpenFor === wi.id ? null : wi.id)}
                      className="cursor-pointer text-xs text-neutral-600 transition-colors hover:text-neutral-900 hover:underline"
                    >
                      {pick(lang, "تموين", "Réappro")}
                    </button>
                  )}
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
                      className="w-40 rounded-md border border-neutral-300 px-2 py-1.5 text-sm focus:border-neutral-900 focus:outline-none"
                    />
                    <input
                      type="text"
                      name="note"
                      placeholder={pick(lang, "ملاحظة (اختياري)", "Note (optionnel)")}
                      className="flex-1 rounded-md border border-neutral-300 px-2 py-1.5 text-sm focus:border-neutral-900 focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="cursor-pointer rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-neutral-700"
                    >
                      {pick(lang, "تسجيل", "Enregistrer")}
                    </button>
                  </form>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Step 2: end of shift */}
      <section className="rounded-lg border-2 border-neutral-300 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <IconMoonStars className="h-5 w-5 text-indigo-500" />
            {pick(lang, "نهاية الوردية", "Fin de service")}
          </h2>
          <StepBadge done={closingSubmitted} />
        </div>

        {!openingSubmitted ? (
          <p className="text-sm text-neutral-400">
            {pick(
              lang,
              "أكمل جرد بداية الوردية أولاً.",
              "Complétez d'abord le comptage de début de service."
            )}
          </p>
        ) : closingSubmitted ? (
          <div className="flex flex-col divide-y divide-neutral-100">
            {workstation.ingredients.map((wi) => (
              <div key={wi.id} className="flex items-center justify-between py-2 text-sm">
                <span>{wi.ingredient.name}</span>
                <span className="text-neutral-500">
                  {entryQty(closingEntries, wi.id) || "—"} {wi.ingredient.unit}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <form action={submitClosingCount} className="flex flex-col gap-3">
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
                  defaultValue={entryQty(closingEntries, wi.id)}
                  required
                  className="w-32 rounded-md border border-neutral-300 px-2 py-1.5 text-sm focus:border-neutral-900 focus:outline-none"
                />
              </div>
            ))}
            <button
              type="submit"
              className="mt-2 self-start cursor-pointer rounded-lg bg-neutral-900 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-700"
            >
              {pick(lang, "إرسال جرد النهاية", "Envoyer l'inventaire de fin")}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
