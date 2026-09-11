"use client";

import { useLanguage, pick } from "@/lib/language-context";

type FeedbackEntry = {
  id: string;
  tableNumber: string;
  foodRating: number;
  serviceRating: number;
  comment: string | null;
  enteredDraw: boolean;
  createdAt: Date;
};

export function AdminFeedbackView({
  feedback,
  foodAvg,
  serviceAvg,
  lowRatingCount,
}: {
  feedback: FeedbackEntry[];
  foodAvg: string;
  serviceAvg: string;
  lowRatingCount: number;
}) {
  const { lang } = useLanguage();

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="mb-8 text-2xl font-semibold tracking-tight">
        {pick(lang, "التقييمات", "Avis")}
      </h1>

      <div className="mb-10 grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-neutral-200 p-5">
          <p className="text-sm text-neutral-500">
            {pick(lang, "متوسط تقييم الطعام", "Note moyenne (plat)")}
          </p>
          <p className="mt-1 text-2xl font-semibold">{foodAvg}</p>
        </div>
        <div className="rounded-lg border border-neutral-200 p-5">
          <p className="text-sm text-neutral-500">
            {pick(lang, "متوسط تقييم الخدمة", "Note moyenne (service)")}
          </p>
          <p className="mt-1 text-2xl font-semibold">{serviceAvg}</p>
        </div>
        <div className="rounded-lg border border-neutral-200 p-5">
          <p className="text-sm text-neutral-500">
            {pick(lang, "تقييمات منخفضة (≤2)", "Notes basses (≤2)")}
          </p>
          <p className="mt-1 text-2xl font-semibold">{lowRatingCount}</p>
        </div>
      </div>

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
