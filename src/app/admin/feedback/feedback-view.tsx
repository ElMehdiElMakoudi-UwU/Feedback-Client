"use client";

import { useLanguage, pick } from "@/lib/language-context";
import { KpiCard } from "@/app/admin/kpi-card";
import { IconStar, IconUsers, IconAlertTriangle } from "@/app/admin/stock/icons";

type FeedbackEntry = {
  id: string;
  tableNumber: string;
  foodRating: number;
  serviceRating: number;
  comment: string | null;
  enteredDraw: boolean;
  createdAt: Date;
};

type ItemRatingSummary = {
  menuItemId: string;
  nameAr: string;
  nameFr: string;
  count: number;
  average: number;
};

export function AdminFeedbackView({
  feedback,
  foodAvg,
  serviceAvg,
  lowRatingCount,
  itemRatingSummaries,
}: {
  feedback: FeedbackEntry[];
  foodAvg: string;
  serviceAvg: string;
  lowRatingCount: number;
  itemRatingSummaries: ItemRatingSummary[];
}) {
  const { lang } = useLanguage();

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">
        {pick(lang, "التقييمات", "Avis")}
      </h1>

      <div className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <KpiCard
          icon={IconStar}
          label={pick(lang, "متوسط تقييم الطعام", "Note moyenne (plat)")}
          value={foodAvg}
          accent
        />
        <KpiCard
          icon={IconUsers}
          label={pick(lang, "متوسط تقييم الخدمة", "Note moyenne (service)")}
          value={serviceAvg}
          accent
        />
        <KpiCard
          icon={IconAlertTriangle}
          label={pick(lang, "تقييمات منخفضة (≤2)", "Notes basses (≤2)")}
          value={lowRatingCount}
          tone={lowRatingCount > 0 ? "warn" : "good"}
        />
      </div>

      {itemRatingSummaries.length > 0 && (
        <div className="mb-10">
          <h2 className="mb-4 text-lg font-semibold tracking-tight">
            {pick(lang, "تقييم الأطباق", "Notes par plat")}
          </h2>
          <div className="flex flex-col divide-y divide-neutral-100 rounded-lg border border-neutral-200">
            {itemRatingSummaries.map((item) => {
              const flagged = item.average <= 2.5;
              return (
                <div
                  key={item.menuItemId}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">
                      {pick(lang, item.nameAr, item.nameFr)}
                    </span>
                    {flagged && (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                        {pick(lang, "يحتاج إلى اهتمام", "Nécessite attention")}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-neutral-600">
                    <span className="font-semibold text-neutral-900">
                      {item.average.toFixed(1)}★
                    </span>
                    <span className="text-neutral-400">
                      ({item.count}{" "}
                      {pick(lang, "تقييم", item.count > 1 ? "avis" : "avis")})
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-col divide-y divide-neutral-100">
        {feedback.length === 0 && (
          <p className="py-6 text-neutral-500">
            {pick(lang, "لا توجد تقييمات بعد.", "Aucun avis pour le moment.")}
          </p>
        )}
        {feedback.map((entry) => {
          const flagged = entry.foodRating <= 2 || entry.serviceRating <= 2;
          return (
            <div key={entry.id} className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">
                    {pick(lang, "طاولة", "Table")} {entry.tableNumber}
                  </span>
                  {flagged && (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                      {pick(lang, "يحتاج إلى اهتمام", "Nécessite attention")}
                    </span>
                  )}
                  {entry.enteredDraw && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                      🎁 {pick(lang, "مشارك في السحب", "Dans le tirage")}
                    </span>
                  )}
                </div>
                <span className="text-xs text-neutral-400">
                  {entry.createdAt.toLocaleString(
                    lang === "ar" ? "ar-MA" : "fr-MA"
                  )}
                </span>
              </div>
              <div className="mt-1 flex gap-4 text-sm text-neutral-600">
                <span>
                  {pick(lang, "الطعام", "Plat")}: {entry.foodRating}★
                </span>
                <span>
                  {pick(lang, "الخدمة", "Service")}: {entry.serviceRating}★
                </span>
              </div>
              {entry.comment && (
                <p className="mt-2 text-sm text-neutral-700">
                  &ldquo;{entry.comment}&rdquo;
                </p>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}
