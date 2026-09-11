"use client";

import { useLanguage, pick } from "@/lib/language-context";
import {
  createSection,
  deleteSection,
  createCategory,
  deleteCategory,
  createItem,
  deleteItem,
  toggleItemAvailability,
} from "@/app/actions/menu";

type MenuItem = {
  id: string;
  nameFr: string;
  nameAr: string;
  descriptionFr: string | null;
  descriptionAr: string | null;
  noteFr: string | null;
  noteAr: string | null;
  price: number | null;
  priceLarge: number | null;
  comingSoon: boolean;
  available: boolean;
};

type MenuCategory = {
  id: string;
  nameFr: string;
  nameAr: string;
  items: MenuItem[];
};

type MenuSection = {
  id: string;
  nameFr: string;
  nameAr: string;
  categories: MenuCategory[];
};

export function AdminMenuView({ sections }: { sections: MenuSection[] }) {
  const { lang } = useLanguage();

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="mb-8 text-2xl font-semibold tracking-tight">
        {pick(lang, "القائمة", "Menu")}
      </h1>

      <div className="flex flex-col gap-12">
        {sections.map((section) => (
          <section
            key={section.id}
            className="rounded-lg border-2 border-neutral-300 p-5"
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                {section.nameFr}{" "}
                <span className="text-base font-normal text-neutral-400">
                  / {section.nameAr}
                </span>
              </h2>
              <form action={deleteSection}>
                <input type="hidden" name="id" value={section.id} />
                <button
                  type="submit"
                  className="text-xs text-red-600 hover:underline"
                >
                  {pick(lang, "حذف القسم", "Supprimer la section")}
                </button>
              </form>
            </div>

            <div className="flex flex-col gap-8">
              {section.categories.map((category) => (
                <div
                  key={category.id}
                  className="rounded-md border border-neutral-200 p-4"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-medium">
                      {category.nameFr}{" "}
                      <span className="font-normal text-neutral-400">
                        / {category.nameAr}
                      </span>
                    </h3>
                    <form action={deleteCategory}>
                      <input type="hidden" name="id" value={category.id} />
                      <button
                        type="submit"
                        className="text-xs text-red-600 hover:underline"
                      >
                        {pick(lang, "حذف الفئة", "Supprimer la catégorie")}
                      </button>
                    </form>
                  </div>

                  <div className="flex flex-col divide-y divide-neutral-100">
                    {category.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-4 py-3"
                      >
                        <div className={!item.available ? "opacity-40" : ""}>
                          <p className="font-medium">
                            {item.nameFr}{" "}
                            <span className="font-normal text-neutral-400">
                              / {item.nameAr}
                            </span>{" "}
                            <span className="font-normal text-neutral-500">
                              {item.comingSoon
                                ? pick(lang, "(قريباً)", "(bientôt)")
                                : item.priceLarge != null
                                  ? `${item.price} / ${item.priceLarge}`
                                  : item.price != null
                                    ? pick(
                                        lang,
                                        `${item.price} درهم`,
                                        `${item.price} DH`
                                      )
                                    : ""}
                            </span>
                          </p>
                          {(item.descriptionFr || item.descriptionAr) && (
                            <p className="text-sm text-neutral-500">
                              {item.descriptionFr}{" "}
                              {item.descriptionAr && `/ ${item.descriptionAr}`}
                            </p>
                          )}
                          {(item.noteFr || item.noteAr) && (
                            <p className="text-xs text-neutral-400">
                              {item.noteFr} {item.noteAr && `/ ${item.noteAr}`}
                            </p>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                          <form action={toggleItemAvailability}>
                            <input type="hidden" name="id" value={item.id} />
                            <input
                              type="hidden"
                              name="available"
                              value={String(item.available)}
                            />
                            <button
                              type="submit"
                              className="text-xs text-neutral-600 hover:underline"
                            >
                              {item.available
                                ? pick(lang, "إخفاء", "Masquer")
                                : pick(lang, "إظهار", "Afficher")}
                            </button>
                          </form>
                          <form action={deleteItem}>
                            <input type="hidden" name="id" value={item.id} />
                            <button
                              type="submit"
                              className="text-xs text-red-600 hover:underline"
                            >
                              {pick(lang, "حذف", "Supprimer")}
                            </button>
                          </form>
                        </div>
                      </div>
                    ))}
                    {category.items.length === 0 && (
                      <p className="py-3 text-sm text-neutral-400">
                        {pick(lang, "لا توجد عناصر بعد.", "Aucun article pour le moment.")}
                      </p>
                    )}
                  </div>

                  <details className="mt-4 border-t border-neutral-100 pt-4">
                    <summary className="cursor-pointer text-sm font-medium text-neutral-700">
                      {pick(lang, "إضافة عنصر", "Ajouter un article")}
                    </summary>
                    <form
                      action={createItem}
                      className="mt-3 grid grid-cols-2 gap-3"
                    >
                      <input
                        type="hidden"
                        name="categoryId"
                        value={category.id}
                      />
                      <input
                        name="nameFr"
                        placeholder="Name (French)"
                        required
                        className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
                      />
                      <input
                        name="nameAr"
                        placeholder="الاسم (عربي)"
                        required
                        dir="rtl"
                        className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
                      />
                      <input
                        name="descriptionFr"
                        placeholder="Description (French, optional)"
                        className="col-span-2 rounded-md border border-neutral-300 px-3 py-2 text-sm"
                      />
                      <input
                        name="descriptionAr"
                        placeholder="الوصف (عربي، اختياري)"
                        dir="rtl"
                        className="col-span-2 rounded-md border border-neutral-300 px-3 py-2 text-sm"
                      />
                      <input
                        name="noteFr"
                        placeholder="Note, e.g. Tous les lundis (optional)"
                        className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
                      />
                      <input
                        name="noteAr"
                        placeholder="ملاحظة، مثال: كل اثنين (اختياري)"
                        dir="rtl"
                        className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
                      />
                      <input
                        name="price"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder={pick(
                          lang,
                          "السعر (أو الحجم الصغير)",
                          "Prix (ou petite taille)"
                        )}
                        className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
                      />
                      <input
                        name="priceLarge"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder={pick(
                          lang,
                          "سعر الحجم الكبير (اختياري)",
                          "Prix grande taille (optionnel)"
                        )}
                        className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
                      />
                      <label className="col-span-2 flex items-center gap-2 text-sm text-neutral-600">
                        <input type="checkbox" name="comingSoon" />
                        {pick(lang, "قريباً (بدون عرض السعر)", "Bientôt (sans prix affiché)")}
                      </label>
                      <button
                        type="submit"
                        className="col-span-2 rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-700"
                      >
                        {pick(lang, "إضافة عنصر", "Ajouter l'article")}
                      </button>
                    </form>
                  </details>
                </div>
              ))}

              <form
                action={createCategory}
                className="flex flex-wrap gap-3 rounded-md border border-dashed border-neutral-300 p-4"
              >
                <input type="hidden" name="sectionId" value={section.id} />
                <input
                  name="nameFr"
                  placeholder="New category name (French)"
                  required
                  className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm"
                />
                <input
                  name="nameAr"
                  placeholder="اسم الفئة (عربي)"
                  required
                  dir="rtl"
                  className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm"
                />
                <button
                  type="submit"
                  className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
                >
                  {pick(lang, "إضافة فئة", "Ajouter une catégorie")}
                </button>
              </form>
            </div>
          </section>
        ))}
      </div>

      <form
        action={createSection}
        className="mt-10 flex flex-wrap gap-3 rounded-lg border border-dashed border-neutral-400 p-5"
      >
        <input
          name="nameFr"
          placeholder="New section title (French), e.g. Les bons débuts !"
          required
          className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
        <input
          name="nameAr"
          placeholder="عنوان القسم (عربي)"
          required
          dir="rtl"
          className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
        >
          {pick(lang, "إضافة قسم", "Ajouter une section")}
        </button>
      </form>
    </main>
  );
}
