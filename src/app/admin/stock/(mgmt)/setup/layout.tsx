"use client";

import { useLanguage, pick } from "@/lib/language-context";
import { SetupSubNav } from "@/app/admin/stock/setup-subnav";

export default function StockSetupLayout({ children }: { children: React.ReactNode }) {
  const { lang } = useLanguage();

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">
        {pick(lang, "إعداد المخزون", "Configuration du stock")}
      </h1>
      <SetupSubNav />
      {children}
    </main>
  );
}
