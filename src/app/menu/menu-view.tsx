"use client";

import Image from "next/image";
import Link from "next/link";
import { useLanguage, pick } from "@/lib/language-context";
import { LanguageToggle } from "@/components/language-toggle";
import type { MenuSectionView, MenuItemView } from "./types";

function slug(id: string) {
  return `sec-${id}`;
}

function PriceTag({ item, lang }: { item: MenuItemView; lang: "ar" | "fr" }) {
  if (item.comingSoon) {
    return (
      <span className="font-display whitespace-nowrap text-sm tracking-wide text-[var(--sindibad-maroon)]">
        {pick(lang, "قريباً", "Bientôt")}
      </span>
    );
  }

  if (item.priceLarge != null && item.price != null) {
    return (
      <span className="whitespace-nowrap text-sm text-[var(--sindibad-ink)]">
        <span className="text-xs text-[var(--sindibad-muted)]">M</span>{" "}
        {item.price}{" "}
        <span className="mx-1 text-[var(--sindibad-muted)]">/</span>
        <span className="text-xs text-[var(--sindibad-muted)]">L</span>{" "}
        {item.priceLarge}
      </span>
    );
  }

  if (item.price != null) {
    return (
      <span className="whitespace-nowrap text-[var(--sindibad-ink)]">
        {item.price}{" "}
        <span className="text-xs text-[var(--sindibad-muted)]">
          {pick(lang, "درهم", "DH")}
        </span>
      </span>
    );
  }

  return null;
}

export function MenuView({ sections }: { sections: MenuSectionView[] }) {
  const { lang } = useLanguage();

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-5 pb-16">
      <header className="sticky top-0 z-10 -mx-5 mb-6 border-b border-[var(--sindibad-line)] bg-[var(--sindibad-cream)]/95 px-5 py-3 backdrop-blur">
        <div className="flex items-center justify-between">
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
        <nav className="mt-3 flex gap-4 overflow-x-auto pb-1 text-sm text-[var(--sindibad-muted)]">
          {sections.map((section) => (
            <a
              key={section.id}
              href={`#${slug(section.id)}`}
              className="whitespace-nowrap hover:text-[var(--sindibad-maroon)]"
            >
              {pick(lang, section.nameAr, section.nameFr)}
            </a>
          ))}
        </nav>
      </header>

      <div className="flex flex-col gap-16">
        {sections.map((section) => (
          <section key={section.id} id={slug(section.id)}>
            <div className="mb-8 text-center">
              <h1 className="font-display text-3xl tracking-wide">
                {pick(lang, section.nameAr, section.nameFr)}
              </h1>
              <div className="hairline mx-auto mt-3 w-40" />
            </div>

            <div className="flex flex-col gap-10">
              {section.categories.map((category) => (
                <div key={category.id}>
                  <h2 className="font-display mb-4 text-center text-xl tracking-[0.08em] text-[var(--sindibad-maroon)]">
                    {pick(lang, category.nameAr, category.nameFr)}
                  </h2>
                  <div className="flex flex-col divide-y divide-[var(--sindibad-line)]">
                    {category.items.map((item) => (
                      <div key={item.id} className="flex flex-col gap-1 py-4">
                        <div className="flex items-baseline justify-between gap-4">
                          <div className="flex items-baseline gap-2">
                            <h3 className="font-display text-lg text-[var(--sindibad-ink)]">
                              {pick(lang, item.nameAr, item.nameFr)}
                            </h3>
                            {(item.noteAr || item.noteFr) && (
                              <span className="whitespace-nowrap rounded-full bg-[var(--sindibad-rose)]/25 px-2 py-0.5 text-xs text-[var(--sindibad-maroon)]">
                                {pick(lang, item.noteAr ?? "", item.noteFr ?? "")}
                              </span>
                            )}
                          </div>
                          <PriceTag item={item} lang={lang} />
                        </div>
                        {(item.descriptionAr || item.descriptionFr) && (
                          <p className="text-sm leading-relaxed text-[var(--sindibad-muted)]">
                            {pick(
                              lang,
                              item.descriptionAr ?? "",
                              item.descriptionFr ?? ""
                            )}
                          </p>
                        )}
                      </div>
                    ))}
                    {category.items.length === 0 && (
                      <p className="py-3 text-sm text-[var(--sindibad-muted)]">
                        {pick(lang, "قريباً", "Bientôt disponible")}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}

        {sections.length === 0 && (
          <p className="py-10 text-center text-[var(--sindibad-muted)]">
            {pick(lang, "القائمة قيد التحضير", "Menu en préparation")}
          </p>
        )}
      </div>

      <div className="mt-16 flex flex-col items-center gap-6 text-center">
        <p className="text-xs tracking-wide text-[var(--sindibad-muted)]">
          {pick(
            lang,
            "الأسعار شاملة جميع الضرائب بالدرهم المغربي",
            "Nos prix s'entendent TTC en Dirhams"
          )}
        </p>
        <Link
          href="/feedback"
          className="font-display rounded-md border border-[var(--sindibad-ink)] px-6 py-3 text-sm tracking-wide text-[var(--sindibad-ink)] transition hover:border-[var(--sindibad-maroon)] hover:text-[var(--sindibad-maroon)]"
        >
          {pick(lang, "شاركونا رأيكم في وجبتكم", "Laisser un avis sur votre repas")}
        </Link>
      </div>
    </main>
  );
}
