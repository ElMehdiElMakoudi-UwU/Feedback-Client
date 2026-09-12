"use client";

import Image from "next/image";
import Link from "next/link";
import { useLanguage, pick } from "@/lib/language-context";
import { LanguageToggle } from "@/components/language-toggle";

type Transaction = {
  id: string;
  points: number;
  orderTotal: number | null;
  note: string | null;
  createdAt: Date;
};

type Customer = {
  points: number;
  transactions: Transaction[];
} | null;

const POINTS_PER_REWARD = 100;

export function LoyaltyLookup({
  phone,
  customer,
}: {
  phone: string;
  customer: Customer;
}) {
  const { lang } = useLanguage();
  const searched = phone.length > 0;
  const notFound = searched && !customer;

  const points = customer?.points ?? 0;
  const progress = points % POINTS_PER_REWARD;
  const remaining = POINTS_PER_REWARD - progress;

  return (
    <main className="mx-auto min-h-screen max-w-md px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/brand/icon-mark.png"
            alt=""
            width={36}
            height={14}
            className="h-6 w-auto"
          />
          <span className="font-display text-lg tracking-wide">
            {pick(lang, "سندباد", "Sindibad")}
          </span>
        </Link>
        <LanguageToggle />
      </div>

      <div className="mb-8 text-center">
        <h1 className="font-display text-3xl tracking-wide">
          {pick(lang, "نقاط الولاء", "Mes points fidélité")}
        </h1>
        <div className="hairline mx-auto mt-3 w-32" />
        <p className="mt-4 text-sm text-[var(--sindibad-muted)]">
          {pick(
            lang,
            "أدخلوا رقم هاتفكم لمعرفة رصيدكم من النقاط",
            "Entrez votre numéro de téléphone pour voir votre solde"
          )}
        </p>
      </div>

      <form method="get" className="flex gap-2">
        <input
          type="tel"
          name="phone"
          defaultValue={phone}
          placeholder={pick(lang, "رقم الهاتف", "Numéro de téléphone")}
          required
          className="w-full rounded-md border border-[var(--sindibad-line)] bg-transparent px-4 py-3 text-base focus:border-[var(--sindibad-maroon)] focus:outline-none"
        />
        <button
          type="submit"
          className="font-display shrink-0 rounded-md border border-[var(--sindibad-ink)] bg-[var(--sindibad-ink)] px-5 py-3 text-sm tracking-wide text-[var(--sindibad-cream)] transition hover:bg-[var(--sindibad-maroon)] hover:border-[var(--sindibad-maroon)]"
        >
          {pick(lang, "بحث", "Chercher")}
        </button>
      </form>

      {notFound && (
        <p className="mt-6 text-center text-sm text-[var(--sindibad-muted)]">
          {pick(
            lang,
            "لم نجد أي رصيد نقاط مرتبط بهذا الرقم. اطلبوا من طاقم المطعم ربط طلبكم القادم برقم هاتفكم.",
            "Aucun solde de points trouvé pour ce numéro. Demandez au personnel de lier votre prochaine commande à votre téléphone."
          )}
        </p>
      )}

      {customer && (
        <div className="mt-8 rounded-lg border border-[var(--sindibad-line)] p-6 text-center">
          <p className="text-sm text-[var(--sindibad-muted)]">{phone}</p>
          <p className="font-display mt-2 text-5xl tracking-wide">
            {points}
          </p>
          <p className="text-sm text-[var(--sindibad-muted)]">
            {pick(lang, "نقطة", "points")}
          </p>

          <div className="mt-5 text-left" dir="ltr">
            <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--sindibad-line)]">
              <div
                className="h-full rounded-full bg-[var(--sindibad-maroon)] transition-all"
                style={{
                  width: `${(progress / POINTS_PER_REWARD) * 100}%`,
                }}
              />
            </div>
          </div>
          <p className="mt-2 text-xs text-[var(--sindibad-muted)]">
            {remaining === POINTS_PER_REWARD
              ? pick(
                  lang,
                  `لديكم ما يكفي لاستبدال مكافأة الآن!`,
                  `Vous avez de quoi échanger une récompense maintenant !`
                )
              : pick(
                  lang,
                  `يفصلكم ${remaining} نقطة عن المكافأة القادمة`,
                  `Encore ${remaining} points avant votre prochaine récompense`
                )}
          </p>

          {customer.transactions.length > 0 && (
            <div className="mt-8 text-left" dir="ltr">
              <h2 className="mb-3 text-xs font-medium tracking-wide text-[var(--sindibad-muted)] uppercase">
                {pick(lang, "السجل", "Historique")}
              </h2>
              <div className="flex flex-col divide-y divide-[var(--sindibad-line)]">
                {customer.transactions.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between py-2.5 text-sm"
                  >
                    <div>
                      <span
                        className={
                          t.points > 0
                            ? "font-medium text-emerald-700"
                            : "font-medium text-red-600"
                        }
                      >
                        {t.points > 0 ? `+${t.points}` : t.points}
                      </span>
                      {t.orderTotal != null && (
                        <span className="ml-2 text-[var(--sindibad-muted)]">
                          ({t.orderTotal} DH)
                        </span>
                      )}
                      {t.note && (
                        <span className="ml-2 text-[var(--sindibad-muted)]">
                          {t.note}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-[var(--sindibad-muted)]">
                      {new Date(t.createdAt).toLocaleDateString(
                        lang === "ar" ? "ar-MA" : "fr-MA",
                        { day: "numeric", month: "short" }
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
