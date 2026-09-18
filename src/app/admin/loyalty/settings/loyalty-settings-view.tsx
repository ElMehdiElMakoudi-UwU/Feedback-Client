"use client";

import Link from "next/link";
import { useLanguage, pick } from "@/lib/language-context";
import {
  createLoyaltyOffer,
  toggleLoyaltyOffer,
  deleteLoyaltyOffer,
} from "@/app/actions/loyalty-offers";
import { IconChevronRight, IconGift } from "@/app/admin/stock/icons";

type Offer = {
  id: string;
  titleAr: string;
  titleFr: string;
  pointsCost: number;
  active: boolean;
};

export function LoyaltySettingsView({
  offers,
  error,
  ok,
}: {
  offers: Offer[];
  error?: string;
  ok?: string;
}) {
  const { lang } = useLanguage();

  const message =
    ok === "created"
      ? pick(lang, "تمت إضافة العرض بنجاح", "Offre ajoutée avec succès")
      : ok === "deleted"
        ? pick(lang, "تم حذف العرض", "Offre supprimée")
        : error === "invalid"
          ? pick(lang, "المعطيات غير صحيحة", "Données invalides")
          : null;

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <Link
        href="/admin/loyalty"
        className="mb-6 flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-900"
      >
        <IconChevronRight className="h-4 w-4 rotate-180" />
        {pick(lang, "نقاط الولاء", "Fidélité")}
      </Link>

      <h1 className="mb-2 text-2xl font-semibold tracking-tight">
        {pick(lang, "عروض نقاط الولاء", "Offres de fidélité")}
      </h1>
      <p className="mb-8 text-sm text-neutral-500">
        {pick(
          lang,
          "حدد المكافآت التي يمكن للزبائن استبدالها بنقاطهم",
          "Définissez les récompenses que les clients peuvent échanger contre leurs points"
        )}
      </p>

      <form
        action={createLoyaltyOffer}
        className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-6"
      >
        <div>
          <label className="mb-2 block text-sm font-medium text-neutral-700">
            {pick(lang, "اسم العرض (بالعربية)", "Nom de l'offre (arabe)")}
          </label>
          <input
            type="text"
            name="titleAr"
            required
            dir="rtl"
            className="w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-sm focus:border-neutral-900 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-neutral-700">
            {pick(lang, "اسم العرض (بالفرنسية)", "Nom de l'offre (français)")}
          </label>
          <input
            type="text"
            name="titleFr"
            required
            className="w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-sm focus:border-neutral-900 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-neutral-700">
            {pick(lang, "عدد النقاط المطلوبة", "Points nécessaires")}
          </label>
          <input
            type="number"
            name="pointsCost"
            step="1"
            min="1"
            required
            className="w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-sm focus:border-neutral-900 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          className="mt-2 shrink-0 self-start rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-700"
        >
          {pick(lang, "إضافة عرض", "Ajouter une offre")}
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

      <div className="mt-8 flex flex-col divide-y divide-neutral-100">
        {offers.map((offer) => (
          <div
            key={offer.id}
            className="flex items-center justify-between gap-3 py-3.5"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-neutral-50 text-neutral-500 ring-1 ring-neutral-200">
                <IconGift className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {pick(lang, offer.titleAr, offer.titleFr)}
                </p>
                <p className="text-xs text-neutral-400">
                  {offer.pointsCost} {pick(lang, "نقطة", "points")}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <form action={toggleLoyaltyOffer}>
                <input type="hidden" name="id" value={offer.id} />
                <input
                  type="hidden"
                  name="active"
                  value={(!offer.active).toString()}
                />
                <button
                  type="submit"
                  className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                    offer.active
                      ? "bg-green-50 text-green-700 hover:bg-green-100"
                      : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
                  }`}
                >
                  {offer.active
                    ? pick(lang, "مفعل", "Actif")
                    : pick(lang, "معطل", "Inactif")}
                </button>
              </form>
              <form action={deleteLoyaltyOffer}>
                <input type="hidden" name="id" value={offer.id} />
                <button
                  type="submit"
                  className="text-xs text-red-600 hover:underline"
                >
                  {pick(lang, "حذف", "Supprimer")}
                </button>
              </form>
            </div>
          </div>
        ))}
        {offers.length === 0 && (
          <p className="py-3 text-sm text-neutral-400">
            {pick(lang, "لا توجد عروض بعد", "Aucune offre pour le moment")}
          </p>
        )}
      </div>
    </main>
  );
}
