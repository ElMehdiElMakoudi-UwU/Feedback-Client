"use client";

import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { useLanguage, pick, type Lang } from "@/lib/language-context";
import { saveDailySales } from "@/app/actions/stock";
import { IconCart, IconSearch } from "@/app/admin/stock/icons";

type MenuItem = {
  id: string;
  nameFr: string;
  nameAr: string;
  priceLarge: number | null;
};

type MenuCategory = {
  id: string;
  nameFr: string;
  section: { nameFr: string };
  items: MenuItem[];
};

type ExistingItem = { menuItemId: string; size: string | null; quantitySold: number };

export function StockSalesView({
  categories,
  date,
  existingItems,
}: {
  categories: MenuCategory[];
  date: string;
  existingItems: ExistingItem[];
}) {
  const { lang } = useLanguage();
  const [query, setQuery] = useState("");

  function existingQty(menuItemId: string, size: string | null) {
    const found = existingItems.find(
      (i) => i.menuItemId === menuItemId && i.size === size
    );
    return found ? String(found.quantitySold) : "";
  }

  const q = query.trim().toLowerCase();
  function itemMatches(item: MenuItem) {
    if (!q) return true;
    return item.nameFr.toLowerCase().includes(q) || item.nameAr.includes(q);
  }

  const categoryHasMatch = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const category of categories) {
      map.set(category.id, category.items.some(itemMatches));
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories, q]);

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="mb-2 flex items-center gap-2 text-2xl font-semibold tracking-tight">
        <IconCart className="h-6 w-6 text-neutral-400" />
        {pick(lang, "المبيعات اليومية", "Ventes du jour")}
      </h1>
      <p className="mb-6 text-sm text-neutral-500">
        {pick(
          lang,
          "أدخل عدد الوحدات المباعة من كل طبق ليحسب النظام الاستهلاك المتوقع من المكوّنات.",
          "Saisissez les quantités vendues de chaque plat pour que le système calcule la consommation d'ingrédients attendue."
        )}
      </p>

      <form method="get" className="mb-6 flex items-center gap-3">
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

      <div className="relative mb-6">
        <IconSearch className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={pick(lang, "بحث عن طبق...", "Rechercher un plat...")}
          className="w-full rounded-md border border-neutral-300 py-2 ps-9 pe-3 text-sm focus:border-neutral-900 focus:outline-none"
        />
      </div>

      <form action={saveDailySales} className="flex flex-col gap-8">
        <input type="hidden" name="date" value={date} />

        {categories.map((category) => (
          <section
            key={category.id}
            className={`rounded-lg border-2 border-neutral-300 p-5 ${
              categoryHasMatch.get(category.id) ? "" : "hidden"
            }`}
          >
            <h2 className="mb-4 text-lg font-semibold">
              {category.section.nameFr} — {category.nameFr}
            </h2>
            <div className="flex flex-col divide-y divide-neutral-100">
              {category.items.map((item) => (
                <div
                  key={item.id}
                  className={`flex flex-wrap items-center justify-between gap-3 py-2 ${
                    itemMatches(item) ? "" : "hidden"
                  }`}
                >
                  <span className="text-sm">
                    {item.nameFr}{" "}
                    <span className="text-neutral-400">/ {item.nameAr}</span>
                  </span>
                  <div className="flex items-center gap-3">
                    {item.priceLarge != null ? (
                      <>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          name={`sold_${item.id}_REGULAR`}
                          defaultValue={existingQty(item.id, "REGULAR")}
                          placeholder={pick(lang, "صغير", "Régulier")}
                          className="w-24 rounded-md border border-neutral-300 px-2 py-1.5 text-sm focus:border-neutral-900 focus:outline-none"
                        />
                        <input
                          type="number"
                          min="0"
                          step="1"
                          name={`sold_${item.id}_LARGE`}
                          defaultValue={existingQty(item.id, "LARGE")}
                          placeholder={pick(lang, "كبير", "Grande")}
                          className="w-24 rounded-md border border-neutral-300 px-2 py-1.5 text-sm focus:border-neutral-900 focus:outline-none"
                        />
                      </>
                    ) : (
                      <input
                        type="number"
                        min="0"
                        step="1"
                        name={`sold_${item.id}`}
                        defaultValue={existingQty(item.id, null)}
                        placeholder="0"
                        className="w-24 rounded-md border border-neutral-300 px-2 py-1.5 text-sm focus:border-neutral-900 focus:outline-none"
                      />
                    )}
                  </div>
                </div>
              ))}
              {category.items.length === 0 && (
                <p className="py-2 text-sm text-neutral-400">
                  {pick(lang, "لا توجد أطباق.", "Aucun plat.")}
                </p>
              )}
            </div>
          </section>
        ))}

        {q && [...categoryHasMatch.values()].every((v) => !v) && (
          <p className="text-sm text-neutral-400">
            {pick(
              lang,
              "لا توجد أطباق مطابقة. جرّب كلمات بحث أخرى.",
              "Aucun plat ne correspond. Essayez d'autres termes de recherche."
            )}
          </p>
        )}

        <div className="sticky bottom-4 self-start">
          <SaveButton lang={lang} />
        </div>
      </form>
    </main>
  );
}

function SaveButton({ lang }: { lang: Lang }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="cursor-pointer rounded-lg bg-neutral-900 px-6 py-2.5 text-sm font-medium text-white shadow-lg transition-colors hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending
        ? pick(lang, "جارٍ الحفظ...", "Enregistrement...")
        : pick(lang, "حفظ المبيعات", "Enregistrer les ventes")}
    </button>
  );
}
