"use client";

import Image from "next/image";
import { useLanguage, pick } from "@/lib/language-context";
import { LanguageToggle } from "@/components/language-toggle";

export function TrackingLookup({ notFound }: { notFound: boolean }) {
  const { lang } = useLanguage();

  return (
    <main className="mx-auto min-h-screen max-w-md px-6 py-10">
      <div className="mb-10 flex items-center justify-between">
        <span className="flex items-center gap-2">
          <Image src="/brand/icon-mark.png" alt="" width={36} height={14} className="h-6 w-auto" />
          <span className="font-display text-lg tracking-wide">
            {pick(lang, "سندباد", "Sindibad")}
          </span>
        </span>
        <LanguageToggle />
      </div>

      <h1 className="font-display mb-2 text-center text-3xl tracking-wide">
        {pick(lang, "تتبع طلبك", "Suivre ma commande")}
      </h1>
      <p className="mb-8 text-center text-sm text-[var(--sindibad-muted)]">
        {pick(
          lang,
          "أدخل الرمز الذي وصلك عبر واتساب",
          "Entrez le code reçu sur WhatsApp"
        )}
      </p>

      <form action="/suivi" method="get" className="flex flex-col gap-3">
        <input
          name="code"
          required
          autoFocus
          autoComplete="off"
          autoCapitalize="characters"
          maxLength={10}
          placeholder="K7M2Q"
          className="rounded-md border border-[var(--sindibad-line)] bg-[var(--sindibad-paper)] px-4 py-4 text-center font-mono text-2xl uppercase tracking-[0.3em] focus:border-[var(--sindibad-maroon)] focus:outline-none"
        />
        {notFound && (
          <p className="text-center text-sm text-red-400">
            {pick(lang, "لم يتم العثور على هذا الرمز", "Code introuvable")}
          </p>
        )}
        <button
          type="submit"
          className="font-display rounded-md bg-[var(--sindibad-ink)] px-6 py-4 text-base tracking-wide text-[var(--sindibad-cream)] hover:bg-[var(--sindibad-maroon)]"
        >
          {pick(lang, "تتبع", "Suivre")}
        </button>
      </form>
    </main>
  );
}
