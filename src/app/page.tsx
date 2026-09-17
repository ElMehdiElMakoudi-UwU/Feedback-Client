"use client";

import Image from "next/image";
import Link from "next/link";
import { useLanguage, pick } from "@/lib/language-context";
import { LanguageToggle } from "@/components/language-toggle";

export default function Home() {
  const { lang } = useLanguage();

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center gap-8 px-6 py-8 text-center">
      <div className="flex w-full justify-end">
        <LanguageToggle />
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-10">
        <div className="flex flex-col items-center">
          <Image
            src="/brand/logo-lockup.png"
            alt="Sindibad Restaurant"
            width={340}
            height={238}
            priority
            className="w-56 sm:w-64"
          />
          <p className="font-display mt-5 text-base tracking-wide text-[var(--sindibad-muted)]">
            {pick(lang, "أهلاً بكم في مطعم سندباد", "Bienvenue chez Sindibad")}
          </p>
        </div>

        <div className="flex w-full flex-col gap-3">
          <Link
            href="/order"
            className="font-display rounded-md border border-[var(--sindibad-ink)] bg-[var(--sindibad-ink)] px-6 py-4 text-lg tracking-wide text-[var(--sindibad-cream)] transition hover:bg-[var(--sindibad-maroon)] hover:border-[var(--sindibad-maroon)]"
          >
            {pick(lang, "اطلبوا الآن", "Commander maintenant")}
          </Link>
          <a
            href="/menu/sindibad-menu.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="font-display rounded-md border border-[var(--sindibad-ink)] px-6 py-4 text-lg tracking-wide text-[var(--sindibad-ink)] transition hover:border-[var(--sindibad-maroon)] hover:text-[var(--sindibad-maroon)]"
          >
            {pick(lang, "القائمة PDF", "Menu en PDF")}
          </a>
          <Link
            href="/feedback"
            className="font-display rounded-md border border-[var(--sindibad-ink)] px-6 py-4 text-lg tracking-wide text-[var(--sindibad-ink)] transition hover:border-[var(--sindibad-maroon)] hover:text-[var(--sindibad-maroon)]"
          >
            {pick(lang, "شاركونا رأيكم", "Laisser un avis")}
          </Link>
          <Link
            href="/loyalty"
            className="font-display rounded-md border border-[var(--sindibad-ink)] px-6 py-4 text-lg tracking-wide text-[var(--sindibad-ink)] transition hover:border-[var(--sindibad-maroon)] hover:text-[var(--sindibad-maroon)]"
          >
            {pick(lang, "نقاط الولاء", "Mes points fidélité")}
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <a
          href="https://wa.me/212664292920"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="WhatsApp"
          className="flex h-12 w-12 items-center justify-center rounded-full border border-[var(--sindibad-line)] text-[var(--sindibad-ink)] transition hover:border-[var(--sindibad-maroon)] hover:text-[var(--sindibad-maroon)]"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
            <path d="M12.004 2C6.486 2 2.004 6.482 2.004 12c0 1.85.499 3.673 1.446 5.26L2 22l4.87-1.417A9.94 9.94 0 0012.004 22C17.522 22 22 17.518 22 12S17.522 2 12.004 2zm0 18.062a8.03 8.03 0 01-4.09-1.117l-.293-.174-3.033.881.899-2.958-.191-.303a8.02 8.02 0 01-1.243-4.29c0-4.436 3.612-8.048 8.05-8.048 4.437 0 8.048 3.612 8.048 8.049 0 4.437-3.611 8.049-8.048 8.049z" />
          </svg>
        </a>
        <a
          href="https://www.instagram.com/resttosindibad?stkn=NG9ldmxtYmJkMnZk"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Instagram"
          className="flex h-12 w-12 items-center justify-center rounded-full border border-[var(--sindibad-line)] text-[var(--sindibad-ink)] transition hover:border-[var(--sindibad-maroon)] hover:text-[var(--sindibad-maroon)]"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zm0 10.162a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
          </svg>
        </a>
      </div>
    </main>
  );
}
