"use client";

import Image from "next/image";
import Link from "next/link";
import { useLanguage, pick } from "@/lib/language-context";
import { LanguageToggle } from "@/components/language-toggle";
import { FeedbackForm } from "./feedback-form";

export default function FeedbackPage() {
  const { lang } = useLanguage();

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
          {pick(lang, "رأيكم يهمنا", "Votre avis compte")}
        </h1>
        <div className="hairline mx-auto mt-3 w-32" />
        <p className="mt-4 text-sm text-[var(--sindibad-muted)]">
          {pick(
            lang,
            "أخبرونا برأيكم في الطعام والخدمة",
            "Dites-nous comment s'est passée votre expérience"
          )}
        </p>
      </div>

      <FeedbackForm lang={lang} />
    </main>
  );
}
