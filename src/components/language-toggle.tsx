"use client";

import { useLanguage } from "@/lib/language-context";

export function LanguageToggle() {
  const { lang, setLang } = useLanguage();

  return (
    <div className="inline-flex items-center rounded-full border border-[var(--sindibad-line)] bg-[var(--sindibad-paper)] p-0.5 text-sm">
      <button
        type="button"
        onClick={() => setLang("ar")}
        className={`rounded-full px-3 py-1 transition ${
          lang === "ar"
            ? "bg-[var(--sindibad-maroon)] text-[var(--sindibad-cream)]"
            : "text-[var(--sindibad-muted)]"
        }`}
      >
        العربية
      </button>
      <button
        type="button"
        onClick={() => setLang("fr")}
        className={`rounded-full px-3 py-1 transition ${
          lang === "fr"
            ? "bg-[var(--sindibad-maroon)] text-[var(--sindibad-cream)]"
            : "text-[var(--sindibad-muted)]"
        }`}
      >
        Français
      </button>
    </div>
  );
}
