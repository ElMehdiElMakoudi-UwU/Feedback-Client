"use client";

import { useActionState } from "react";
import { loginAdmin, type LoginFormState } from "@/app/actions/admin-auth";
import { useLanguage, pick } from "@/lib/language-context";

const initialState: LoginFormState = { status: "idle" };

export function LoginForm() {
  const { lang } = useLanguage();
  const [state, formAction, pending] = useActionState(
    loginAdmin,
    initialState
  );

  const errorMessage =
    state.status === "error"
      ? state.code === "missing_fields"
        ? pick(lang, "اسم المستخدم وكلمة المرور مطلوبان", "Identifiant et mot de passe requis")
        : pick(lang, "اسم المستخدم أو كلمة المرور غير صحيحة", "Identifiant ou mot de passe incorrect")
      : null;

  return (
    <>
      <h1 className="mb-8 text-2xl font-semibold tracking-tight">
        {pick(lang, "تسجيل دخول المشرف", "Connexion admin")}
      </h1>
      <form action={formAction} className="flex flex-col gap-5">
        <div>
          <label
            htmlFor="email"
            className="mb-2 block text-sm font-medium text-neutral-700"
          >
            {pick(lang, "البريد الإلكتروني أو اسم المستخدم", "Email ou nom d'utilisateur")}
          </label>
          <input
            id="email"
            name="email"
            type="text"
            required
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            autoComplete="username"
            className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-neutral-900 focus:outline-none"
          />
        </div>
        <div>
          <label
            htmlFor="password"
            className="mb-2 block text-sm font-medium text-neutral-700"
          >
            {pick(lang, "كلمة المرور", "Mot de passe")}
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-neutral-900 focus:outline-none"
          />
        </div>

        {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}

        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-neutral-900 px-6 py-3 text-base font-medium text-white transition hover:bg-neutral-700 disabled:opacity-40"
        >
          {pending
            ? pick(lang, "جارٍ تسجيل الدخول...", "Connexion en cours...")
            : pick(lang, "تسجيل الدخول", "Se connecter")}
        </button>
      </form>
    </>
  );
}
