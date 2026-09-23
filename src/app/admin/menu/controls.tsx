"use client";

import { useLanguage, pick } from "@/lib/language-context";

export const inputClass =
  "rounded-md border border-neutral-300 px-3 py-2 text-sm";
export const smallInputClass =
  "rounded-md border border-neutral-300 px-2 py-1 text-xs";
export const linkButtonClass = "text-xs text-neutral-600 hover:underline";
export const dangerButtonClass = "text-xs text-red-600 hover:underline";
export const primaryButtonClass =
  "rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-700";

type FormAction = (formData: FormData) => void | Promise<void>;

export function MoveButtons({
  action,
  id,
  isFirst,
  isLast,
}: {
  action: FormAction;
  id: string;
  isFirst: boolean;
  isLast: boolean;
}) {
  const { lang } = useLanguage();
  return (
    <form action={action} className="flex items-center">
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        name="direction"
        value="up"
        disabled={isFirst}
        aria-label={pick(lang, "تحريك للأعلى", "Monter")}
        className="rounded px-1.5 text-sm text-neutral-500 hover:bg-neutral-100 disabled:opacity-25 disabled:hover:bg-transparent"
      >
        ↑
      </button>
      <button
        type="submit"
        name="direction"
        value="down"
        disabled={isLast}
        aria-label={pick(lang, "تحريك للأسفل", "Descendre")}
        className="rounded px-1.5 text-sm text-neutral-500 hover:bg-neutral-100 disabled:opacity-25 disabled:hover:bg-transparent"
      >
        ↓
      </button>
    </form>
  );
}

// Deletes cascade (a section takes its categories, items and options with it),
// so always ask first.
export function DeleteButton({
  action,
  id,
  label,
  confirmMessage,
}: {
  action: FormAction;
  id: string;
  label: string;
  confirmMessage: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(confirmMessage)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className={dangerButtonClass}>
        {label}
      </button>
    </form>
  );
}
