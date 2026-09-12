"use client";

import { useActionState } from "react";
import { useLanguage, pick } from "@/lib/language-context";
import { createCashier, deleteStaff } from "@/app/actions/staff";

type Cashier = {
  id: string;
  email: string;
  createdAt: Date;
};

type FormState = { status: "idle" | "error"; message?: string };
const initialState: FormState = { status: "idle" };

export function StaffView({ cashiers }: { cashiers: Cashier[] }) {
  const { lang } = useLanguage();
  const [state, formAction, pending] = useActionState(
    createCashier,
    initialState
  );

  const errorMessage =
    state.status === "error"
      ? state.message === "exists"
        ? pick(lang, "البريد الإلكتروني مستخدم بالفعل", "Cet email est déjà utilisé")
        : pick(lang, "المعطيات غير صحيحة", "Données invalides")
      : null;

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="mb-8 text-2xl font-semibold tracking-tight">
        {pick(lang, "الموظفون (الصندوق)", "Personnel (caisse)")}
      </h1>

      <form
        action={formAction}
        className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-6 sm:flex-row sm:items-end"
      >
        <div className="flex-1">
          <label className="mb-2 block text-sm font-medium text-neutral-700">
            {pick(lang, "البريد الإلكتروني", "Email")}
          </label>
          <input
            type="email"
            name="email"
            required
            autoComplete="off"
            className="w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-sm focus:border-neutral-900 focus:outline-none"
          />
        </div>
        <div className="flex-1">
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
        <button
          type="submit"
          disabled={pending}
          className="shrink-0 rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-40"
        >
          {pick(lang, "إضافة كاشير", "Ajouter un caissier")}
        </button>
      </form>

      {errorMessage && (
        <p className="mt-3 text-sm text-red-600">{errorMessage}</p>
      )}

      <div className="mt-8 flex flex-col divide-y divide-neutral-100">
        {cashiers.map((c) => (
          <div key={c.id} className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium">{c.email}</p>
              <p className="text-xs text-neutral-400">
                {new Date(c.createdAt).toLocaleDateString(
                  lang === "ar" ? "ar-MA" : "fr-MA"
                )}
              </p>
            </div>
            <form action={deleteStaff}>
              <input type="hidden" name="id" value={c.id} />
              <button
                type="submit"
                className="text-xs text-red-600 hover:underline"
              >
                {pick(lang, "حذف", "Supprimer")}
              </button>
            </form>
          </div>
        ))}
        {cashiers.length === 0 && (
          <p className="py-3 text-sm text-neutral-400">
            {pick(lang, "لا يوجد كاشير بعد", "Aucun caissier pour le moment")}
          </p>
        )}
      </div>
    </main>
  );
}
