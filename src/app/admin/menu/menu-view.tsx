"use client";

import { useState, type ReactNode } from "react";
import { useLanguage, pick } from "@/lib/language-context";
import {
  createSection,
  updateSection,
  deleteSection,
  moveSection,
  createCategory,
  updateCategory,
  deleteCategory,
  moveCategory,
  createItem,
  updateItem,
  duplicateItem,
  deleteItem,
  moveItem,
  toggleItemAvailability,
} from "@/app/actions/menu";
import { KpiCard } from "@/app/admin/kpi-card";
import { IconClipboard, IconGrid, IconCheckCircle, IconAlertTriangle } from "@/app/admin/stock/icons";
import {
  DeleteButton,
  MoveButtons,
  inputClass,
  linkButtonClass,
  primaryButtonClass,
} from "./controls";
import { ItemForm } from "./item-form";
import { OptionGroupsEditor } from "./option-groups-editor";
import type {
  AdminMenuSection,
  AdminMenuCategory,
  AdminMenuItem,
  CategoryChoice,
} from "./types";

function priceLabel(lang: "ar" | "fr", item: AdminMenuItem) {
  if (item.comingSoon) return pick(lang, "(قريباً)", "(bientôt)");
  if (item.priceLarge != null) return `${item.price ?? "–"} / ${item.priceLarge}`;
  if (item.price != null) return pick(lang, `${item.price} درهم`, `${item.price} DH`);
  return "";
}

function RenameForm({
  action,
  id,
  nameFr,
  nameAr,
  extra,
  onDone,
}: {
  action: (formData: FormData) => void | Promise<void>;
  id: string;
  nameFr: string;
  nameAr: string;
  extra?: ReactNode;
  onDone: () => void;
}) {
  const { lang } = useLanguage();
  return (
    <form
      action={async (formData) => {
        await action(formData);
        onDone();
      }}
      className="flex flex-1 flex-wrap items-center gap-2"
    >
      <input type="hidden" name="id" value={id} />
      <input name="nameFr" defaultValue={nameFr} required className={`${inputClass} flex-1`} />
      <input
        name="nameAr"
        defaultValue={nameAr}
        required
        dir="rtl"
        className={`${inputClass} flex-1`}
      />
      {extra}
      <button type="submit" className={primaryButtonClass}>
        {pick(lang, "حفظ", "Enregistrer")}
      </button>
      <button type="button" onClick={onDone} className={linkButtonClass}>
        {pick(lang, "إلغاء", "Annuler")}
      </button>
    </form>
  );
}

function ItemRow({
  item,
  isFirst,
  isLast,
  categoryChoices,
}: {
  item: AdminMenuItem;
  isFirst: boolean;
  isLast: boolean;
  categoryChoices: CategoryChoice[];
}) {
  const { lang } = useLanguage();
  const [open, setOpen] = useState(false);
  const optionCount = item.optionGroups.length;

  return (
    <div className="py-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className={`flex min-w-0 items-center gap-3 ${!item.available ? "opacity-40" : ""}`}>
          {item.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.photoUrl} alt="" className="h-10 w-10 shrink-0 rounded object-cover" />
          ) : (
            <div className="h-10 w-10 shrink-0 rounded bg-neutral-100" />
          )}
          <div className="min-w-0">
            <p className="font-medium">
              {item.nameFr}{" "}
              <span className="font-normal text-neutral-400">/ {item.nameAr}</span>{" "}
              <span className="font-normal text-neutral-500">{priceLabel(lang, item)}</span>
            </p>
            {(item.descriptionFr || item.descriptionAr) && (
              <p className="truncate text-sm text-neutral-500">
                {item.descriptionFr} {item.descriptionAr && `/ ${item.descriptionAr}`}
              </p>
            )}
            <div className="flex flex-wrap gap-1.5">
              {(item.noteFr || item.noteAr) && (
                <span className="text-xs text-neutral-400">
                  {item.noteFr} {item.noteAr && `/ ${item.noteAr}`}
                </span>
              )}
              {optionCount > 0 && (
                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-600">
                  {optionCount} {pick(lang, "مجموعة اختيارات", optionCount > 1 ? "groupes d'options" : "groupe d'options")}
                </span>
              )}
              {!item.available && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] text-amber-800">
                  {pick(lang, "مخفي", "Masqué")}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          <MoveButtons action={moveItem} id={item.id} isFirst={isFirst} isLast={isLast} />
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="text-xs font-medium text-neutral-900 hover:underline"
          >
            {open ? pick(lang, "إغلاق", "Fermer") : pick(lang, "تعديل", "Modifier")}
          </button>
          <form action={duplicateItem}>
            <input type="hidden" name="id" value={item.id} />
            <button type="submit" className={linkButtonClass}>
              {pick(lang, "نسخ", "Dupliquer")}
            </button>
          </form>
          <form action={toggleItemAvailability}>
            <input type="hidden" name="id" value={item.id} />
            <input type="hidden" name="available" value={String(item.available)} />
            <button type="submit" className={linkButtonClass}>
              {item.available ? pick(lang, "إخفاء", "Masquer") : pick(lang, "إظهار", "Afficher")}
            </button>
          </form>
          <DeleteButton
            action={deleteItem}
            id={item.id}
            label={pick(lang, "حذف", "Supprimer")}
            confirmMessage={pick(
              lang,
              `حذف "${item.nameAr}"؟`,
              `Supprimer « ${item.nameFr} » ?`
            )}
          />
        </div>
      </div>

      {open && (
        <div className="mt-4 flex flex-col gap-6 rounded-md bg-neutral-50 p-4">
          <ItemForm
            action={updateItem}
            item={item}
            categoryId={item.categoryId}
            categories={categoryChoices}
            onDone={() => setOpen(false)}
          />
          <div className="border-t border-neutral-200 pt-4">
            <OptionGroupsEditor menuItemId={item.id} groups={item.optionGroups} />
          </div>
        </div>
      )}
    </div>
  );
}

function CategoryCard({
  category,
  isFirst,
  isLast,
  sections,
  categoryChoices,
}: {
  category: AdminMenuCategory;
  isFirst: boolean;
  isLast: boolean;
  sections: AdminMenuSection[];
  categoryChoices: CategoryChoice[];
}) {
  const { lang } = useLanguage();
  const [editing, setEditing] = useState(false);

  return (
    <div className="rounded-md border border-neutral-200 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        {editing ? (
          <RenameForm
            action={updateCategory}
            id={category.id}
            nameFr={category.nameFr}
            nameAr={category.nameAr}
            onDone={() => setEditing(false)}
            extra={
              <select name="sectionId" defaultValue={category.sectionId} className={inputClass}>
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {pick(lang, s.nameAr, s.nameFr)}
                  </option>
                ))}
              </select>
            }
          />
        ) : (
          <>
            <h3 className="font-medium">
              {category.nameFr}{" "}
              <span className="font-normal text-neutral-400">/ {category.nameAr}</span>
            </h3>
            <div className="flex items-center gap-3">
              <MoveButtons
                action={moveCategory}
                id={category.id}
                isFirst={isFirst}
                isLast={isLast}
              />
              <button type="button" onClick={() => setEditing(true)} className={linkButtonClass}>
                {pick(lang, "تعديل", "Modifier")}
              </button>
              <DeleteButton
                action={deleteCategory}
                id={category.id}
                label={pick(lang, "حذف الفئة", "Supprimer la catégorie")}
                confirmMessage={pick(
                  lang,
                  `حذف الفئة "${category.nameAr}" وكل عناصرها (${category.items.length})؟`,
                  `Supprimer la catégorie « ${category.nameFr} » et ses ${category.items.length} article(s) ?`
                )}
              />
            </div>
          </>
        )}
      </div>

      <div className="flex flex-col divide-y divide-neutral-100">
        {category.items.map((item, index) => (
          <ItemRow
            key={item.id}
            item={item}
            isFirst={index === 0}
            isLast={index === category.items.length - 1}
            categoryChoices={categoryChoices}
          />
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
        <div className="mt-3">
          <ItemForm action={createItem} categoryId={category.id} />
        </div>
      </details>
    </div>
  );
}

function SectionCard({
  section,
  isFirst,
  isLast,
  sections,
  categoryChoices,
}: {
  section: AdminMenuSection;
  isFirst: boolean;
  isLast: boolean;
  sections: AdminMenuSection[];
  categoryChoices: CategoryChoice[];
}) {
  const { lang } = useLanguage();
  const [editing, setEditing] = useState(false);
  const itemCount = section.categories.reduce((sum, c) => sum + c.items.length, 0);

  return (
    <section className="rounded-lg border-2 border-neutral-300 p-5">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        {editing ? (
          <RenameForm
            action={updateSection}
            id={section.id}
            nameFr={section.nameFr}
            nameAr={section.nameAr}
            onDone={() => setEditing(false)}
          />
        ) : (
          <>
            <h2 className="text-xl font-semibold">
              {section.nameFr}{" "}
              <span className="text-base font-normal text-neutral-400">/ {section.nameAr}</span>
            </h2>
            <div className="flex items-center gap-3">
              <MoveButtons action={moveSection} id={section.id} isFirst={isFirst} isLast={isLast} />
              <button type="button" onClick={() => setEditing(true)} className={linkButtonClass}>
                {pick(lang, "تعديل", "Modifier")}
              </button>
              <DeleteButton
                action={deleteSection}
                id={section.id}
                label={pick(lang, "حذف القسم", "Supprimer la section")}
                confirmMessage={pick(
                  lang,
                  `حذف القسم "${section.nameAr}" مع ${section.categories.length} فئة و${itemCount} عنصر؟`,
                  `Supprimer la section « ${section.nameFr} », ses ${section.categories.length} catégorie(s) et ${itemCount} article(s) ?`
                )}
              />
            </div>
          </>
        )}
      </div>

      <div className="flex flex-col gap-8">
        {section.categories.map((category, index) => (
          <CategoryCard
            key={category.id}
            category={category}
            isFirst={index === 0}
            isLast={index === section.categories.length - 1}
            sections={sections}
            categoryChoices={categoryChoices}
          />
        ))}

        <form
          action={createCategory}
          className="flex flex-wrap gap-3 rounded-md border border-dashed border-neutral-300 p-4"
        >
          <input type="hidden" name="sectionId" value={section.id} />
          <input
            name="nameFr"
            placeholder="Nouvelle catégorie (français)"
            required
            className={`${inputClass} flex-1`}
          />
          <input
            name="nameAr"
            placeholder="اسم الفئة (عربي)"
            required
            dir="rtl"
            className={`${inputClass} flex-1`}
          />
          <button type="submit" className={primaryButtonClass}>
            {pick(lang, "إضافة فئة", "Ajouter une catégorie")}
          </button>
        </form>
      </div>
    </section>
  );
}

export function AdminMenuView({ sections }: { sections: AdminMenuSection[] }) {
  const { lang } = useLanguage();

  const categories = sections.flatMap((s) => s.categories);
  const items = categories.flatMap((c) => c.items);
  const unavailableCount = items.filter((i) => !i.available).length;

  const categoryChoices: CategoryChoice[] = sections.flatMap((s) =>
    s.categories.map((c) => ({
      id: c.id,
      label: `${pick(lang, s.nameAr, s.nameFr)} › ${pick(lang, c.nameAr, c.nameFr)}`,
    }))
  );

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">
        {pick(lang, "القائمة", "Menu")}
      </h1>

      <div className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard icon={IconGrid} label={pick(lang, "أقسام", "Sections")} value={sections.length} />
        <KpiCard
          icon={IconClipboard}
          label={pick(lang, "فئات", "Catégories")}
          value={categories.length}
        />
        <KpiCard
          icon={IconCheckCircle}
          label={pick(lang, "إجمالي الأطباق", "Plats au total")}
          value={items.length}
        />
        <KpiCard
          icon={IconAlertTriangle}
          label={pick(lang, "غير متوفر", "Indisponibles")}
          value={unavailableCount}
          tone={unavailableCount > 0 ? "warn" : "good"}
        />
      </div>

      <div className="flex flex-col gap-12">
        {sections.map((section, index) => (
          <SectionCard
            key={section.id}
            section={section}
            isFirst={index === 0}
            isLast={index === sections.length - 1}
            sections={sections}
            categoryChoices={categoryChoices}
          />
        ))}
      </div>

      <form
        action={createSection}
        className="mt-10 flex flex-wrap gap-3 rounded-lg border border-dashed border-neutral-400 p-5"
      >
        <input
          name="nameFr"
          placeholder="Nouvelle section (français), ex. Les bons débuts !"
          required
          className={`${inputClass} flex-1`}
        />
        <input
          name="nameAr"
          placeholder="عنوان القسم (عربي)"
          required
          dir="rtl"
          className={`${inputClass} flex-1`}
        />
        <button type="submit" className={primaryButtonClass}>
          {pick(lang, "إضافة قسم", "Ajouter une section")}
        </button>
      </form>
    </main>
  );
}
