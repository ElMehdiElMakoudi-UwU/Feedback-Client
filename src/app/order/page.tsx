"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage, pick } from "@/lib/language-context";
import { LanguageToggle } from "@/components/language-toggle";

export default function OrderEntryPage() {
  const { lang } = useLanguage();
  const router = useRouter();
  const [tableNumber, setTableNumber] = useState("");

  function goToOrder() {
    const trimmed = tableNumber.trim();
    if (!trimmed) return;
    router.push(`/order/${encodeURIComponent(trimmed)}`);
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
            "أدخلوا رقم طاولتكم للبدء في الطلب",
            "Indiquez votre numéro de table pour commencer"
          )}
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <input
          type="text"
          value={tableNumber}
          onChange={(e) => setTableNumber(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && goToOrder()}
          maxLength={20}
          placeholder={pick(lang, "مثال: 12", "ex. 12")}
          className="w-full rounded-md border border-[var(--sindibad-line)] bg-[var(--sindibad-paper)] px-4 py-3 text-base focus:border-[var(--sindibad-maroon)] focus:outline-none"
        />
        <button
          type="button"
          disabled={!tableNumber.trim()}
          onClick={goToOrder}
          className="font-display rounded-md bg-[var(--sindibad-ink)] px-6 py-4 text-lg tracking-wide text-[var(--sindibad-cream)] transition hover:bg-[var(--sindibad-maroon)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pick(lang, "متابعة", "Continuer")}
        </button>
      </div>
    </main>
  );
}
