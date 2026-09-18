"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage, pick } from "@/lib/language-context";
import { LanguageToggle } from "@/components/language-toggle";
import { TAKEAWAY_TABLE_VALUE, DELIVERY_TABLE_VALUE } from "@/lib/order-mode";

type Mode = "table" | "takeaway" | "delivery";

const phoneRegex = /^[0-9+\s-]{8,20}$/;

export default function OrderEntryPage() {
  const { lang } = useLanguage();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("table");
  const [tableNumber, setTableNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  const trimmedTable = tableNumber.trim();
  const trimmedPhone = phone.trim();
  const trimmedAddress = address.trim();
  const phoneValid = phoneRegex.test(trimmedPhone);
  const canContinue =
    mode === "table"
      ? !!trimmedTable
      : mode === "takeaway"
        ? phoneValid
        : phoneValid && !!trimmedAddress;

  function goToOrder() {
    if (!canContinue) return;
    if (mode === "table") {
      router.push(`/order/${encodeURIComponent(trimmedTable)}`);
    } else if (mode === "takeaway") {
      router.push(
        `/order/${TAKEAWAY_TABLE_VALUE}?phone=${encodeURIComponent(trimmedPhone)}`
      );
    } else {
      router.push(
        `/order/${DELIVERY_TABLE_VALUE}?phone=${encodeURIComponent(
          trimmedPhone
        )}&address=${encodeURIComponent(trimmedAddress)}`
      );
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-6 py-10">
      <div className="mb-10 flex items-center justify-between">
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
          {pick(lang, "اطلبوا الآن", "Commander")}
        </h1>
        <div className="hairline mx-auto mt-3 w-32" />
        <p className="mt-4 text-sm text-[var(--sindibad-muted)]">
          {pick(
            lang,
            "هل أنتم في المطعم، تطلبون طلباً خارجياً، أم تريدون التوصيل؟",
            "Êtes-vous sur place, souhaitez-vous emporter ou vous faire livrer votre commande ?"
          )}
        </p>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => setMode("table")}
          className={`font-display flex flex-col items-center gap-1.5 rounded-md border px-2 py-3 text-xs tracking-wide transition sm:text-sm ${
            mode === "table"
              ? "border-[var(--sindibad-maroon)] bg-[var(--sindibad-maroon)] text-[var(--sindibad-cream)]"
              : "border-[var(--sindibad-line)] text-[var(--sindibad-ink)]"
          }`}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5 shrink-0"
          >
            <path d="M7 2v8" />
            <path d="M5 2v4a2 2 0 0 0 4 0V2" />
            <path d="M7 10v12" />
            <path d="M17 2c-1.7 0-3 2.2-3 5s1.3 5 3 5" />
            <path d="M17 2v20" />
          </svg>
          {pick(lang, "أنا في المطعم", "Sur place")}
        </button>
        <button
          type="button"
          onClick={() => setMode("takeaway")}
          className={`font-display flex flex-col items-center gap-1.5 rounded-md border px-2 py-3 text-xs tracking-wide transition sm:text-sm ${
            mode === "takeaway"
              ? "border-[var(--sindibad-maroon)] bg-[var(--sindibad-maroon)] text-[var(--sindibad-cream)]"
              : "border-[var(--sindibad-line)] text-[var(--sindibad-ink)]"
          }`}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5 shrink-0"
          >
            <path d="M6 8h12l1 12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2Z" />
            <path d="M9 8V6a3 3 0 0 1 6 0v2" />
          </svg>
          {pick(lang, "طلب خارجي", "À emporter")}
        </button>
        <button
          type="button"
          onClick={() => setMode("delivery")}
          className={`font-display flex flex-col items-center gap-1.5 rounded-md border px-2 py-3 text-xs tracking-wide transition sm:text-sm ${
            mode === "delivery"
              ? "border-[var(--sindibad-maroon)] bg-[var(--sindibad-maroon)] text-[var(--sindibad-cream)]"
              : "border-[var(--sindibad-line)] text-[var(--sindibad-ink)]"
          }`}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5 shrink-0"
          >
            <circle cx="6" cy="19" r="2" />
            <circle cx="17" cy="19" r="2" />
            <path d="M6 19h9V9H9" />
            <path d="M9 9 6 6H3" />
            <path d="M14 19h3l2-5h-5.5" />
            <path d="M12 6h4l2 4" />
          </svg>
          {pick(lang, "توصيل", "Livraison")}
        </button>
      </div>

      <div className="flex flex-col gap-4">
        {mode === "table" && (
          <>
            <p className="text-sm text-[var(--sindibad-muted)]">
              {pick(
                lang,
                "أدخلوا رقم طاولتكم للبدء في الطلب",
                "Indiquez votre numéro de table pour commencer"
              )}
            </p>
            <input
              type="text"
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && goToOrder()}
              maxLength={20}
              placeholder={pick(lang, "مثال: 12", "ex. 12")}
              className="w-full rounded-md border border-[var(--sindibad-line)] bg-[var(--sindibad-paper)] px-4 py-3 text-base focus:border-[var(--sindibad-maroon)] focus:outline-none"
            />
          </>
        )}

        {mode === "takeaway" && (
          <>
            <p className="text-sm text-[var(--sindibad-muted)]">
              {pick(
                lang,
                "أدخلوا رقم هاتفكم للبدء في الطلب الخارجي",
                "Indiquez votre numéro de téléphone pour commencer votre commande à emporter"
              )}
            </p>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && goToOrder()}
              maxLength={20}
              placeholder={pick(lang, "مثال: 0600000000", "ex. 0600000000")}
              className="w-full rounded-md border border-[var(--sindibad-line)] bg-[var(--sindibad-paper)] px-4 py-3 text-base focus:border-[var(--sindibad-maroon)] focus:outline-none"
            />
            {trimmedPhone && !phoneValid && (
              <p className="text-sm text-red-700">
                {pick(lang, "رقم هاتف غير صالح", "Numéro de téléphone invalide")}
              </p>
            )}
          </>
        )}

        {mode === "delivery" && (
          <>
            <p className="text-sm text-[var(--sindibad-muted)]">
              {pick(
                lang,
                "أدخلوا رقم هاتفكم وعنوانكم لتوصيل طلبكم",
                "Indiquez votre téléphone et votre adresse pour vous faire livrer"
              )}
            </p>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              maxLength={20}
              placeholder={pick(lang, "مثال: 0600000000", "ex. 0600000000")}
              className="w-full rounded-md border border-[var(--sindibad-line)] bg-[var(--sindibad-paper)] px-4 py-3 text-base focus:border-[var(--sindibad-maroon)] focus:outline-none"
            />
            {trimmedPhone && !phoneValid && (
              <p className="text-sm text-red-700">
                {pick(lang, "رقم هاتف غير صالح", "Numéro de téléphone invalide")}
              </p>
            )}
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={3}
              maxLength={300}
              placeholder={pick(
                lang,
                "العنوان الكامل للتوصيل",
                "Adresse complète de livraison"
              )}
              className="w-full rounded-md border border-[var(--sindibad-line)] bg-[var(--sindibad-paper)] px-4 py-3 text-base focus:border-[var(--sindibad-maroon)] focus:outline-none"
            />
          </>
        )}

        <button
          type="button"
          disabled={!canContinue}
          onClick={goToOrder}
          className="font-display rounded-md bg-[var(--sindibad-ink)] px-6 py-4 text-lg tracking-wide text-[var(--sindibad-cream)] transition hover:bg-[var(--sindibad-maroon)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pick(lang, "متابعة", "Continuer")}
        </button>
      </div>
    </main>
  );
}
