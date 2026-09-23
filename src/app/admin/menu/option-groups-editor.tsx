"use client";

import { useLanguage, pick } from "@/lib/language-context";
import { formatPriceDelta } from "@/lib/menu-options";
import {
  createOptionGroup,
  updateOptionGroup,
  deleteOptionGroup,
  moveOptionGroup,
  createOption,
  updateOption,
  deleteOption,
  moveOption,
  toggleOptionAvailability,
} from "@/app/actions/menu";
import {
  DeleteButton,
  MoveButtons,
  inputClass,
  smallInputClass,
  linkButtonClass,
  primaryButtonClass,
} from "./controls";
import type { AdminMenuOptionGroup, AdminMenuOption } from "./types";

function selectionLabel(lang: "ar" | "fr", group: Pick<AdminMenuOptionGroup, "required" | "maxSelect">) {
  const need = group.required
    ? pick(lang, "إجباري", "Obligatoire")
    : pick(lang, "اختياري", "Optionnel");
  const count =
    group.maxSelect === 1
      ? pick(lang, "اختيار واحد", "choix unique")
      : group.maxSelect === 0
        ? pick(lang, "بدون حد", "sans limite")
        : pick(lang, `حتى ${group.maxSelect}`, `jusqu'à ${group.maxSelect}`);
  return `${need} · ${count}`;
}

function GroupFields({ group }: { group?: AdminMenuOptionGroup }) {
  const { lang } = useLanguage();
  const maxChoices = [1, 2, 3, 4, 5];
  if (group && group.maxSelect > 5) maxChoices.push(group.maxSelect);

  return (
    <>
      <input
        name="nameFr"
        defaultValue={group?.nameFr}
        placeholder="Nom du choix, ex. Sauce"
        required
        className={inputClass}
      />
      <input
        name="nameAr"
        defaultValue={group?.nameAr}
        placeholder="اسم الاختيار، مثال: الصلصة"
        required
        dir="rtl"
        className={inputClass}
      />
      <select
        name="maxSelect"
        defaultValue={group?.maxSelect ?? 1}
        className={inputClass}
      >
        {maxChoices.map((n) => (
          <option key={n} value={n}>
            {n === 1
              ? pick(lang, "اختيار واحد", "Un seul choix")
              : pick(lang, `حتى ${n} اختيارات`, `Jusqu'à ${n} choix`)}
          </option>
        ))}
        <option value={0}>{pick(lang, "بدون حد", "Sans limite")}</option>
      </select>
      <label className="flex items-center gap-2 text-sm text-neutral-600">
        <input
          type="checkbox"
          name="required"
          defaultChecked={group?.required}
        />
        {pick(lang, "إجباري", "Obligatoire")}
      </label>
    </>
  );
}

function OptionRow({
  option,
  isFirst,
  isLast,
}: {
  option: AdminMenuOption;
  isFirst: boolean;
  isLast: boolean;
}) {
  const { lang } = useLanguage();
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 py-1.5">
      <details className="group min-w-0 flex-1">
        <summary
          className={`cursor-pointer list-none text-sm ${!option.available ? "opacity-40" : ""}`}
        >
          {option.nameFr}{" "}
          <span className="text-neutral-400">/ {option.nameAr}</span>
          {option.priceDelta !== 0 && (
            <span className="ml-2 text-xs text-neutral-500">
              {formatPriceDelta(option.priceDelta)} {pick(lang, "درهم", "DH")}
            </span>
          )}
          <span className="ml-2 text-xs text-neutral-400 group-open:hidden">
            ✎
          </span>
        </summary>
        <form
          action={updateOption}
          className="mt-2 flex flex-wrap items-center gap-2"
        >
          <input type="hidden" name="id" value={option.id} />
          <input
            name="nameFr"
            defaultValue={option.nameFr}
            required
            className={`${smallInputClass} w-32`}
          />
          <input
            name="nameAr"
            defaultValue={option.nameAr}
            required
            dir="rtl"
            className={`${smallInputClass} w-32`}
          />
          <input
            name="priceDelta"
            type="number"
            step="0.01"
            defaultValue={option.priceDelta}
            className={`${smallInputClass} w-20`}
          />
          <button type="submit" className={linkButtonClass}>
            {pick(lang, "حفظ", "Enregistrer")}
          </button>
        </form>
      </details>
      <div className="flex shrink-0 items-center gap-3">
        <MoveButtons
          action={moveOption}
          id={option.id}
          isFirst={isFirst}
          isLast={isLast}
        />
        <form action={toggleOptionAvailability}>
          <input type="hidden" name="id" value={option.id} />
          <input type="hidden" name="available" value={String(option.available)} />
          <button type="submit" className={linkButtonClass}>
            {option.available
              ? pick(lang, "إخفاء", "Masquer")
              : pick(lang, "إظهار", "Afficher")}
          </button>
        </form>
        <DeleteButton
          action={deleteOption}
          id={option.id}
          label="×"
          confirmMessage={pick(
            lang,
            `حذف "${option.nameAr}"؟`,
            `Supprimer « ${option.nameFr} » ?`
          )}
        />
      </div>
    </div>
  );
}

export function OptionGroupsEditor({
  menuItemId,
  groups,
}: {
  menuItemId: string;
  groups: AdminMenuOptionGroup[];
}) {
  const { lang } = useLanguage();

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium text-neutral-700">
        {pick(lang, "الاختيارات", "Options")}
        <span className="ml-2 text-xs font-normal text-neutral-400">
          {pick(
            lang,
            "مثال: الصلصة، الإضافات، درجة الطهي",
            "ex. sauce, suppléments, cuisson"
          )}
        </span>
      </p>

      {groups.map((group, index) => (
        <div key={group.id} className="rounded-md border border-neutral-200 p-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <details className="group min-w-0 flex-1">
              <summary className="cursor-pointer list-none">
                <span className="text-sm font-medium">
                  {group.nameFr}{" "}
                  <span className="font-normal text-neutral-400">/ {group.nameAr}</span>
                </span>
                <span className="ml-2 text-xs text-neutral-500">
                  {selectionLabel(lang, group)}
                </span>
                <span className="ml-2 text-xs text-neutral-400 group-open:hidden">
                  ✎
                </span>
              </summary>
              <form
                action={updateOptionGroup}
                className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2"
              >
                <input type="hidden" name="id" value={group.id} />
                <GroupFields group={group} />
                <button type="submit" className={`${primaryButtonClass} sm:col-span-2`}>
                  {pick(lang, "حفظ", "Enregistrer")}
                </button>
              </form>
            </details>
            <div className="flex shrink-0 items-center gap-3">
              <MoveButtons
                action={moveOptionGroup}
                id={group.id}
                isFirst={index === 0}
                isLast={index === groups.length - 1}
              />
              <DeleteButton
                action={deleteOptionGroup}
                id={group.id}
                label={pick(lang, "حذف", "Supprimer")}
                confirmMessage={pick(
                  lang,
                  `حذف "${group.nameAr}" وكل اختياراته؟`,
                  `Supprimer « ${group.nameFr} » et tous ses choix ?`
                )}
              />
            </div>
          </div>

          <div className="mt-2 flex flex-col divide-y divide-neutral-100 border-t border-neutral-100 pl-3">
            {group.options.map((option, optionIndex) => (
              <OptionRow
                key={option.id}
                option={option}
                isFirst={optionIndex === 0}
                isLast={optionIndex === group.options.length - 1}
              />
            ))}
            {group.options.length === 0 && (
              <p className="py-1.5 text-xs text-amber-700">
                {pick(
                  lang,
                  "لا توجد اختيارات بعد — لن يظهر هذا الاختيار للزبائن.",
                  "Aucun choix — ce groupe n'est pas visible par les clients."
                )}
              </p>
            )}
          </div>

          <form
            action={createOption}
            className="mt-2 flex flex-wrap items-center gap-2 pl-3"
          >
            <input type="hidden" name="groupId" value={group.id} />
            <input
              name="nameFr"
              placeholder="Choix, ex. Harissa"
              required
              className={`${smallInputClass} w-32`}
            />
            <input
              name="nameAr"
              placeholder="الاختيار"
              required
              dir="rtl"
              className={`${smallInputClass} w-32`}
            />
            <input
              name="priceDelta"
              type="number"
              step="0.01"
              placeholder={pick(lang, "+ درهم", "+ DH")}
              className={`${smallInputClass} w-20`}
            />
            <button type="submit" className={linkButtonClass}>
              + {pick(lang, "إضافة", "Ajouter")}
            </button>
          </form>
        </div>
      ))}

      <details className="rounded-md border border-dashed border-neutral-300 p-3">
        <summary className="cursor-pointer text-sm text-neutral-700">
          + {pick(lang, "إضافة مجموعة اختيارات", "Ajouter un groupe d'options")}
        </summary>
        <form
          action={createOptionGroup}
          className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2"
        >
          <input type="hidden" name="menuItemId" value={menuItemId} />
          <GroupFields />
          <button type="submit" className={`${primaryButtonClass} sm:col-span-2`}>
            {pick(lang, "إضافة", "Ajouter")}
          </button>
        </form>
      </details>
    </div>
  );
}
