"use client";

import { useMemo, useState } from "react";
import { useLanguage, pick } from "@/lib/language-context";
import { createIngredient, deleteIngredient } from "@/app/actions/stock";
import { IconPackage, IconPlus, IconSearch, IconTrash } from "@/app/admin/stock/icons";

type Ingredient = { id: string; name: string; unit: string };

export function IngredientsView({ ingredients }: { ingredients: Ingredient[] }) {
  const { lang } = useLanguage();
  const [query, setQuery] = useState("");

  const filteredIngredients = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ingredients;
    return ingredients.filter((ing) => ing.name.toLowerCase().includes(q));
  }, [ingredients, query]);

  return (
    <section className="rounded-lg border-2 border-neutral-300 p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <IconPackage className="h-5 w-5 text-neutral-400" />
          {pick(lang, "المكوّنات", "Ingrédients")}
          <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-normal text-neutral-500">
            {ingredients.length}
          </span>
        </h2>
        <div className="relative w-full sm:w-64">
          <IconSearch className="pointer-events-none absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={pick(lang, "بحث عن مكوّن...", "Rechercher un ingrédient...")}
            className="w-full rounded-md border border-neutral-300 py-1.5 ps-8 pe-3 text-sm focus:border-neutral-900 focus:outline-none"
          />
        </div>
      </div>
      <div className="mb-4 flex flex-col divide-y divide-neutral-100">
        {filteredIngredients.map((ing) => (
          <div key={ing.id} className="flex items-center justify-between py-2">
            <span className="text-sm">
              {ing.name} <span className="text-neutral-400">· {ing.unit}</span>
            </span>
            <form action={deleteIngredient}>
              <input type="hidden" name="id" value={ing.id} />
              <button
                type="submit"
                className="flex cursor-pointer items-center gap-1 text-xs text-red-600 transition-colors hover:text-red-700 hover:underline"
              >
                <IconTrash className="h-3.5 w-3.5" />
                {pick(lang, "حذف", "Supprimer")}
              </button>
            </form>
          </div>
        ))}
        {filteredIngredients.length === 0 && ingredients.length > 0 && (
          <p className="py-2 text-sm text-neutral-400">
            {pick(lang, "لا توجد نتائج مطابقة.", "Aucun résultat pour cette recherche.")}
          </p>
        )}
        {ingredients.length === 0 && (
          <p className="py-2 text-sm text-neutral-400">
            {pick(lang, "لا توجد مكوّنات بعد.", "Aucun ingrédient pour le moment.")}
          </p>
        )}
      </div>
      <form action={createIngredient} className="flex flex-wrap gap-3">
        <input
          name="name"
          placeholder={pick(lang, "اسم المكوّن، مثال: دجاج", "Nom, ex. Poulet")}
          required
          className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
        />
        <input
          name="unit"
          placeholder={pick(lang, "الوحدة، مثال: كغ", "Unité, ex. Kg")}
          required
          className="w-40 rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
        />
        <button
          type="submit"
          className="flex cursor-pointer items-center gap-1.5 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-700"
        >
          <IconPlus className="h-4 w-4" />
          {pick(lang, "إضافة", "Ajouter")}
        </button>
      </form>
    </section>
  );
}
