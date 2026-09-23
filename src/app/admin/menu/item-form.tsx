"use client";

import { useLanguage, pick } from "@/lib/language-context";
import { inputClass, primaryButtonClass } from "./controls";
import type { AdminMenuItem, CategoryChoice } from "./types";

export function ItemForm({
  action,
  categoryId,
  item,
  categories,
  onDone,
}: {
  action: (formData: FormData) => void | Promise<void>;
  categoryId: string;
  item?: AdminMenuItem;
  // Only offered when editing, to move an item to another category.
  categories?: CategoryChoice[];
  onDone?: () => void;
}) {
  const { lang } = useLanguage();

  return (
    <form
      action={async (formData) => {
        await action(formData);
        onDone?.();
      }}
      className="grid grid-cols-1 gap-3 sm:grid-cols-2"
    >
      {item && <input type="hidden" name="id" value={item.id} />}
      {categories ? (
        <label className="flex flex-col gap-1 text-xs text-neutral-500 sm:col-span-2">
          {pick(lang, "الفئة", "Catégorie")}
          <select
            name="categoryId"
            defaultValue={categoryId}
            className={inputClass}
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <input type="hidden" name="categoryId" value={categoryId} />
      )}
      <input
        name="nameFr"
        defaultValue={item?.nameFr}
        placeholder="Nom (français)"
        required
        className={inputClass}
      />
      <input
        name="nameAr"
        defaultValue={item?.nameAr}
        placeholder="الاسم (عربي)"
        required
        dir="rtl"
        className={inputClass}
      />
      <textarea
        name="descriptionFr"
        defaultValue={item?.descriptionFr ?? ""}
        placeholder="Description (français, optionnel)"
        rows={2}
        maxLength={500}
        className={`${inputClass} sm:col-span-2`}
      />
      <textarea
        name="descriptionAr"
        defaultValue={item?.descriptionAr ?? ""}
        placeholder="الوصف (عربي، اختياري)"
        rows={2}
        maxLength={500}
        dir="rtl"
        className={`${inputClass} sm:col-span-2`}
      />
      <input
        name="noteFr"
        defaultValue={item?.noteFr ?? ""}
        placeholder="Note, ex. Tous les lundis (optionnel)"
        className={inputClass}
      />
      <input
        name="noteAr"
        defaultValue={item?.noteAr ?? ""}
        placeholder="ملاحظة، مثال: كل اثنين (اختياري)"
        dir="rtl"
        className={inputClass}
      />
      <input
        name="price"
        type="number"
        step="0.01"
        min="0"
        defaultValue={item?.price ?? ""}
        placeholder={pick(lang, "السعر (أو الحجم الصغير)", "Prix (ou petite taille)")}
        className={inputClass}
      />
      <input
        name="priceLarge"
        type="number"
        step="0.01"
        min="0"
        defaultValue={item?.priceLarge ?? ""}
        placeholder={pick(
          lang,
          "سعر الحجم الكبير (اختياري)",
          "Prix grande taille (optionnel)"
        )}
        className={inputClass}
      />
      <div className="flex items-center gap-2 sm:col-span-2">
        {item?.photoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.photoUrl}
            alt=""
            className="h-10 w-10 shrink-0 rounded object-cover"
          />
        )}
        <input
          name="photoUrl"
          defaultValue={item?.photoUrl ?? ""}
          placeholder={pick(
            lang,
            "رابط صورة الطبق (اختياري)",
            "URL de la photo du plat (optionnel)"
          )}
          className={`${inputClass} flex-1`}
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-neutral-600 sm:col-span-2">
        <input
          type="checkbox"
          name="comingSoon"
          defaultChecked={item?.comingSoon}
        />
        {pick(lang, "قريباً (بدون عرض السعر)", "Bientôt (sans prix affiché)")}
      </label>
      <button type="submit" className={`${primaryButtonClass} sm:col-span-2`}>
        {item
          ? pick(lang, "حفظ التعديلات", "Enregistrer les modifications")
          : pick(lang, "إضافة عنصر", "Ajouter l'article")}
      </button>
    </form>
  );
}
