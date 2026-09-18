"use client";

import Link from "next/link";
import { useLanguage, pick } from "@/lib/language-context";
import { addPointsForOrder, redeemPoints } from "@/app/actions/loyalty";
import { KpiCard } from "@/app/admin/kpi-card";
import { IconGift, IconClipboard, IconSettings, IconStar } from "@/app/admin/stock/icons";

type Transaction = {
  id: string;
  points: number;
  orderTotal: number | null;
  note: string | null;
  createdAt: Date;
};

type Customer = {
  phone: string;
  points: number;
  transactions: Transaction[];
} | null;

type TopCustomer = {
  id: string;
  phone: string;
  points: number;
};

export function LoyaltyView({
  role,
  phone,
  customer,
  topCustomers,
  error,
  ok,
}: {
  role: string;
  phone: string;
  customer: Customer;
  topCustomers: TopCustomer[];
  error?: string;
  ok?: string;
}) {
  const { lang } = useLanguage();
  const searched = phone.length > 0;

  const message =
    ok === "earned"
      ? pick(lang, "تمت إضافة النقاط بنجاح", "Points ajoutés avec succès")
      : ok === "redeemed"
        ? pick(lang, "تم استبدال النقاط بنجاح", "Points échangés avec succès")
        : error === "insufficient"
          ? pick(lang, "لا يوجد رصيد كافٍ من النقاط", "Solde de points insuffisant")
          : error === "invalid"
            ? pick(lang, "المعطيات غير صحيحة", "Données invalides")
            : null;

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          {pick(lang, "برنامج الولاء", "Programme de fidélité")}
        </h1>
        {role === "ADMIN" && (
          <Link
            href="/admin/loyalty/settings"
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-neutral-300 px-3.5 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            <IconSettings className="h-4 w-4" />
            {pick(lang, "إعدادات العروض", "Offres & réglages")}
          </Link>
        )}
      </div>

      {topCustomers.length > 0 && (
        <div className="mb-8 rounded-lg border border-neutral-200 p-6">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-medium text-neutral-700">
            <IconStar className="h-4 w-4 text-amber-500" />
            {pick(lang, "أعلى الزبائن رصيداً", "Meilleurs clients")}
          </h2>
          <div className="flex flex-col divide-y divide-neutral-100">
            {topCustomers.map((c, i) => (
              <a
                key={c.id}
                href={`/admin/loyalty?phone=${encodeURIComponent(c.phone)}`}
                className="flex items-center justify-between gap-3 py-2.5 text-sm hover:bg-neutral-50"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-medium text-neutral-500">
                    {i + 1}
                  </span>
                  <span className="text-neutral-800">{c.phone}</span>
                </div>
                <span className="font-medium text-neutral-900">
                  {c.points} <span className="font-normal text-neutral-400">{pick(lang, "نقطة", "pts")}</span>
                </span>
              </a>
            ))}
          </div>
        </div>
      )}

      <form method="get" className="flex flex-col gap-3 sm:flex-row">
        <input
          type="tel"
          name="phone"
          defaultValue={phone}
          placeholder={pick(lang, "رقم الهاتف", "Numéro de téléphone")}
          required
          className="w-full rounded-lg border border-neutral-300 px-4 py-3.5 text-base focus:border-neutral-900 focus:outline-none"
        />
        <button
          type="submit"
          className="shrink-0 rounded-lg bg-neutral-900 px-5 py-3.5 text-sm font-medium text-white hover:bg-neutral-700 active:bg-neutral-800"
        >
          {pick(lang, "بحث", "Chercher")}
        </button>
      </form>

      {message && (
        <p
          className={`mt-4 text-sm ${
            error ? "text-red-600" : "text-green-700"
          }`}
        >
          {message}
        </p>
      )}

      {searched && (
        <div className="mt-8 rounded-lg border border-neutral-200 p-6">
          <p className="text-sm text-neutral-500">{phone}</p>
          <p className="mt-1 text-3xl font-semibold tracking-tight">
            {customer?.points ?? 0}{" "}
            <span className="text-base font-normal text-neutral-500">
              {pick(lang, "نقطة", "points")}
            </span>
          </p>

          {customer && (
            <div className="mt-4 grid grid-cols-2 gap-3">
              <KpiCard
                icon={IconClipboard}
                label={pick(lang, "عدد العمليات", "Transactions")}
                value={customer.transactions.length}
              />
              <KpiCard
                icon={IconGift}
                label={pick(lang, "نقاط مكتسبة (آخر العمليات)", "Points gagnés (récents)")}
                value={customer.transactions
                  .filter((t) => t.points > 0)
                  .reduce((n, t) => n + t.points, 0)}
                tone="good"
              />
            </div>
          )}

          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <form action={addPointsForOrder} className="flex flex-col gap-3">
              <input type="hidden" name="phone" value={phone} />
              <label className="text-sm font-medium text-neutral-700">
                {pick(lang, "إضافة نقاط من طلب", "Ajouter des points depuis une commande")}
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  name="orderTotal"
                  step="0.01"
                  min="0.01"
                  placeholder={pick(lang, "مبلغ الطلب (درهم)", "Total de la commande (DH)")}
                  required
                  className="w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-sm focus:border-neutral-900 focus:outline-none"
                />
                <button
                  type="submit"
                  className="shrink-0 rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-700"
                >
                  {pick(lang, "إضافة", "Ajouter")}
                </button>
              </div>
            </form>

            <form action={redeemPoints} className="flex flex-col gap-3">
              <input type="hidden" name="phone" value={phone} />
              <label className="text-sm font-medium text-neutral-700">
                {pick(lang, "استبدال نقاط", "Échanger des points")}
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  name="points"
                  step="1"
                  min="1"
                  placeholder={pick(lang, "عدد النقاط", "Nombre de points")}
                  required
                  className="w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-sm focus:border-neutral-900 focus:outline-none"
                />
                <button
                  type="submit"
                  className="shrink-0 rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-medium text-neutral-900 hover:bg-neutral-100"
                >
                  {pick(lang, "استبدال", "Échanger")}
                </button>
              </div>
              <input
                type="text"
                name="note"
                placeholder={pick(lang, "ملاحظة (اختياري)", "Note (optionnel)")}
                className="w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-sm focus:border-neutral-900 focus:outline-none"
              />
            </form>
          </div>

          {customer && customer.transactions.length > 0 && (
            <div className="mt-8">
              <h2 className="mb-3 text-sm font-medium text-neutral-700">
                {pick(lang, "آخر العمليات", "Dernières opérations")}
              </h2>
              <div className="flex flex-col divide-y divide-neutral-100">
                {customer.transactions.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between py-2.5 text-sm"
                  >
                    <div>
                      <span
                        className={
                          t.points > 0 ? "text-green-700" : "text-red-600"
                        }
                      >
                        {t.points > 0 ? `+${t.points}` : t.points}
                      </span>
                      {t.orderTotal != null && (
                        <span className="ml-2 text-neutral-400">
                          ({t.orderTotal} DH)
                        </span>
                      )}
                      {t.note && (
                        <span className="ml-2 text-neutral-500">{t.note}</span>
                      )}
                    </div>
                    <span className="text-xs text-neutral-400">
                      {new Date(t.createdAt).toLocaleString(
                        lang === "ar" ? "ar-MA" : "fr-MA"
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
