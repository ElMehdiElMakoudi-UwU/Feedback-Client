"use client";

import { useState } from "react";
import { useLanguage, pick, type Lang } from "@/lib/language-context";
import { correctShift } from "@/app/actions/attendance";
import { KpiCard } from "@/app/admin/kpi-card";
import { IconUsers, IconClipboard, IconAlertTriangle, IconCamera } from "@/app/admin/stock/icons";

export type LogShift = {
  id: string;
  employeeId: string;
  employeeName: string;
  clockInAt: string;
  clockOutAt: string | null;
  clockInPhoto: string;
  clockOutPhoto: string | null;
  deviceName: string | null;
  missingClockOut: boolean;
  editNote: string | null;
  editedBy: string | null;
  editedAt: string | null;
};

function locale(lang: Lang) {
  return lang === "ar" ? "ar-MA" : "fr-MA";
}

function fmtTime(iso: string, lang: Lang) {
  return new Date(iso).toLocaleTimeString(locale(lang), { hour: "2-digit", minute: "2-digit" });
}

function fmtDay(iso: string, lang: Lang) {
  return new Date(iso).toLocaleDateString(locale(lang), { weekday: "short", day: "numeric", month: "short" });
}

function fmtDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h}h${String(m).padStart(2, "0")}`;
}

function shiftMinutes(s: LogShift) {
  if (!s.clockOutAt) return null;
  return (new Date(s.clockOutAt).getTime() - new Date(s.clockInAt).getTime()) / 60000;
}

// "YYYY-MM-DDTHH:mm" in the admin's local time, for datetime-local inputs.
function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function Photo({ url, label }: { url: string; label: string }) {
  return (
    <a href={url} target="_blank" rel="noreferrer" title={label} className="shrink-0">
      {/* eslint-disable-next-line @next/next/no-img-element -- admin-gated API route, not a static asset */}
      <img
        src={url}
        alt={label}
        loading="lazy"
        className="h-14 w-14 rounded-md object-cover ring-1 ring-neutral-200"
      />
    </a>
  );
}

function CorrectionForm({ shift, onDone }: { shift: LogShift; onDone: () => void }) {
  const { lang } = useLanguage();
  return (
    <form
      action={async (fd) => {
        await correctShift(fd);
        onDone();
      }}
      className="mt-3 grid gap-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3 sm:grid-cols-2"
    >
      <input type="hidden" name="id" value={shift.id} />
      <input type="hidden" name="tzOffset" value={new Date().getTimezoneOffset()} />
      <label className="text-xs text-neutral-600">
        {pick(lang, "الدخول", "Arrivée")}
        <input
          type="datetime-local"
          name="clockInAt"
          required
          defaultValue={toLocalInput(shift.clockInAt)}
          className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
      </label>
      <label className="text-xs text-neutral-600">
        {pick(lang, "الخروج", "Départ")}
        <input
          type="datetime-local"
          name="clockOutAt"
          defaultValue={toLocalInput(shift.clockOutAt)}
          className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
      </label>
      <label className="text-xs text-neutral-600 sm:col-span-2">
        {pick(lang, "سبب التعديل (إلزامي)", "Motif de la correction (obligatoire)")}
        <input
          type="text"
          name="note"
          required
          maxLength={200}
          className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
      </label>
      <div className="flex gap-2 sm:col-span-2">
        <button
          type="submit"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
        >
          {pick(lang, "حفظ", "Enregistrer")}
        </button>
        <button type="button" onClick={onDone} className="px-3 py-2 text-sm text-neutral-500">
          {pick(lang, "إلغاء", "Annuler")}
        </button>
      </div>
    </form>
  );
}

export function AttendanceLogView({
  shifts,
  from,
  to,
}: {
  shifts: LogShift[];
  from: string;
  to: string;
}) {
  const { lang } = useLanguage();
  const [editing, setEditing] = useState<string | null>(null);

  const onShiftNow = shifts.filter((s) => !s.clockOutAt && !s.missingClockOut).length;
  const missing = shifts.filter((s) => s.missingClockOut).length;
  const edited = shifts.filter((s) => s.editedAt).length;

  const totals = new Map<string, { name: string; minutes: number; count: number }>();
  for (const s of shifts) {
    const minutes = shiftMinutes(s);
    if (minutes === null) continue;
    const t = totals.get(s.employeeId) ?? { name: s.employeeName, minutes: 0, count: 0 };
    t.minutes += minutes;
    t.count += 1;
    totals.set(s.employeeId, t);
  }
  const totalMinutes = [...totals.values()].reduce((sum, t) => sum + t.minutes, 0);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          {pick(lang, "سجل الحضور", "Journal de pointage")}
        </h1>
        <form className="flex flex-wrap items-end gap-2">
          <label className="text-xs text-neutral-500">
            {pick(lang, "من", "Du")}
            <input
              type="date"
              name="from"
              defaultValue={from}
              className="mt-1 block rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
            />
          </label>
          <label className="text-xs text-neutral-500">
            {pick(lang, "إلى", "Au")}
            <input
              type="date"
              name="to"
              defaultValue={to}
              className="mt-1 block rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
            />
          </label>
          <button
            type="submit"
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
          >
            {pick(lang, "عرض", "Afficher")}
          </button>
        </form>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard icon={IconUsers} label={pick(lang, "في العمل الآن", "En service")} value={onShiftNow} accent />
        <KpiCard icon={IconClipboard} label={pick(lang, "مجموع الساعات", "Heures totales")} value={fmtDuration(totalMinutes)} />
        <KpiCard
          icon={IconAlertTriangle}
          label={pick(lang, "خروج غير مسجل", "Départs manquants")}
          value={missing}
          tone={missing > 0 ? "bad" : "neutral"}
        />
        <KpiCard
          icon={IconCamera}
          label={pick(lang, "تعديلات يدوية", "Corrections manuelles")}
          value={edited}
          tone={edited > 0 ? "warn" : "neutral"}
        />
      </div>

      {totals.size > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
            {pick(lang, "الساعات حسب الموظف", "Heures par employé")}
          </h2>
          <div className="divide-y divide-neutral-100 rounded-lg border border-neutral-200">
            {[...totals.values()]
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((t) => (
                <div key={t.name} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <span className="font-medium">{t.name}</span>
                  <span className="tabular-nums text-neutral-600">
                    {fmtDuration(t.minutes)}{" "}
                    <span className="text-neutral-400">
                      · {t.count} {pick(lang, "نوبة", t.count > 1 ? "services" : "service")}
                    </span>
                  </span>
                </div>
              ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
          {pick(lang, "النوبات", "Services")}
        </h2>
        <div className="flex flex-col divide-y divide-neutral-100">
          {shifts.map((s) => {
            const minutes = shiftMinutes(s);
            return (
              <div key={s.id} className="py-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="min-w-[140px] flex-1">
                    <p className="font-medium">{s.employeeName}</p>
                    <p className="text-xs text-neutral-500">
                      {fmtDay(s.clockInAt, lang)}
                      {s.deviceName && ` · ${s.deviceName}`}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Photo url={s.clockInPhoto} label={pick(lang, "صورة الدخول", "Photo d'arrivée")} />
                    <div className="text-sm">
                      <p className="text-xs text-neutral-400">{pick(lang, "دخول", "Arrivée")}</p>
                      <p className="tabular-nums">{fmtTime(s.clockInAt, lang)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {s.clockOutPhoto && (
                      <Photo url={s.clockOutPhoto} label={pick(lang, "صورة الخروج", "Photo de départ")} />
                    )}
                    <div className="text-sm">
                      <p className="text-xs text-neutral-400">{pick(lang, "خروج", "Départ")}</p>
                      <p className="tabular-nums">
                        {s.clockOutAt ? (
                          fmtTime(s.clockOutAt, lang)
                        ) : s.missingClockOut ? (
                          <span className="font-medium text-red-600">{pick(lang, "غير مسجل", "Manquant")}</span>
                        ) : (
                          <span className="font-medium text-green-700">{pick(lang, "في العمل", "En service")}</span>
                        )}
                      </p>
                    </div>
                  </div>

                  <p className="w-16 text-end text-sm font-semibold tabular-nums">
                    {minutes !== null ? fmtDuration(minutes) : "—"}
                  </p>

                  <button
                    type="button"
                    onClick={() => setEditing(editing === s.id ? null : s.id)}
                    className="text-xs text-neutral-500 hover:text-neutral-900 hover:underline"
                  >
                    {pick(lang, "تصحيح", "Corriger")}
                  </button>
                </div>

                {s.editedAt && (
                  <p className="mt-2 text-xs text-amber-700">
                    {pick(lang, "عُدّل يدويًا", "Corrigé à la main")}
                    {s.editedBy && ` (${s.editedBy})`} · {fmtDay(s.editedAt, lang)} — {s.editNote}
                  </p>
                )}

                {editing === s.id && <CorrectionForm shift={s} onDone={() => setEditing(null)} />}
              </div>
            );
          })}
          {shifts.length === 0 && (
            <p className="py-6 text-sm text-neutral-400">
              {pick(lang, "لا توجد نوبات في هذه الفترة", "Aucun service sur cette période")}
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
