"use client";

import Image from "next/image";
import Link from "next/link";
import { useLanguage, pick } from "@/lib/language-context";
import { LanguageToggle } from "@/components/language-toggle";
import { TableServiceButtons } from "@/components/table-service-buttons";
import type { PendingTableRequest } from "@/lib/table-requests";

export function TableHub({
  tableNumber,
  pendingRequests,
}: {
  tableNumber: string;
  pendingRequests: PendingTableRequest[];
}) {
  const { lang } = useLanguage();

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

      <div className="mb-10 text-center">
        <p className="text-sm text-[var(--sindibad-muted)]">
          {pick(lang, "طاولة رقم", "Table n°")}
        </p>
        <p className="font-display text-4xl tracking-wide text-[var(--sindibad-maroon)]">
          {tableNumber}
        </p>
        <div className="hairline mx-auto mt-4 w-32" />
      </div>

      <div className="flex flex-col gap-4">
        <Link
          href={`/order/${encodeURIComponent(tableNumber)}`}
          className="font-display rounded-md bg-[var(--sindibad-ink)] px-6 py-4 text-center text-lg tracking-wide text-[var(--sindibad-cream)] transition hover:bg-[var(--sindibad-maroon)]"
        >
          {pick(lang, "اطلبوا الآن", "Commander maintenant")}
        </Link>
        <Link
          href="/menu"
          className="font-display rounded-md border border-[var(--sindibad-ink)] px-6 py-4 text-center text-lg tracking-wide text-[var(--sindibad-ink)] transition hover:border-[var(--sindibad-maroon)] hover:text-[var(--sindibad-maroon)]"
        >
          {pick(lang, "تصفح القائمة", "Voir le menu")}
        </Link>
        <div className="hairline my-2" />
        <TableServiceButtons
          tableNumber={tableNumber}
          initialPending={pendingRequests}
        />
        <Link
          href={`/feedback?table=${encodeURIComponent(tableNumber)}`}
          className="rounded-md px-6 py-3 text-center text-sm text-[var(--sindibad-muted)] underline underline-offset-4 transition hover:text-[var(--sindibad-maroon)]"
        >
          {pick(lang, "شاركونا رأيكم", "Laisser un avis")}
        </Link>
      </div>
    </main>
  );
}
