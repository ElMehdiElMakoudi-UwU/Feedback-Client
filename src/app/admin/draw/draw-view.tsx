"use client";

import { useLanguage, pick } from "@/lib/language-context";
import { pickWeeklyWinner, clearWeeklyWinner } from "@/app/actions/draw";
import { KpiCard } from "@/app/admin/kpi-card";
import { IconUsers, IconGift, IconStar } from "@/app/admin/stock/icons";

type WinnerFeedback = {
  tableNumber: string;
  phone: string | null;
  foodRating: number;
  serviceRating: number;
  comment: string | null;
};

type Winner = {
  id: string;
  weekKey: string;
  pickedAt: Date;
  feedback: WinnerFeedback;
};

export function AdminDrawView({
  weekKey,
  currentWinner,
  uniquePhones,
  pastWinners,
}: {
  weekKey: string;
  currentWinner: Winner | null;
  uniquePhones: number;
  pastWinners: Winner[];
}) {
  const { lang } = useLanguage();

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">
        {pick(lang, "السحب الأسبوعي", "Tirage hebdomadaire")}
      </h1>
      <p className="mb-6 text-sm text-neutral-500">
        {pick(lang, "الأسبوع الحالي:", "Semaine en cours :")}{" "}
        <span className="font-medium">{weekKey}</span>
      </p>

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <KpiCard
          icon={IconUsers}
          label={pick(lang, "مشاركون مؤهلون", "Participants éligibles")}
          value={uniquePhones}
        />
        <KpiCard
          icon={IconGift}
          label={pick(lang, "حالة السحب", "Statut du tirage")}
          value={
            currentWinner
              ? pick(lang, "تم الاختيار", "Effectué")
              : pick(lang, "بانتظار السحب", "En attente")
          }
          tone={currentWinner ? "good" : "warn"}
        />
        <KpiCard
          icon={IconStar}
          label={pick(lang, "الفائزون السابقون", "Gagnants précédents")}
          value={pastWinners.length}
        />
      </div>

      <div className="rounded-lg border border-neutral-200 p-6">
        {currentWinner ? (
          <div>
            <p className="text-sm font-medium text-green-700">
              {pick(
                lang,
                "تم اختيار الفائز بهذا الأسبوع",
                "Le gagnant de cette semaine a été tiré au sort"
              )}
            </p>
            <div className="mt-3">
              <p className="text-lg font-semibold">
                {pick(lang, "طاولة", "Table")}{" "}
                {currentWinner.feedback.tableNumber}
              </p>
              <p className="text-neutral-700">{currentWinner.feedback.phone}</p>
              <p className="mt-1 text-sm text-neutral-500">
                {pick(lang, "الطعام", "Plat")}:{" "}
                {currentWinner.feedback.foodRating}★ ·{" "}
                {pick(lang, "الخدمة", "Service")}:{" "}
                {currentWinner.feedback.serviceRating}★
              </p>
              {currentWinner.feedback.comment && (
                <p className="mt-2 text-sm text-neutral-600">
                  &ldquo;{currentWinner.feedback.comment}&rdquo;
                </p>
              )}
              <p className="mt-3 text-xs text-neutral-400">
                {pick(lang, "تم الاختيار في", "Tiré le")}{" "}
                {currentWinner.pickedAt.toLocaleString(
                  lang === "ar" ? "ar-MA" : "fr-MA"
                )}
              </p>
            </div>
            <form action={clearWeeklyWinner} className="mt-4">
              <input type="hidden" name="id" value={currentWinner.id} />
              <button
                type="submit"
                className="text-xs text-red-600 hover:underline"
              >
                {pick(lang, "مسح وإعادة الاختيار", "Effacer et retirer")}
              </button>
            </form>
          </div>
        ) : (
          <div>
            <p className="text-sm text-neutral-600">
              {uniquePhones}{" "}
              {pick(
                lang,
                uniquePhones === 1 ? "مشارك مؤهل هذا الأسبوع" : "مشاركون مؤهلون هذا الأسبوع",
                uniquePhones === 1
                  ? "participant éligible cette semaine"
                  : "participants éligibles cette semaine"
              )}
            </p>
            <form action={pickWeeklyWinner} className="mt-4">
              <button
                type="submit"
                disabled={uniquePhones === 0}
                className="w-full rounded-md bg-neutral-900 px-5 py-3.5 text-sm font-medium text-white hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
              >
                {pick(
                  lang,
                  "اختيار فائز هذا الأسبوع",
                  "Tirer le gagnant de la semaine"
                )}
              </button>
            </form>
          </div>
        )}
      </div>

      {pastWinners.length > 0 && (
        <div className="mt-10">
          <h2 className="mb-4 text-lg font-medium">
            {pick(lang, "الفائزون السابقون", "Gagnants précédents")}
          </h2>
          <div className="flex flex-col divide-y divide-neutral-100">
            {pastWinners.map((winner) => (
              <div key={winner.id} className="py-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{winner.weekKey}</span>
                  <span className="text-xs text-neutral-400">
                    {winner.pickedAt.toLocaleDateString(
                      lang === "ar" ? "ar-MA" : "fr-MA"
                    )}
                  </span>
                </div>
                <p className="text-sm text-neutral-600">
                  {pick(lang, "طاولة", "Table")} {winner.feedback.tableNumber} ·{" "}
                  {winner.feedback.phone}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
