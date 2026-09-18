"use client";

import Link from "next/link";
import type { ReactElement } from "react";
import { useLanguage, pick } from "@/lib/language-context";
import {
  IconBuilding,
  IconFlame,
  IconPackage,
  IconUsers,
  IconClipboard,
} from "@/app/admin/stock/icons";

type Workstation = {
  id: string;
  name: string;
  ingredients: { id: string }[];
  workers: { id: string }[];
  menuItems: { id: string }[];
};

type Kitchen = {
  id: string;
  name: string;
  workstations: Workstation[];
};

function StatCard({
  icon: Icon,
  value,
  label,
}: {
  icon: (props: { className?: string }) => ReactElement;
  value: number;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-neutral-200 px-4 py-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-neutral-100 text-neutral-600">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-lg font-semibold leading-tight">{value}</p>
        <p className="text-xs text-neutral-500">{label}</p>
      </div>
    </div>
  );
}

export function StockOverviewView({ kitchens }: { kitchens: Kitchen[] }) {
  const { lang } = useLanguage();

  const workstations = kitchens.flatMap((k) => k.workstations);
  const totalIngredientSlots = workstations.reduce((n, ws) => n + ws.ingredients.length, 0);
  const totalWorkers = workstations.reduce((n, ws) => n + ws.workers.length, 0);

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">
        {pick(lang, "إدارة المخزون", "Gestion du stock")}
      </h1>

      <div className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={IconBuilding} value={kitchens.length} label={pick(lang, "مطابخ", "Cuisines")} />
        <StatCard
          icon={IconFlame}
          value={workstations.length}
          label={pick(lang, "محطات", "Postes")}
        />
        <StatCard
          icon={IconPackage}
          value={totalIngredientSlots}
          label={pick(lang, "مكوّنات متتبعة", "Ingrédients suivis")}
        />
        <StatCard icon={IconUsers} value={totalWorkers} label={pick(lang, "عمال", "Ouvriers")} />
      </div>

      <div className="flex flex-col gap-6">
        {kitchens.map((kitchen) => (
          <section key={kitchen.id} className="rounded-lg border-2 border-neutral-300 p-5">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <IconBuilding className="h-5 w-5 text-neutral-400" />
              {kitchen.name}
            </h2>
            <div className="flex flex-col divide-y divide-neutral-100">
              {kitchen.workstations.map((ws) => (
                <div key={ws.id} className="flex items-center justify-between py-3">
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <IconFlame className="h-4 w-4 text-neutral-400" />
                    {ws.name}
                  </span>
                  <span className="flex items-center gap-3 text-xs text-neutral-400">
                    <span className="flex items-center gap-1">
                      <IconPackage className="h-3.5 w-3.5" />
                      {ws.ingredients.length}
                    </span>
                    <span className="flex items-center gap-1">
                      <IconUsers className="h-3.5 w-3.5" />
                      {ws.workers.length}
                    </span>
                    <span className="flex items-center gap-1">
                      <IconClipboard className="h-3.5 w-3.5" />
                      {ws.menuItems.length}
                    </span>
                  </span>
                </div>
              ))}
              {kitchen.workstations.length === 0 && (
                <p className="py-3 text-sm text-neutral-400">
                  {pick(lang, "لا توجد محطات بعد.", "Aucun poste pour le moment.")}
                </p>
              )}
            </div>
          </section>
        ))}
        {kitchens.length === 0 && (
          <div className="rounded-lg border border-dashed border-neutral-300 p-8 text-center">
            <p className="mb-4 text-sm text-neutral-500">
              {pick(
                lang,
                "ابدأ بإضافة مطبخ ومحطات من صفحة الإعداد.",
                "Commencez par ajouter une cuisine et des postes depuis la page de configuration."
              )}
            </p>
            <Link
              href="/admin/stock/setup"
              className="inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
            >
              {pick(lang, "الذهاب إلى الإعداد", "Aller à la configuration")}
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
