"use client";

import { useMemo, useState } from "react";
import { useLanguage, pick } from "@/lib/language-context";
import {
  setMenuItemWorkstation,
  addRecipeItem,
  deleteRecipeItem,
} from "@/app/actions/stock";
import {
  IconAlertTriangle,
  IconCheckCircle,
  IconClipboard,
  IconPackage,
  IconPlus,
  IconSearch,
} from "@/app/admin/stock/icons";
import { QuantityInput } from "@/app/admin/stock/quantity-input";

type Ingredient = { id: string; name: string; unit: string };
type Workstation = { id: string; name: string; kitchen: { name: string } };

type RecipeItem = {
  id: string;
  size: string | null;
  quantity: number;
  ingredient: Ingredient;
};

type MenuItem = {
  id: string;
  nameFr: string;
  nameAr: string;
  priceLarge: number | null;
  workstationId: string | null;
  workstation: { id: string; name: string } | null;
  recipeItems: RecipeItem[];
};

type MenuCategory = {
  id: string;
  nameFr: string;
  nameAr: string;
  section: { nameFr: string };
  items: MenuItem[];
};

const UNASSIGNED = "__unassigned__";
const NO_RECIPE = "__no_recipe__";

function ItemStatus({ item, lang }: { item: MenuItem; lang: "ar" | "fr" }) {
  if (!item.workstationId) {
    return (
      <span className="flex items-center gap-1 text-neutral-400">
        <IconPackage className="h-4 w-4" />
        <span className="hidden sm:inline">{pick(lang, "بدون محطة", "Sans poste")}</span>
      </span>
    );
  }
  if (item.recipeItems.length === 0) {
    return (
      <span className="flex items-center gap-1 text-amber-600">
        <IconAlertTriangle className="h-4 w-4" />
        <span className="hidden sm:inline">{pick(lang, "بدون وصفة", "Sans recette")}</span>
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-green-600">
      <IconCheckCircle className="h-4 w-4" />
      <span className="hidden sm:inline">
        {pick(lang, `${item.recipeItems.length} مكوّن`, `${item.recipeItems.length} ingrédient(s)`)}
      </span>
    </span>
  );
}

function AddRecipeItemForm({
  item,
  ingredients,
  lang,
}: {
  item: MenuItem;
  ingredients: Ingredient[];
  lang: "ar" | "fr";
}) {
  const [ingredientId, setIngredientId] = useState("");
  const selected = ingredients.find((ing) => ing.id === ingredientId);

  return (
    <form action={addRecipeItem} className="flex flex-wrap gap-2">
      <input type="hidden" name="menuItemId" value={item.id} />
      <select
        name="ingredientId"
        required
        value={ingredientId}
        onChange={(e) => setIngredientId(e.target.value)}
        className="flex-1 cursor-pointer rounded-md border border-neutral-300 px-2 py-1.5 text-xs"
      >
        <option value="">{pick(lang, "اختر مكوّناً", "Choisir un ingrédient")}</option>
        {ingredients.map((ing) => (
          <option key={ing.id} value={ing.id}>
            {ing.name} ({ing.unit})
          </option>
        ))}
      </select>
      {item.priceLarge != null && (
        <select
          name="size"
          className="cursor-pointer rounded-md border border-neutral-300 px-2 py-1.5 text-xs"
        >
          <option value="">{pick(lang, "كل الأحجام", "Toutes tailles")}</option>
          <option value="REGULAR">{pick(lang, "صغير", "Régulier")}</option>
          <option value="LARGE">{pick(lang, "كبير", "Grande")}</option>
        </select>
      )}
      <QuantityInput
        name="quantity"
        baseUnit={selected?.unit ?? ""}
        placeholder={pick(lang, "الكمية لكل وحدة", "Qté par unité")}
        required
        className="w-32 rounded-md border border-neutral-300 px-2 py-1.5 text-xs focus:border-neutral-900 focus:outline-none"
      />
      <button
        type="submit"
        className="flex cursor-pointer items-center gap-1 rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-neutral-700"
      >
        <IconPlus className="h-3.5 w-3.5" />
        {pick(lang, "إضافة", "Ajouter")}
      </button>
    </form>
  );
}

export function StockRecipesView({
  categories,
  workstations,
  ingredients,
}: {
  categories: MenuCategory[];
  workstations: Workstation[];
  ingredients: Ingredient[];
}) {
  const { lang } = useLanguage();
  const [query, setQuery] = useState("");
  const [workstationFilter, setWorkstationFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const allItems = useMemo(() => categories.flatMap((c) => c.items), [categories]);
  const totalWithWorkstation = allItems.filter((i) => i.workstationId).length;
  const totalWithRecipe = allItems.filter((i) => i.recipeItems.length > 0).length;

  const filteredCategories = useMemo(() => {
    const q = query.trim().toLowerCase();
    return categories
      .map((category) => ({
        ...category,
        items: category.items.filter((item) => {
          if (q && !item.nameFr.toLowerCase().includes(q) && !item.nameAr.includes(q)) {
            return false;
          }
          if (workstationFilter === UNASSIGNED && item.workstationId) return false;
          if (
            workstationFilter &&
            workstationFilter !== UNASSIGNED &&
            item.workstationId !== workstationFilter
          ) {
            return false;
          }
          if (statusFilter === NO_RECIPE && item.recipeItems.length > 0) return false;
          return true;
        }),
      }))
      .filter((category) => category.items.length > 0);
  }, [categories, query, workstationFilter, statusFilter]);

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="mb-2 flex items-center gap-2 text-2xl font-semibold tracking-tight">
        <IconClipboard className="h-6 w-6 text-neutral-400" />
        {pick(lang, "الوصفات (فيش تقني)", "Fiches techniques")}
      </h1>
      <p className="mb-4 text-sm text-neutral-500">
        {pick(
          lang,
          "لكل طبق، حدد المحطة التي تُحضّره والمكوّنات المستهلكة لكل وحدة مباعة.",
          "Pour chaque plat, choisissez le poste qui le prépare et les ingrédients consommés par unité vendue."
        )}
      </p>

      <div className="mb-6 flex flex-wrap items-center gap-3 text-xs text-neutral-500">
        <span>
          {pick(
            lang,
            `${totalWithWorkstation} / ${allItems.length} طبق مرتبط بمحطة`,
            `${totalWithWorkstation} / ${allItems.length} plats liés à un poste`
          )}
        </span>
        <span aria-hidden="true">·</span>
        <span>
          {pick(
            lang,
            `${totalWithRecipe} / ${allItems.length} طبق له وصفة`,
            `${totalWithRecipe} / ${allItems.length} plats avec une recette`
          )}
        </span>
      </div>

      <div className="sticky top-0 z-10 mb-6 flex flex-wrap items-center gap-2 border-b border-neutral-200 bg-white py-3">
        <div className="relative flex-1 min-w-[12rem]">
          <IconSearch className="pointer-events-none absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={pick(lang, "بحث عن طبق...", "Rechercher un plat...")}
            className="w-full rounded-md border border-neutral-300 py-1.5 ps-8 pe-3 text-sm focus:border-neutral-900 focus:outline-none"
          />
        </div>
        <select
          value={workstationFilter}
          onChange={(e) => setWorkstationFilter(e.target.value)}
          className="cursor-pointer rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        >
          <option value="">{pick(lang, "كل المحطات", "Tous les postes")}</option>
          <option value={UNASSIGNED}>{pick(lang, "بدون محطة", "Sans poste")}</option>
          {workstations.map((ws) => (
            <option key={ws.id} value={ws.id}>
              {ws.kitchen.name} — {ws.name}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="cursor-pointer rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        >
          <option value="">{pick(lang, "كل الحالات", "Tous les statuts")}</option>
          <option value={NO_RECIPE}>{pick(lang, "بدون وصفة", "Sans recette")}</option>
        </select>
      </div>

      <div className="flex flex-col gap-8">
        {filteredCategories.map((category) => (
          <section key={category.id} className="rounded-lg border-2 border-neutral-300 p-5">
            <h2 className="mb-4 text-lg font-semibold">
              {category.section.nameFr} — {category.nameFr}
            </h2>

            <div className="flex flex-col gap-2">
              {category.items.map((item) => (
                <details key={item.id} className="group rounded-md border border-neutral-200">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-3 text-sm">
                    <span className="flex items-center gap-2">
                      <svg
                        viewBox="0 0 24 24"
                        className="h-3.5 w-3.5 shrink-0 text-neutral-400 transition-transform group-open:rotate-90"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="m9 6 6 6-6 6" />
                      </svg>
                      <span className="font-medium">
                        {item.nameFr}{" "}
                        <span className="font-normal text-neutral-400">/ {item.nameAr}</span>
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1 text-xs">
                      <ItemStatus item={item} lang={lang} />
                    </span>
                  </summary>

                  <div className="border-t border-neutral-100 p-4">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <label className="text-xs font-medium text-neutral-500">
                        {pick(lang, "المحطة:", "Poste :")}
                      </label>
                      <form action={setMenuItemWorkstation}>
                        <input type="hidden" name="menuItemId" value={item.id} />
                        <select
                          name="workstationId"
                          defaultValue={item.workstationId ?? ""}
                          onChange={(e) => e.currentTarget.form?.requestSubmit()}
                          className="cursor-pointer rounded-md border border-neutral-300 px-2 py-1 text-xs"
                        >
                          <option value="">{pick(lang, "بدون محطة", "Sans poste")}</option>
                          {workstations.map((ws) => (
                            <option key={ws.id} value={ws.id}>
                              {ws.kitchen.name} — {ws.name}
                            </option>
                          ))}
                        </select>
                      </form>
                    </div>

                    <div className="mb-3 flex flex-col divide-y divide-neutral-100">
                      {item.recipeItems.map((ri) => (
                        <div key={ri.id} className="flex items-center justify-between py-1.5">
                          <span className="text-sm">
                            {ri.ingredient.name} · {ri.quantity} {ri.ingredient.unit}
                            {ri.size && <span className="text-neutral-400"> ({ri.size})</span>}
                          </span>
                          <form action={deleteRecipeItem}>
                            <input type="hidden" name="id" value={ri.id} />
                            <button
                              type="submit"
                              className="cursor-pointer text-xs text-red-600 transition-colors hover:text-red-700 hover:underline"
                            >
                              {pick(lang, "حذف", "Supprimer")}
                            </button>
                          </form>
                        </div>
                      ))}
                      {item.recipeItems.length === 0 && (
                        <p className="py-1.5 text-sm text-neutral-400">
                          {pick(lang, "لا توجد مكوّنات محددة.", "Aucun ingrédient défini.")}
                        </p>
                      )}
                    </div>

                    <AddRecipeItemForm item={item} ingredients={ingredients} lang={lang} />
                  </div>
                </details>
              ))}
            </div>
          </section>
        ))}
        {filteredCategories.length === 0 && (
          <p className="text-sm text-neutral-400">
            {pick(
              lang,
              "لا توجد أطباق مطابقة. جرّب كلمات بحث أخرى.",
              "Aucun plat ne correspond. Essayez d'autres termes de recherche."
            )}
          </p>
        )}
      </div>
    </main>
  );
}
