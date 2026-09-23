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
type AppItem = { menuItemId: string; size: string | null; quantity: number };

type Size = "REGULAR" | "LARGE" | null;

function variantsOf(item: MenuItem): Size[] {
  return item.priceLarge != null ? ["REGULAR", "LARGE"] : [null];
}

function keyOf(menuItemId: string, size: string | null) {
  return `${menuItemId}_${size ?? ""}`;
}

// POS is the source of truth; the gap is how far the app's orders are from it.
// "missing" = the app took orders but nothing was typed from the POS yet.
type Gap =
  | { kind: "none" }
  | { kind: "match" }
  | { kind: "missing"; app: number }
  | { kind: "diff"; diff: number };

function gapOf(posRaw: string, app: number): Gap {
  if (posRaw === "") return app > 0 ? { kind: "missing", app } : { kind: "none" };
  const pos = Math.trunc(Number(posRaw));
  if (!Number.isFinite(pos)) return { kind: "none" };
  const diff = pos - app;
  return diff === 0 ? { kind: "match" } : { kind: "diff", diff };
}

function hasGap(gap: Gap) {
  return gap.kind === "missing" || gap.kind === "diff";
}

const GRID = "grid grid-cols-[4.5rem_2.5rem_5rem_4.5rem] items-center gap-2";

export function StockSalesView({
  categories,
  date,
  existingItems,
  appItems,
}: {
  categories: MenuCategory[];
  date: string;
  existingItems: ExistingItem[];
  appItems: AppItem[];
}) {
  const { lang } = useLanguage();
  const [query, setQuery] = useState("");
  // Snapshot of the item ids that had a gap when the filter was switched on,
  // so a row doesn't vanish mid-typing the moment its numbers line up.
  const [gapFilter, setGapFilter] = useState<Set<string> | null>(null);
  const onlyGaps = gapFilter !== null;

  const appQty = useMemo(() => {
    const map = new Map<string, number>();
    for (const i of appItems) map.set(keyOf(i.menuItemId, i.size), i.quantity);
    return map;
  }, [appItems]);

  const [posValues, setPosValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const i of existingItems) initial[keyOf(i.menuItemId, i.size)] = String(i.quantitySold);
    return initial;
  });

  function gapFor(menuItemId: string, size: Size) {
    const key = keyOf(menuItemId, size);
    return gapOf(posValues[key] ?? "", appQty.get(key) ?? 0);
  }

  const q = query.trim().toLowerCase();
  function itemVisible(item: MenuItem) {
    if (q && !item.nameFr.toLowerCase().includes(q) && !item.nameAr.includes(q)) return false;
    if (gapFilter && !gapFilter.has(item.id)) return false;
    return true;
  }

  const summary = useMemo(() => {
    let posLower = 0;
    let posHigher = 0;
    let missing = 0;
    for (const category of categories) {
      for (const item of category.items) {
        for (const size of variantsOf(item)) {
          const gap = gapFor(item.id, size);
          if (gap.kind === "missing") missing++;
          else if (gap.kind === "diff" && gap.diff < 0) posLower++;
          else if (gap.kind === "diff" && gap.diff > 0) posHigher++;
        }
      }
    }
    return { posLower, posHigher, missing };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories, posValues, appQty]);

  const anyVisible = categories.some((c) => c.items.some(itemVisible));

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="mb-2 flex items-center gap-2 text-2xl font-semibold tracking-tight">
        <IconCart className="h-6 w-6 text-neutral-400" />
        {pick(lang, "المبيعات اليومية", "Ventes du jour")}
      </h1>
      <p className="mb-6 text-sm text-neutral-500">
        {pick(
          lang,
          "أدخل عدد الوحدات المباعة حسب نظام الكاشير (POS). عمود «التطبيق» يعرض الكميات المطلوبة عبر التطبيق للمقارنة فقط.",
          "Saisissez les quantités vendues selon la caisse (POS). La colonne « App » affiche les quantités commandées via l'application, à titre de comparaison."
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

      <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <SummaryTile
          tone="red"
          count={summary.posLower}
          label={pick(lang, "الكاشير أقل من التطبيق", "Caisse < App")}
          hint={pick(lang, "طلبات في التطبيق غير مسجلة في الكاشير", "Commandé dans l'app, absent de la caisse")}
        />
        <SummaryTile
          tone="amber"
          count={summary.posHigher}
          label={pick(lang, "الكاشير أكثر من التطبيق", "Caisse > App")}
          hint={pick(lang, "مبيعات خارج التطبيق", "Ventes hors application")}
        />
        <SummaryTile
          tone="neutral"
          count={summary.missing}
          label={pick(lang, "غير مُدخل", "Non saisi")}
          hint={pick(lang, "في التطبيق، لكن الكاشير فارغ", "Présent dans l'app, caisse vide")}
        />
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1">
          <IconSearch className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={pick(lang, "بحث عن طبق...", "Rechercher un plat...")}
            className="w-full rounded-md border border-neutral-300 py-2 ps-9 pe-3 text-sm focus:border-neutral-900 focus:outline-none"
          />
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-700">
          <input
            type="checkbox"
            checked={onlyGaps}
            onChange={(e) =>
              setGapFilter(
                e.target.checked
                  ? new Set(
                      categories
                        .flatMap((c) => c.items)
                        .filter((item) => variantsOf(item).some((s) => hasGap(gapFor(item.id, s))))
                        .map((item) => item.id)
                    )
                  : null
              )
            }
            className="h-4 w-4 accent-neutral-900"
          />
          {pick(lang, "الفروقات فقط", "Écarts uniquement")}
        </label>
      </div>

      <form action={saveDailySales} className="flex flex-col gap-8">
        <input type="hidden" name="date" value={date} />

        {categories.map((category) => {
          const visibleItems = category.items.filter(itemVisible);
          return (
            <section
              key={category.id}
              className={`rounded-lg border-2 border-neutral-300 p-5 ${
                visibleItems.length > 0 || (!q && !onlyGaps) ? "" : "hidden"
              }`}
            >
              <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                <h2 className="text-lg font-semibold">
                  {category.section.nameFr} — {category.nameFr}
                </h2>
                {category.items.length > 0 && (
                  <div className={`${GRID} text-xs font-medium text-neutral-500`}>
                    <span />
                    <span className="text-center">{pick(lang, "التطبيق", "App")}</span>
                    <span className="text-center">{pick(lang, "الكاشير", "Caisse")}</span>
                    <span className="text-center">{pick(lang, "الفرق", "Écart")}</span>
                  </div>
                )}
              </div>
              <div className="flex flex-col divide-y divide-neutral-100">
                {category.items.map((item) => (
                  <div
                    key={item.id}
                    className={`flex flex-wrap items-center justify-between gap-3 py-2 ${
                      itemVisible(item) ? "" : "hidden"
                    }`}
                  >
                    <span className="text-sm">
                      {item.nameFr}{" "}
                      <span className="text-neutral-400">/ {item.nameAr}</span>
                    </span>
                    <div className="flex flex-col gap-1.5">
                      {variantsOf(item).map((size) => {
                        const key = keyOf(item.id, size);
                        const app = appQty.get(key) ?? 0;
                        return (
                          <div key={key} className={GRID}>
                            <span className="text-xs text-neutral-500">
                              {size === "REGULAR"
                                ? pick(lang, "صغير", "Régulier")
                                : size === "LARGE"
                                  ? pick(lang, "كبير", "Grande")
                                  : ""}
                            </span>
                            <span
                              className={`text-center text-sm tabular-nums ${
                                app > 0 ? "font-medium text-neutral-900" : "text-neutral-300"
                              }`}
                            >
                              {app}
                            </span>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              name={size ? `sold_${item.id}_${size}` : `sold_${item.id}`}
                              value={posValues[key] ?? ""}
                              onChange={(e) =>
                                setPosValues((prev) => ({ ...prev, [key]: e.target.value }))
                              }
                              placeholder="0"
                              className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm focus:border-neutral-900 focus:outline-none"
                            />
                            <GapBadge gap={gapFor(item.id, size)} lang={lang} />
                          </div>
                        );
                      })}
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
          );
        })}

        {!anyVisible && (q || onlyGaps) && (
          <p className="text-sm text-neutral-400">
            {onlyGaps && !q
              ? pick(lang, "لا توجد فروقات بين الكاشير والتطبيق.", "Aucun écart entre la caisse et l'application.")
              : pick(
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

function SummaryTile({
  tone,
  count,
  label,
  hint,
}: {
  tone: "red" | "amber" | "neutral";
  count: number;
  label: string;
  hint: string;
}) {
  const active = count > 0;
  const styles = !active
    ? "border-neutral-200 text-neutral-400"
    : tone === "red"
      ? "border-red-200 bg-red-50 text-red-700"
      : tone === "amber"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : "border-neutral-300 bg-neutral-50 text-neutral-700";
  return (
    <div className={`rounded-lg border px-3 py-2 ${styles}`}>
      <div className="flex items-baseline gap-2">
        <span className="text-xl font-semibold tabular-nums">{count}</span>
        <span className="text-sm font-medium">{label}</span>
      </div>
      <p className="text-xs opacity-80">{hint}</p>
    </div>
  );
}

function GapBadge({ gap, lang }: { gap: Gap; lang: Lang }) {
  const base = "rounded-md px-1.5 py-1 text-center text-xs font-medium tabular-nums";
  if (gap.kind === "none") return <span className={`${base} text-neutral-300`}>—</span>;
  if (gap.kind === "match") return <span className={`${base} bg-green-50 text-green-700`}>✓</span>;
  if (gap.kind === "missing")
    return (
      <span className={`${base} bg-neutral-100 text-neutral-600`}>
        {pick(lang, "فارغ", "Vide")}
      </span>
    );
  return (
    <span
      className={`${base} ${gap.diff < 0 ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-800"}`}
      title={
        gap.diff < 0
          ? pick(lang, "الكاشير أقل من التطبيق", "Caisse inférieure à l'app")
          : pick(lang, "الكاشير أكثر من التطبيق", "Caisse supérieure à l'app")
      }
    >
      {gap.diff > 0 ? `+${gap.diff}` : `−${Math.abs(gap.diff)}`}
    </span>
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
