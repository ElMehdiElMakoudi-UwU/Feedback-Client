"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage, pick } from "@/lib/language-context";
import { IconFlame, IconPackage } from "@/app/admin/stock/icons";

const tabs = [
  {
    href: "/admin/stock/setup/ingredients",
    icon: IconPackage,
    ar: "المكوّنات",
    fr: "Ingrédients",
  },
  {
    href: "/admin/stock/setup/postes",
    icon: IconFlame,
    ar: "المطابخ والمحطات",
    fr: "Cuisines & Postes",
  },
] as const;

export function SetupSubNav() {
  const { lang } = useLanguage();
  const pathname = usePathname();

  return (
    <nav className="mb-8 flex flex-wrap gap-2">
      {tabs.map((tab) => {
        const isActive = pathname.startsWith(tab.href);
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors duration-150 ${
              isActive
                ? "border-neutral-900 bg-neutral-900 text-white"
                : "border-neutral-300 text-neutral-600 hover:bg-neutral-50"
            }`}
          >
            <Icon className="h-4 w-4" />
            {pick(lang, tab.ar, tab.fr)}
          </Link>
        );
      })}
    </nav>
  );
}
