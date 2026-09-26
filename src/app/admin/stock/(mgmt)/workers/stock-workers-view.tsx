"use client";

import { useActionState, useMemo, useState } from "react";
import { useLanguage, pick } from "@/lib/language-context";
import { createWorker, deleteWorker } from "@/app/actions/stock";
import { IconPlus, IconSearch, IconTrash, IconUsers } from "@/app/admin/stock/icons";

type Workstation = { id: string; name: string; kitchen: { name: string } };

type Worker = {
  id: string;
  email: string;
  createdAt: Date;
  workstation: Workstation | null;
};

type FormState = { status: "idle" | "error"; message?: string };
const initialState: FormState = { status: "idle" };

export function StockWorkersView({
  workers,
  workstations,
}: {
  workers: Worker[];
  workstations: Workstation[];
}) {
  const { lang } = useLanguage();
  const [state, formAction, pending] = useActionState(createWorker, initialState);
  const [query, setQuery] = useState("");
  const [workstationFilter, setWorkstationFilter] = useState("");

  const errorMessage =
    state.status === "error"
      ? state.message === "exists"
        ? pick(lang, "اسم المستخدم مستخدم بالفعل", "Ce nom d'utilisateur est déjà pris")
        : pick(
            lang,
            "معطيات غير صحيحة: اسم المستخدم من 3 إلى 30 حرفًا (أحرف، أرقام، . _ -) وكلمة المرور 6 أحرف على الأقل",
            "Données invalides : nom d'utilisateur de 3 à 30 caractères (lettres, chiffres, . _ -) et mot de passe d'au moins 6 caractères"
          )
      : null;

  const filteredWorkers = useMemo(() => {
    const q = query.trim().toLowerCase();
    return workers.filter((w) => {
      if (workstationFilter && w.workstation?.id !== workstationFilter) return false;
      if (!q) return true;
      return (
        w.email.toLowerCase().includes(q) ||
        w.workstation?.name.toLowerCase().includes(q) ||
        w.workstation?.kitchen.name.toLowerCase().includes(q)
      );
    });
  }, [workers, query, workstationFilter]);

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="mb-8 flex items-center gap-2 text-2xl font-semibold tracking-tight">
        <IconUsers className="h-6 w-6 text-neutral-400" />
        {pick(lang, "عمال المخزون", "Ouvriers du stock")}
      </h1>

      <form
        action={formAction}
        className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-6"
      >
        <div>
          <label className="mb-2 block text-sm font-medium text-neutral-700">
            {pick(lang, "اسم المستخدم", "Nom d'utilisateur")}
          </label>
          <input
            type="text"
            name="username"
            required
            minLength={3}
            maxLength={30}
            pattern="[A-Za-z0-9._\-]{3,30}"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            autoComplete="off"
            placeholder={pick(lang, "مثال: ahmed", "ex : ahmed")}
            className="w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-sm focus:border-neutral-900 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-neutral-700">
            {pick(lang, "كلمة المرور", "Mot de passe")}
          </label>
          <input
            type="password"
            name="password"
            required
            minLength={6}
            autoComplete="new-password"
            className="w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-sm focus:border-neutral-900 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-neutral-700">
            {pick(lang, "المحطة", "Poste")}
          </label>
          <select
            name="workstationId"
            required
            className="w-full cursor-pointer rounded-lg border border-neutral-300 px-4 py-2.5 text-sm focus:border-neutral-900 focus:outline-none"
          >
            <option value="">{pick(lang, "اختر محطة", "Choisir un poste")}</option>
            {workstations.map((ws) => (
              <option key={ws.id} value={ws.id}>
                {ws.kitchen.name} — {ws.name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <IconPlus className="h-4 w-4" />
          {pick(lang, "إضافة عامل", "Ajouter un ouvrier")}
        </button>
      </form>

      {errorMessage && <p className="mt-3 text-sm text-red-600">{errorMessage}</p>}

      {workers.length > 0 && (
        <div className="mt-8 flex flex-wrap gap-2">
          <div className="relative flex-1">
            <IconSearch className="pointer-events-none absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={pick(lang, "بحث عن عامل أو محطة...", "Rechercher un ouvrier ou un poste...")}
              className="w-full rounded-md border border-neutral-300 py-1.5 ps-8 pe-3 text-sm focus:border-neutral-900 focus:outline-none"
            />
          </div>
          <select
            value={workstationFilter}
            onChange={(e) => setWorkstationFilter(e.target.value)}
            className="cursor-pointer rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
          >
            <option value="">{pick(lang, "كل المحطات", "Tous les postes")}</option>
            {workstations.map((ws) => (
              <option key={ws.id} value={ws.id}>
                {ws.kitchen.name} — {ws.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="mt-3 flex flex-col divide-y divide-neutral-100">
        {filteredWorkers.map((w) => (
          <div key={w.id} className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-500">
                <IconUsers className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium">{w.email}</p>
                <p className="text-xs text-neutral-400">
                  {w.workstation
                    ? `${w.workstation.kitchen.name} — ${w.workstation.name}`
                    : pick(lang, "بدون محطة", "Sans poste")}
                </p>
              </div>
            </div>
            <form action={deleteWorker}>
              <input type="hidden" name="id" value={w.id} />
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
        {filteredWorkers.length === 0 && workers.length > 0 && (
          <p className="py-3 text-sm text-neutral-400">
            {pick(lang, "لا توجد نتائج مطابقة.", "Aucun résultat pour cette recherche.")}
          </p>
        )}
        {workers.length === 0 && (
          <p className="py-3 text-sm text-neutral-400">
            {pick(lang, "لا يوجد عمال بعد.", "Aucun ouvrier pour le moment.")}
          </p>
        )}
      </div>
    </main>
  );
}
