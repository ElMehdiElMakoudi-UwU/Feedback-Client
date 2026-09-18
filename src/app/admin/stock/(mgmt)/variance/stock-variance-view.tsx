"use client";

import { useMemo, useState } from "react";
import { useLanguage, pick } from "@/lib/language-context";
import { isVarianceAlert } from "@/lib/stock";
import {
  IconAlertTriangle,
  IconCheckCircle,
  IconScale,
} from "@/app/admin/stock/icons";

type Entry = {
  id: string;
  actualQuantity: number;
  expectedQuantity: number | null;
  variance: number | null;
  workstationIngredient: {
    ingredient: { name: string; unit: string };
  };
};

type StockCount = {
  id: string;
  finalizedAt: Date | null;
  workstation: { id: string; name: string; kitchen: { name: string } };
  worker: { email: string };
  entries: Entry[];
};

function entryIsAlert(entry: Entry) {
  return (
    entry.variance != null &&
    entry.expectedQuantity != null &&
    isVarianceAlert(entry.variance, entry.expectedQuantity)
  );
}

export function StockVarianceView({
  date,
  stockCounts,
  hasDailySales,
}: {
  date: string;
  stockCounts: StockCount[];
  hasDailySales: boolean;
}) {
  const { lang } = useLanguage();
  const [workstationFilter, setWorkstationFilter] = useState("");
  const [onlyAlerts, setOnlyAlerts] = useState(false);

  const workstationOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const count of stockCounts) {
      map.set(count.workstation.id, `${count.workstation.kitchen.name} — ${count.workstation.name}`);
    }
    return [...map.entries()];
  }, [stockCounts]);

  const totalAlerts = useMemo(
    () => stockCounts.reduce((n, c) => n + c.entries.filter(entryIsAlert).length, 0),
    [stockCounts]
  );
  const totalEntries = useMemo(
    () => stockCounts.reduce((n, c) => n + c.entries.length, 0),
    [stockCounts]
  );

  const visibleCounts = stockCounts.filter(
    (c) => !workstationFilter || c.workstation.id === workstationFilter
  );

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="mb-6 flex items-center gap-2 text-2xl font-semibold tracking-tight">
        <IconScale className="h-6 w-6 text-neutral-400" />
        {pick(lang, "فروقات المخزون", "Écarts de stock")}
      </h1>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <form method="get" className="flex items-center gap-2">
          <label className="text-sm font-medium text-neutral-700">
            {pick(lang, "التاريخ", "Date")}
          </label>
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

        {stockCounts.length > 0 && (
          <>
            <select
              value={workstationFilter}
              onChange={(e) => setWorkstationFilter(e.target.value)}
              className="cursor-pointer rounded-md border border-neutral-300 px-2 py-2 text-sm"
            >
              <option value="">{pick(lang, "كل المحطات", "Tous les postes")}</option>
              {workstationOptions.map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
            <label className="flex cursor-pointer items-center gap-1.5 text-sm text-neutral-600">
              <input
                type="checkbox"
                checked={onlyAlerts}
                onChange={(e) => setOnlyAlerts(e.target.checked)}
                className="cursor-pointer"
              />
              {pick(lang, "الفروقات فقط", "Écarts uniquement")}
            </label>
          </>
        )}
      </div>

      {stockCounts.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-3">
          <div className="flex items-center gap-3 rounded-lg border border-neutral-200 px-4 py-3">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${
                totalAlerts > 0 ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"
              }`}
            >
              {totalAlerts > 0 ? (
                <IconAlertTriangle className="h-5 w-5" />
              ) : (
                <IconCheckCircle className="h-5 w-5" />
              )}
            </div>
            <div>
              <p className="text-lg font-semibold leading-tight">{totalAlerts}</p>
              <p className="text-xs text-neutral-500">
                {pick(lang, `من ${totalEntries} مكوّن يحتاج انتباه`, `sur ${totalEntries} ingrédients à surveiller`)}
              </p>
            </div>
          </div>
        </div>
      )}

      {!hasDailySales && (
        <p className="mb-6 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {pick(
            lang,
            "لم يتم إدخال مبيعات هذا اليوم بعد، لذلك لا يمكن حساب الفروقات.",
            "Les ventes de ce jour n'ont pas encore été saisies, les écarts ne peuvent donc pas être calculés."
          )}
        </p>
      )}

      <div className="flex flex-col gap-6">
        {visibleCounts.map((count) => {
          const entries = onlyAlerts ? count.entries.filter(entryIsAlert) : count.entries;
          if (onlyAlerts && entries.length === 0) return null;
          return (
            <section key={count.id} className="rounded-lg border-2 border-neutral-300 p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                  {count.workstation.kitchen.name} — {count.workstation.name}
                </h2>
                <span className="text-xs text-neutral-400">{count.worker.email}</span>
              </div>

              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-left text-xs text-neutral-500">
                    <th className="py-2 w-6"></th>
                    <th className="py-2">{pick(lang, "المكوّن", "Ingrédient")}</th>
                    <th className="py-2 text-right">{pick(lang, "المتوقع", "Attendu")}</th>
                    <th className="py-2 text-right">{pick(lang, "الفعلي", "Réel")}</th>
                    <th className="py-2 text-right">{pick(lang, "الفرق", "Écart")}</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => {
                    const alert = entryIsAlert(entry);
                    return (
                      <tr key={entry.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                        <td className="py-2">
                          {entry.variance != null &&
                            (alert ? (
                              <IconAlertTriangle className="h-4 w-4 text-red-500" />
                            ) : (
                              <IconCheckCircle className="h-4 w-4 text-green-500" />
                            ))}
                        </td>
                        <td className="py-2">
                          {entry.workstationIngredient.ingredient.name}{" "}
                          <span className="text-neutral-400">
                            ({entry.workstationIngredient.ingredient.unit})
                          </span>
                        </td>
                        <td className="py-2 text-right text-neutral-600">
                          {entry.expectedQuantity != null
                            ? entry.expectedQuantity.toFixed(2)
                            : pick(lang, "قيد الحساب", "en attente")}
                        </td>
                        <td className="py-2 text-right text-neutral-600">
                          {entry.actualQuantity.toFixed(2)}
                        </td>
                        <td
                          className={`py-2 text-right font-medium ${
                            alert ? "text-red-600" : "text-neutral-500"
                          }`}
                        >
                          {entry.variance != null ? entry.variance.toFixed(2) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
          );
        })}

        {stockCounts.length === 0 && (
          <p className="text-sm text-neutral-400">
            {pick(
              lang,
              "لم يقم أي عامل بإدخال الجرد لهذا اليوم بعد.",
              "Aucun ouvrier n'a encore saisi son inventaire pour cette date."
            )}
          </p>
        )}
      </div>
    </main>
  );
}
