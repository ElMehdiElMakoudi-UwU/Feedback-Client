"use client";

import { useLanguage, pick } from "@/lib/language-context";
import {
  createKitchen,
  deleteKitchen,
  createWorkstation,
  deleteWorkstation,
  addWorkstationIngredient,
  removeWorkstationIngredient,
} from "@/app/actions/stock";
import { IconBuilding, IconFlame, IconPlus, IconTrash } from "@/app/admin/stock/icons";

type Ingredient = { id: string; name: string; unit: string };

type WorkstationIngredient = {
  id: string;
  currentQuantity: number;
  ingredient: Ingredient;
};

type Workstation = {
  id: string;
  name: string;
  ingredients: WorkstationIngredient[];
};

type Kitchen = {
  id: string;
  name: string;
  workstations: Workstation[];
};

export function PostesView({
  kitchens,
  ingredients,
}: {
  kitchens: Kitchen[];
  ingredients: Ingredient[];
}) {
  const { lang } = useLanguage();

  return (
    <>
      <div className="flex flex-col gap-8">
        {kitchens.map((kitchen) => (
          <section key={kitchen.id} className="rounded-lg border-2 border-neutral-300 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <IconBuilding className="h-5 w-5 text-neutral-400" />
                {kitchen.name}
              </h2>
              <form action={deleteKitchen}>
                <input type="hidden" name="id" value={kitchen.id} />
                <button
                  type="submit"
                  className="flex cursor-pointer items-center gap-1 text-xs text-red-600 transition-colors hover:text-red-700 hover:underline"
                >
                  <IconTrash className="h-3.5 w-3.5" />
                  {pick(lang, "حذف المطبخ", "Supprimer la cuisine")}
                </button>
              </form>
            </div>

            <div className="flex flex-col gap-6">
              {kitchen.workstations.map((ws) => (
                <div key={ws.id} className="rounded-md border border-neutral-200 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="flex items-center gap-2 font-medium">
                      <IconFlame className="h-4 w-4 text-neutral-400" />
                      {ws.name}
                    </h3>
                    <form action={deleteWorkstation}>
                      <input type="hidden" name="id" value={ws.id} />
                      <button
                        type="submit"
                        className="flex cursor-pointer items-center gap-1 text-xs text-red-600 transition-colors hover:text-red-700 hover:underline"
                      >
                        <IconTrash className="h-3.5 w-3.5" />
                        {pick(lang, "حذف المحطة", "Supprimer le poste")}
                      </button>
                    </form>
                  </div>

                  <div className="mb-3 flex flex-col divide-y divide-neutral-100">
                    {ws.ingredients.map((wi) => (
                      <div key={wi.id} className="flex items-center justify-between py-2">
                        <span className="text-sm">
                          {wi.ingredient.name}{" "}
                          <span className="text-neutral-400">
                            · {wi.currentQuantity} {wi.ingredient.unit}
                          </span>
                        </span>
                        <form action={removeWorkstationIngredient}>
                          <input type="hidden" name="id" value={wi.id} />
                          <button
                            type="submit"
                            className="cursor-pointer text-xs text-red-600 transition-colors hover:text-red-700 hover:underline"
                          >
                            {pick(lang, "إزالة", "Retirer")}
                          </button>
                        </form>
                      </div>
                    ))}
                    {ws.ingredients.length === 0 && (
                      <p className="py-2 text-sm text-neutral-400">
                        {pick(lang, "لا توجد مكوّنات في هذه المحطة.", "Aucun ingrédient sur ce poste.")}
                      </p>
                    )}
                  </div>

                  <form action={addWorkstationIngredient} className="flex flex-wrap gap-2">
                    <input type="hidden" name="workstationId" value={ws.id} />
                    <select
                      name="ingredientId"
                      required
                      className="flex-1 cursor-pointer rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
                    >
                      <option value="">
                        {pick(lang, "اختر مكوّناً", "Choisir un ingrédient")}
                      </option>
                      {ingredients.map((ing) => (
                        <option key={ing.id} value={ing.id}>
                          {ing.name} ({ing.unit})
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      className="flex cursor-pointer items-center gap-1.5 rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-neutral-700"
                    >
                      <IconPlus className="h-4 w-4" />
                      {pick(lang, "إضافة", "Ajouter")}
                    </button>
                  </form>
                </div>
              ))}

              <form
                action={createWorkstation}
                className="flex flex-wrap gap-3 rounded-md border border-dashed border-neutral-300 p-4"
              >
                <input type="hidden" name="kitchenId" value={kitchen.id} />
                <input
                  name="name"
                  placeholder={pick(lang, "اسم المحطة الجديدة، مثال: تاكوس", "Nom du poste, ex. Tacos")}
                  required
                  className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
                />
                <button
                  type="submit"
                  className="flex cursor-pointer items-center gap-1.5 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-700"
                >
                  <IconPlus className="h-4 w-4" />
                  {pick(lang, "إضافة محطة", "Ajouter un poste")}
                </button>
              </form>
            </div>
          </section>
        ))}
        {kitchens.length === 0 && (
          <p className="text-sm text-neutral-400">
            {pick(lang, "لا توجد مطابخ بعد.", "Aucune cuisine pour le moment.")}
          </p>
        )}
      </div>

      <form
        action={createKitchen}
        className="mt-10 flex flex-wrap gap-3 rounded-lg border border-dashed border-neutral-400 p-5"
      >
        <input
          name="name"
          placeholder={pick(lang, "اسم المطبخ الجديد، مثال: مطبخ 1", "Nom de la cuisine, ex. Cuisine 1")}
          required
          className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
        />
        <button
          type="submit"
          className="flex cursor-pointer items-center gap-1.5 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-700"
        >
          <IconPlus className="h-4 w-4" />
          {pick(lang, "إضافة مطبخ", "Ajouter une cuisine")}
        </button>
      </form>
    </>
  );
}
