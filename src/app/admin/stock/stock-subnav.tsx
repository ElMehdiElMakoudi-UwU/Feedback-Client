"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage, pick } from "@/lib/language-context";
import {
  IconGrid,
  IconSettings,
  IconUsers,
  IconClipboard,
  IconCart,
  IconScale,
} from "@/app/admin/stock/icons";

const tabs = [
  { href: "/admin/stock", icon: IconGrid, ar: "نظرة عامة", fr: "Aperçu" },
  { href: "/admin/stock/setup", icon: IconSettings, ar: "الإعداد", fr: "Configuration" },
  { href: "/admin/stock/workers", icon: IconUsers, ar: "العمال", fr: "Ouvriers" },
  { href: "/admin/stock/recipes", icon: IconClipboard, ar: "الوصفات", fr: "Fiches techniques" },
  { href: "/admin/stock/sales", icon: IconCart, ar: "المبيعات", fr: "Ventes" },
  { href: "/admin/stock/variance", icon: IconScale, ar: "الفروقات", fr: "Écarts" },
] as const;

export function StockSubNav() {
  const { lang } = useLanguage();
  const pathname = usePathname();

  return (
    <div className="border-b border-neutral-200 bg-neutral-50">
      <nav className="mx-auto flex max-w-4xl gap-1 overflow-x-auto px-4 sm:px-6">
        {tabs.map((tab) => {
          const isActive =
            tab.href === "/admin/stock" ? pathname === tab.href : pathname.startsWith(tab.href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`group flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-3 text-sm font-medium transition-colors duration-150 ${
                isActive
                  ? "border-neutral-900 text-neutral-900"
                  : "border-transparent text-neutral-500 hover:border-neutral-300 hover:text-neutral-800"
              }`}
            >
              <Icon
                className={`h-4 w-4 transition-colors duration-150 ${
                  isActive ? "text-neutral-900" : "text-neutral-400 group-hover:text-neutral-600"
                }`}
              />
              {pick(lang, tab.ar, tab.fr)}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
