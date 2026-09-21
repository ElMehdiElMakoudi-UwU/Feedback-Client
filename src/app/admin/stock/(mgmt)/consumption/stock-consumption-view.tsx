"use client";

import { Fragment, useState } from "react";
import { useLanguage, pick } from "@/lib/language-context";
import { isVarianceAlert } from "@/lib/stock";
import type { IngredientConsumption } from "@/lib/stock";
import { IconAlertTriangle, IconCheckCircle, IconChevronDown, IconPackage } from "@/app/admin/stock/icons";

function ingredientIsAlert(ingredient: IngredientConsumption) {
  return (
    ingredient.totalVariance != null && isVarianceAlert(ingredient.totalVariance, ingredient.totalExpected)
  );
}

export function StockConsumptionView({
  date,
  ingredients,
}: {
  date: string;
  ingredients: IngredientConsumption[];
}) {
  const { lang } = useLanguage();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="mb-6 flex items-center gap-2 text-2xl font-semibold tracking-tight">
        <IconPackage className="h-6 w-6 text-neutral-400" />
        {pick(lang, "الاستهلاك حسب المكوّن", "Consommation par ingrédient")}
      </h1>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <form method="get" className="flex items-center gap-2">
          <label className="text-sm font-medium text-neutral-700">{pick(lang, "التاريخ", "Date")}</label>
          <input
            type="date"
            name="date"
            defaultValue={date}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
          />
          <button
            type="submit"
            className="cursor-pointer rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium transition-colors hover:bg-neutral-50"
          >
            {pick(lang, "عرض", "Afficher")}
          </button>
        </form>
      </div>

      <p className="mb-6 text-sm text-neutral-500">
        {pick(
          lang,
          "المجموع الكلي لكل مكوّن عبر جميع المحطات (تاكوس، بيتزا، باستيتشو...). اضغط على مكوّن لعرض التفصيل حسب المحطة.",
          "Total tous postes confondus pour chaque ingrédient (Tacos, Pizza, Pasticcio...). Cliquez sur un ingrédient pour voir le détail par poste."
        )}
      </p>

      <div className="overflow-hidden rounded-lg border-2 border-neutral-300">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50 text-left text-xs text-neutral-500">
              <th className="py-2 pl-4 w-6"></th>
              <th className="py-2">{pick(lang, "المكوّن", "Ingrédient")}</th>
              <th className="py-2 text-right">{pick(lang, "المتوقع (الكل)", "Attendu (total)")}</th>
              <th className="py-2 text-right">{pick(lang, "الفعلي (الكل)", "Consommé réel (total)")}</th>
              <th className="py-2 pr-4 text-right">{pick(lang, "الفرق", "Écart")}</th>
            </tr>
          </thead>
          <tbody>
            {ingredients.map((ingredient) => {
              const alert = ingredientIsAlert(ingredient);
              const isOpen = expandedId === ingredient.ingredientId;
              return (
                <Fragment key={ingredient.ingredientId}>
                  <tr
                    onClick={() =>
                      setExpandedId(isOpen ? null : ingredient.ingredientId)
                    }
                    className="cursor-pointer border-b border-neutral-100 hover:bg-neutral-50"
                  >
                    <td className="py-2 pl-4">
                      {ingredient.totalVariance != null &&
                        (alert ? (
                          <IconAlertTriangle className="h-4 w-4 text-red-500" />
                        ) : (
                          <IconCheckCircle className="h-4 w-4 text-green-500" />
                        ))}
                    </td>
                    <td className="py-2">
                      <span className="inline-flex items-center gap-1.5">
                        <IconChevronDown
                          className={`h-3.5 w-3.5 text-neutral-400 transition-transform ${
                            isOpen ? "rotate-180" : ""
                          }`}
                        />
                        {ingredient.ingredientName}{" "}
                        <span className="text-neutral-400">({ingredient.unit})</span>
                      </span>
                    </td>
                    <td className="py-2 text-right text-neutral-600">
                      {ingredient.totalExpected.toFixed(2)}
                    </td>
                    <td className="py-2 text-right text-neutral-600">
                      {ingredient.totalActual != null
                        ? ingredient.totalActual.toFixed(2)
                        : pick(lang, "قيد الحساب", "en attente")}
                    </td>
                    <td
                      className={`py-2 pr-4 text-right font-medium ${
                        alert ? "text-red-600" : "text-neutral-500"
                      }`}
                    >
                      {ingredient.totalVariance != null ? ingredient.totalVariance.toFixed(2) : "—"}
                    </td>
                  </tr>
                  {isOpen && (
                    <tr>
                      <td colSpan={5} className="bg-neutral-50 px-4 py-3">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left text-xs text-neutral-500">
                              <th className="py-1">{pick(lang, "المحطة", "Poste")}</th>
                              <th className="py-1 text-right">{pick(lang, "المتوقع", "Attendu")}</th>
                              <th className="py-1 text-right">{pick(lang, "الفعلي", "Réel")}</th>
                              <th className="py-1 text-right">{pick(lang, "الفرق", "Écart")}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {ingredient.byWorkstation.map((ws) => {
                              const wsAlert =
                                ws.variance != null && isVarianceAlert(ws.variance, ws.expectedConsumed);
                              return (
                                <tr key={ws.workstationId} className="border-t border-neutral-200">
                                  <td className="py-1.5">
                                    {ws.kitchenName} — {ws.workstationName}
                                  </td>
                                  <td className="py-1.5 text-right text-neutral-600">
                                    {ws.expectedConsumed.toFixed(2)}
                                  </td>
                                  <td className="py-1.5 text-right text-neutral-600">
                                    {ws.actualConsumed != null
                                      ? ws.actualConsumed.toFixed(2)
                                      : pick(lang, "لم يتم الجرد", "pas encore compté")}
                                  </td>
                                  <td
                                    className={`py-1.5 text-right font-medium ${
                                      wsAlert ? "text-red-600" : "text-neutral-500"
                                    }`}
                                  >
                                    {ws.variance != null ? ws.variance.toFixed(2) : "—"}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>

        {ingredients.length === 0 && (
          <p className="px-4 py-6 text-sm text-neutral-400">
            {pick(
              lang,
              "لا توجد بيانات استهلاك لهذا اليوم بعد.",
              "Aucune donnée de consommation pour cette date pour le moment."
            )}
          </p>
        )}
      </div>
    </main>
  );
}
