"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useLanguage, pick } from "@/lib/language-context";
import {
  createEmployee,
  resetEmployeePin,
  setEmployeeActive,
  enrollThisDevice,
  revokeDevice,
  type EmployeeFormState,
} from "@/app/actions/attendance";

type Employee = { id: string; name: string; active: boolean; locked: boolean };
type Device = { id: string; name: string; lastSeenAt: string | null; createdAt: string };

const initialState: EmployeeFormState = { status: "idle" };

const inputClass =
  "w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-sm focus:border-neutral-900 focus:outline-none";

function PinResetForm({ id, onDone }: { id: string; onDone: () => void }) {
  const { lang } = useLanguage();
  return (
    <form
      action={async (fd) => {
        await resetEmployeePin(fd);
        onDone();
      }}
      className="flex items-center gap-2"
    >
      <input type="hidden" name="id" value={id} />
      <input
        type="password"
        name="pin"
        inputMode="numeric"
        pattern="\d{4,6}"
        required
        autoComplete="off"
        placeholder={pick(lang, "رمز جديد", "Nouveau code")}
        className="w-28 rounded-md border border-neutral-300 px-2 py-1 text-sm"
      />
      <button type="submit" className="text-xs font-medium text-neutral-900 hover:underline">
        {pick(lang, "حفظ", "OK")}
      </button>
    </form>
  );
}

export function AttendanceSetupView({
  employees,
  devices,
  currentDeviceId,
}: {
  employees: Employee[];
  devices: Device[];
  currentDeviceId: string | null;
}) {
  const { lang } = useLanguage();
  const [state, formAction, pending] = useActionState(createEmployee, initialState);
  const [resetting, setResetting] = useState<string | null>(null);
  const dateLocale = lang === "ar" ? "ar-MA" : "fr-MA";

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">
        {pick(lang, "الموظفون", "Employés")}
      </h1>

      <form
        action={formAction}
        className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-6 sm:flex-row sm:items-end"
      >
        <div className="flex-1">
          <label className="mb-2 block text-sm font-medium text-neutral-700">
            {pick(lang, "الاسم", "Nom")}
          </label>
          <input type="text" name="name" required minLength={2} maxLength={60} className={inputClass} />
        </div>
        <div className="sm:w-36">
          <label className="mb-2 block text-sm font-medium text-neutral-700">
            {pick(lang, "الرمز (4-6 أرقام)", "Code (4-6 chiffres)")}
          </label>
          <input
            type="password"
            name="pin"
            inputMode="numeric"
            pattern="\d{4,6}"
            required
            autoComplete="off"
            className={inputClass}
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="shrink-0 rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-40"
        >
          {pick(lang, "إضافة", "Ajouter")}
        </button>
      </form>
      {state.status === "error" && (
        <p className="mt-3 text-sm text-red-600">
          {pick(
            lang,
            "معطيات غير صحيحة: اسم من حرفين على الأقل ورمز من 4 إلى 6 أرقام",
            "Données invalides : nom d'au moins 2 caractères et code de 4 à 6 chiffres"
          )}
        </p>
      )}
      <p className="mt-3 text-xs text-neutral-500">
        {pick(
          lang,
          "أعطِ كل موظف رمزه شخصيًا. إذا نسيه، ضع له رمزًا جديدًا هنا.",
          "Communiquez le code à chaque employé en personne. En cas d'oubli, définissez-en un nouveau ici."
        )}
      </p>

      <div className="mt-6 flex flex-col divide-y divide-neutral-100">
        {employees.map((e) => (
          <div key={e.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div>
              <p className={`text-sm font-medium ${e.active ? "" : "text-neutral-400 line-through"}`}>
                {e.name}
              </p>
              {e.locked && (
                <p className="text-xs text-red-600">
                  {pick(lang, "مقفل مؤقتًا (رموز خاطئة)", "Bloqué temporairement (codes erronés)")}
                </p>
              )}
            </div>
            <div className="flex items-center gap-4">
              {resetting === e.id ? (
                <PinResetForm id={e.id} onDone={() => setResetting(null)} />
              ) : (
                <button
                  type="button"
                  onClick={() => setResetting(e.id)}
                  className="text-xs text-neutral-600 hover:underline"
                >
                  {pick(lang, "تغيير الرمز", "Changer le code")}
                </button>
              )}
              <form action={setEmployeeActive}>
                <input type="hidden" name="id" value={e.id} />
                <input type="hidden" name="active" value={String(!e.active)} />
                <button
                  type="submit"
                  className={`text-xs hover:underline ${e.active ? "text-red-600" : "text-green-700"}`}
                >
                  {e.active ? pick(lang, "تعطيل", "Désactiver") : pick(lang, "تفعيل", "Réactiver")}
                </button>
              </form>
            </div>
          </div>
        ))}
        {employees.length === 0 && (
          <p className="py-3 text-sm text-neutral-400">
            {pick(lang, "لا يوجد موظفون بعد", "Aucun employé pour le moment")}
          </p>
        )}
      </div>

      <h2 className="mb-2 mt-12 text-xl font-semibold tracking-tight">
        {pick(lang, "أجهزة التسجيل", "Bornes de pointage")}
      </h2>
      <p className="mb-4 text-sm text-neutral-500">
        {pick(
          lang,
          "لا يمكن تسجيل الحضور إلا من جهاز مسجل. افتح هذه الصفحة على جهاز المطعم وسجّله، ثم افتح صفحة التسجيل عليه.",
          "Le pointage ne fonctionne que sur un appareil enregistré. Ouvrez cette page sur la tablette du restaurant, enregistrez-la, puis ouvrez la page de pointage dessus."
        )}
      </p>

      {currentDeviceId ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-sm">
          <span className="text-green-800">
            {pick(lang, "هذا الجهاز مسجل كجهاز تسجيل.", "Cet appareil est une borne de pointage.")}
          </span>
          <Link href="/pointage" className="font-medium text-green-900 underline">
            {pick(lang, "فتح صفحة التسجيل", "Ouvrir le pointage")}
          </Link>
        </div>
      ) : (
        <form
          action={enrollThisDevice}
          className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-6 sm:flex-row sm:items-end"
        >
          <div className="flex-1">
            <label className="mb-2 block text-sm font-medium text-neutral-700">
              {pick(lang, "اسم الجهاز", "Nom de l'appareil")}
            </label>
            <input
              type="text"
              name="name"
              maxLength={60}
              placeholder={pick(lang, "مثال: لوحة المدخل", "ex : Tablette entrée")}
              className={inputClass}
            />
          </div>
          <button
            type="submit"
            className="shrink-0 rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-700"
          >
            {pick(lang, "تسجيل هذا الجهاز", "Enregistrer cet appareil")}
          </button>
        </form>
      )}

      <div className="mt-4 flex flex-col divide-y divide-neutral-100">
        {devices.map((d) => (
          <div key={d.id} className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium">
                {d.name}
                {d.id === currentDeviceId && (
                  <span className="ms-2 text-xs text-green-700">{pick(lang, "(هذا الجهاز)", "(cet appareil)")}</span>
                )}
              </p>
              <p className="text-xs text-neutral-400">
                {d.lastSeenAt
                  ? `${pick(lang, "آخر تسجيل", "Dernier pointage")} : ${new Date(d.lastSeenAt).toLocaleString(dateLocale)}`
                  : `${pick(lang, "أضيف في", "Ajouté le")} ${new Date(d.createdAt).toLocaleDateString(dateLocale)}`}
              </p>
            </div>
            <form action={revokeDevice}>
              <input type="hidden" name="id" value={d.id} />
              <button type="submit" className="text-xs text-red-600 hover:underline">
                {pick(lang, "إلغاء التسجيل", "Révoquer")}
              </button>
            </form>
          </div>
        ))}
      </div>
    </main>
  );
}
