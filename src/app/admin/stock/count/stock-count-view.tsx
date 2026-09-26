"use client";

import { useLanguage, pick } from "@/lib/language-context";
import { logRestocksBatch, submitOpeningCount, submitClosingCount } from "@/app/actions/stock";
import {
  IconCamera,
  IconCheckCircle,
  IconMoonStars,
  IconSunrise,
} from "@/app/admin/stock/icons";
import { QuantityInput } from "@/app/admin/stock/quantity-input";

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

type ExistingEntry = { workstationIngredientId: string; actualQuantity: number; photoUrl?: string | null };

type Restock = {
  id: string;
  workstationIngredientId: string;
  quantity: number;
  note: string | null;
  photoUrl: string | null;
  createdAt: string;
};

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

// Compact file input for attaching a scale-reading photo to a quantity
// entry. `capture="environment"` opens the back camera directly on mobile,
// which is how workers actually use this (phone at the scale), while still
// falling back to a normal file picker on desktop.
function PhotoField({ name }: { name: string }) {
  const { lang } = useLanguage();
  return (
    <label className="flex shrink-0 cursor-pointer items-center gap-1 rounded-md border border-neutral-300 px-2 py-1.5 text-xs text-neutral-500 transition-colors hover:border-neutral-400 hover:text-neutral-700">
      <IconCamera className="h-4 w-4" />
      <span className="hidden sm:inline">{pick(lang, "صورة", "Photo")}</span>
      <input type="file" name={name} accept="image/*" capture="environment" className="hidden" />
    </label>
  );
}

function PhotoThumb({ url }: { url: string }) {
  const { lang } = useLanguage();
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="shrink-0 text-xs text-neutral-500 underline decoration-dotted hover:text-neutral-900"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={pick(lang, "صورة الميزان", "Photo de la balance")}
        className="h-8 w-8 rounded object-cover"
      />
    </a>
  );
}

export function StockCountView({
  workstation,
  openingSubmitted,
  closingSubmitted,
  openingEntries,
  closingEntries,
  todayRestocks,
  today,
}: {
  workstation: Workstation;
  openingSubmitted: boolean;
  closingSubmitted: boolean;
  openingEntries: ExistingEntry[];
  closingEntries: ExistingEntry[];
  todayRestocks: Restock[];
  today: string;
}) {
  const { lang } = useLanguage();

  function restockTotal(workstationIngredientId: string) {
    return todayRestocks
      .filter((r) => r.workstationIngredientId === workstationIngredientId)
      .reduce((sum, r) => sum + r.quantity, 0);
  }

  function entryQty(entries: ExistingEntry[], workstationIngredientId: string) {
    const found = entries.find((e) => e.workstationIngredientId === workstationIngredientId);
    return found ? String(found.actualQuantity) : "";
  }

  function entryPhoto(entries: ExistingEntry[], workstationIngredientId: string) {
    return entries.find((e) => e.workstationIngredientId === workstationIngredientId)?.photoUrl || null;
  }

  const formattedDate = new Date(today).toLocaleDateString(lang === "ar" ? "ar" : "fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">
        {workstation.kitchen.name} — {workstation.name}
      </h1>
      <p className="mb-4 text-sm font-medium capitalize text-neutral-700">{formattedDate}</p>
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
            {workstation.ingredients.map((wi) => {
              const photo = entryPhoto(openingEntries, wi.id);
              return (
                <div key={wi.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span>{wi.ingredient.name}</span>
                  <div className="flex items-center gap-2">
                    {photo && <PhotoThumb url={photo} />}
                    <span className="text-neutral-500">
                      {entryQty(openingEntries, wi.id) || "—"} {wi.ingredient.unit}
                    </span>
                  </div>
                </div>
              );
            })}
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
                <div className="flex items-center gap-2">
                  <QuantityInput
                    name={`qty_${wi.id}`}
                    baseUnit={wi.ingredient.unit}
                    defaultValue={wi.currentQuantity}
                    required
                    className="w-28 rounded-md border border-neutral-300 px-2 py-1.5 text-sm focus:border-neutral-900 focus:outline-none"
                  />
                  <PhotoField name={`photo_${wi.id}`} />
                </div>
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

      {/* Live stock, available once the shift has started */}
      {openingSubmitted && (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-medium text-neutral-500">
            {pick(lang, "المخزون الحالي", "Stock en cours")}
          </h2>
          <div className="flex flex-col divide-y divide-neutral-100 rounded-lg border border-neutral-200 px-4">
            {workstation.ingredients.map((wi) => {
              const restocked = restockTotal(wi.id);
              return (
                <div key={wi.id} className="flex items-center justify-between py-3 text-sm">
                  <span className="font-medium">{wi.ingredient.name}</span>
                  <span className="text-neutral-400">
                    {wi.currentQuantity} {wi.ingredient.unit}
                    {restocked > 0 && (
                      <span className="ml-2 text-green-600">
                        (+{restocked} {pick(lang, "اليوم", "aujourd'hui")})
                      </span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Batch entry for restocks jotted on paper during service */}
      {openingSubmitted && !closingSubmitted && (
        <section className="mb-8 rounded-lg border-2 border-neutral-300 p-5">
          <h2 className="mb-1 text-lg font-semibold">
            {pick(lang, "التموين المسجل يدوياً", "Réapprovisionnements du jour")}
          </h2>
          <p className="mb-4 text-xs text-neutral-500">
            {pick(
              lang,
              "أدخل الكميات التي أضفتها خلال الخدمة وسجلتها على الورقة، ثم أرسل قبل جرد النهاية.",
              "Saisissez les quantités notées sur papier pendant le service, puis envoyez avant le comptage de fin de service."
            )}
          </p>
          <form action={logRestocksBatch} className="flex flex-col gap-3">
            <input type="hidden" name="workstationId" value={workstation.id} />
            {workstation.ingredients.map((wi) => (
              <div key={wi.id} className="flex items-center gap-2">
                <label className="w-40 shrink-0 text-sm">
                  {wi.ingredient.name} ({wi.ingredient.unit})
                </label>
                <QuantityInput
                  name={`restock_${wi.id}`}
                  baseUnit={wi.ingredient.unit}
                  placeholder="0"
                  className="w-20 rounded-md border border-neutral-300 px-2 py-1.5 text-sm focus:border-neutral-900 focus:outline-none"
                />
                <input
                  type="text"
                  name={`restocknote_${wi.id}`}
                  placeholder={pick(lang, "ملاحظة (اختياري)", "Note (optionnel)")}
                  className="flex-1 rounded-md border border-neutral-300 px-2 py-1.5 text-sm focus:border-neutral-900 focus:outline-none"
                />
                <PhotoField name={`restockphoto_${wi.id}`} />
              </div>
            ))}
            <button
              type="submit"
              className="mt-2 self-start cursor-pointer rounded-lg bg-neutral-900 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-700"
            >
              {pick(lang, "تسجيل التموين", "Enregistrer les réapprovisionnements")}
            </button>
          </form>

          {todayRestocks.length > 0 && (
            <div className="mt-5 border-t border-neutral-100 pt-4">
              <h3 className="mb-2 text-xs font-medium text-neutral-400">
                {pick(lang, "سجل اليوم", "Historique du jour")}
              </h3>
              <ul className="flex flex-col gap-1.5 text-xs text-neutral-500">
                {todayRestocks.map((r) => {
                  const wi = workstation.ingredients.find((w) => w.id === r.workstationIngredientId);
                  return (
                    <li key={r.id} className="flex items-center gap-2">
                      {r.photoUrl && <PhotoThumb url={r.photoUrl} />}
                      <span>
                        {new Date(r.createdAt).toLocaleTimeString(lang === "ar" ? "ar" : "fr-FR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        — {wi?.ingredient.name ?? "?"} +{r.quantity} {wi?.ingredient.unit}
                        {r.note ? ` (${r.note})` : ""}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
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
            {workstation.ingredients.map((wi) => {
              const photo = entryPhoto(closingEntries, wi.id);
              return (
                <div key={wi.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span>{wi.ingredient.name}</span>
                  <div className="flex items-center gap-2">
                    {photo && <PhotoThumb url={photo} />}
                    <span className="text-neutral-500">
                      {entryQty(closingEntries, wi.id) || "—"} {wi.ingredient.unit}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <form action={submitClosingCount} className="flex flex-col gap-3">
            {workstation.ingredients.map((wi) => (
              <div key={wi.id} className="flex items-center justify-between gap-3">
                <label className="text-sm">
                  {wi.ingredient.name} ({wi.ingredient.unit})
                </label>
                <div className="flex items-center gap-2">
                  <QuantityInput
                    name={`qty_${wi.id}`}
                    baseUnit={wi.ingredient.unit}
                    defaultValue={entryQty(closingEntries, wi.id)}
                    required
                    className="w-28 rounded-md border border-neutral-300 px-2 py-1.5 text-sm focus:border-neutral-900 focus:outline-none"
                  />
                  <PhotoField name={`photo_${wi.id}`} />
                </div>
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
