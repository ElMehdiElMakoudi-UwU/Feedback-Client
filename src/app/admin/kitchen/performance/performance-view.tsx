"use client";

import Link from "next/link";
import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLanguage, pick } from "@/lib/language-context";
import { KpiCard } from "@/app/admin/kpi-card";
import { updateWorkstationKitchenSettings } from "@/app/actions/kitchen";
import type { Advice, StationStats } from "@/lib/kitchen-advice";
import { useKitchenStream } from "../kds-shared";
import type { PerformanceData } from "./compute-stats";

const RANGES = [
  { key: "today", ar: "اليوم", fr: "Aujourd'hui" },
  { key: "7d", ar: "7 أيام", fr: "7 jours" },
  { key: "30d", ar: "30 يوماً", fr: "30 jours" },
] as const;

const SEVERITY_STYLE: Record<Advice["severity"], { box: string; dot: string; ar: string; fr: string }> = {
  critical: { box: "border-red-200 bg-red-50", dot: "bg-red-500", ar: "عاجل", fr: "Urgent" },
  warning: { box: "border-amber-200 bg-amber-50", dot: "bg-amber-500", ar: "تنبيه", fr: "À corriger" },
  info: { box: "border-sky-200 bg-sky-50", dot: "bg-sky-500", ar: "معلومة", fr: "Info" },
  good: { box: "border-emerald-200 bg-emerald-50", dot: "bg-emerald-500", ar: "جيد", fr: "OK" },
};

function fmtMin(value: number | null) {
  return value === null ? "—" : `${Math.round(value * 10) / 10} min`;
}

function fmtPct(value: number | null) {
  return value === null ? "—" : `${Math.round(value * 100)}%`;
}

function AdviceCard({ advice, lang }: { advice: Advice; lang: "ar" | "fr" }) {
  const style = SEVERITY_STYLE[advice.severity];
  const text = advice[lang];
  return (
    <div className={`rounded-lg border p-4 ${style.box}`}>
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-neutral-600">
        <span className={`h-2 w-2 rounded-full ${style.dot}`} />
        {pick(lang, style.ar, style.fr)}
        <span className="text-neutral-400">·</span>
        <span className="text-neutral-500">
          {advice.scope === "live" ? pick(lang, "الآن", "Maintenant") : pick(lang, "على الفترة", "Sur la période")}
        </span>
      </div>
      <p className="mt-1.5 font-semibold text-neutral-900">{text.title}</p>
      <p className="mt-1 text-sm leading-relaxed text-neutral-700">{text.detail}</p>
    </div>
  );
}

function Stepper({
  value,
  onChange,
  min,
  suffix,
  label,
  disabled,
}: {
  value: number;
  onChange: (next: number) => void;
  min: number;
  suffix?: string;
  label: string;
  disabled: boolean;
}) {
  return (
    <div className="inline-flex items-center rounded-md border border-neutral-300" aria-label={label}>
      <button
        type="button"
        disabled={disabled || value <= min}
        onClick={() => onChange(value - 1)}
        className="h-9 w-9 text-lg text-neutral-600 hover:bg-neutral-50 disabled:opacity-30"
        aria-label={`${label} −`}
      >
        −
      </button>
      <span className="min-w-[3.5rem] text-center text-sm font-semibold tabular-nums">
        {value}
        {suffix}
      </span>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(value + 1)}
        className="h-9 w-9 text-lg text-neutral-600 hover:bg-neutral-50 disabled:opacity-30"
        aria-label={`${label} +`}
      >
        +
      </button>
    </div>
  );
}

function LiveRow({ station, lang }: { station: StationStats; lang: "ar" | "fr" }) {
  const [pending, startTransition] = useTransition();
  const { live } = station;
  const perCook = live.openTickets / Math.max(1, station.staffCount);
  const late = live.lateTickets > 0;
  const tone = late ? "text-red-600" : live.oldestMinutes >= station.targetMinutes * 0.75 ? "text-amber-700" : "text-neutral-900";

  return (
    <tr className="border-t border-neutral-100">
      <td className="py-3 pe-3">
        <Link href={`/admin/kitchen/poste/${station.id}`} className="font-medium hover:underline">
          {station.name}
        </Link>
      </td>
      <td className="py-3 pe-3 tabular-nums">
        {live.openTickets} <span className="text-neutral-400">/ {live.openItems} {pick(lang, "أطباق", "plats")}</span>
      </td>
      <td className={`py-3 pe-3 font-semibold tabular-nums ${tone}`}>
        {live.openTickets ? `${Math.round(live.oldestMinutes)} min` : "—"}
      </td>
      <td className={`py-3 pe-3 tabular-nums ${late ? "font-semibold text-red-600" : "text-neutral-500"}`}>
        {live.lateTickets}
      </td>
      <td className="py-3 pe-3 tabular-nums text-neutral-600">{perCook.toFixed(1)}</td>
      <td className="py-3 pe-3">
        <Stepper
          value={station.staffCount}
          min={0}
          label={pick(lang, "الموظفون", "Personnel")}
          disabled={pending}
          onChange={(staffCount) =>
            startTransition(() => updateWorkstationKitchenSettings({ workstationId: station.id, staffCount }))
          }
        />
      </td>
      <td className="py-3">
        <Stepper
          value={station.targetMinutes}
          min={1}
          suffix="′"
          label={pick(lang, "الهدف", "Objectif")}
          disabled={pending}
          onChange={(targetMinutes) =>
            startTransition(() => updateWorkstationKitchenSettings({ workstationId: station.id, targetMinutes }))
          }
        />
      </td>
      <td className="py-3 pe-4">
        <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-neutral-600">
          <input
            type="checkbox"
            checked={station.syncWithOrder}
            disabled={pending}
            onChange={(event) =>
              startTransition(() =>
                updateWorkstationKitchenSettings({
                  workstationId: station.id,
                  syncWithOrder: event.target.checked,
                })
              )
            }
            className="h-4 w-4"
          />
          {station.syncWithOrder ? pick(lang, "مع الطلب", "Avec la commande") : pick(lang, "فوراً", "Tout de suite")}
        </label>
      </td>
    </tr>
  );
}

function OnTimeBar({ rate }: { rate: number | null }) {
  if (rate === null) return <span className="text-neutral-400">—</span>;
  const color = rate >= 0.85 ? "bg-emerald-500" : rate >= 0.7 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-20 overflow-hidden rounded-full bg-neutral-200">
        <div className={`h-full ${color}`} style={{ width: `${Math.round(rate * 100)}%` }} />
      </div>
      <span className="tabular-nums">{fmtPct(rate)}</span>
    </div>
  );
}

function heatColor(avg: number, target: number) {
  const ratio = avg / target;
  if (ratio <= 0.6) return "bg-emerald-100 text-emerald-900";
  if (ratio <= 0.9) return "bg-emerald-200 text-emerald-900";
  if (ratio <= 1) return "bg-amber-100 text-amber-900";
  if (ratio <= 1.3) return "bg-orange-200 text-orange-900";
  return "bg-red-300 text-red-950";
}

export function PerformanceView({
  range,
  data,
  advice,
}: {
  range: string;
  data: PerformanceData;
  advice: Advice[];
}) {
  const { lang } = useLanguage();
  const router = useRouter();
  useKitchenStream();
  // Live ages keep growing between events.
  useEffect(() => {
    const interval = setInterval(() => router.refresh(), 30000);
    return () => clearInterval(interval);
  }, [router]);

  const { stats } = data;
  const totalStaff = stats.stations.reduce((sum, s) => sum + s.staffCount, 0);
  const allMinutes = stats.stations.filter((s) => s.period.onTimeRate !== null);
  const overallOnTime = allMinutes.length
    ? allMinutes.reduce((sum, s) => sum + (s.period.onTimeRate ?? 0) * s.period.tickets, 0) /
      Math.max(1, allMinutes.reduce((sum, s) => sum + s.period.tickets, 0))
    : null;
  const liveLate = stats.stations.reduce((sum, s) => sum + s.live.lateTickets, 0);

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {pick(lang, "أداء المطبخ", "Performance cuisine")}
          </h1>
          <p className="mt-0.5 text-sm text-neutral-500">
            {pick(lang, "التأخيرات، الاختناقات وتوزيع الموظفين حسب المحطة", "Retards, goulots d'étranglement et répartition du personnel par poste")}
          </p>
        </div>
        <div className="flex rounded-md border border-neutral-200 p-0.5">
          {RANGES.map((r) => (
            <Link
              key={r.key}
              href={`/admin/kitchen/performance?range=${r.key}`}
              className={`rounded px-3 py-1.5 text-sm ${
                range === r.key ? "bg-neutral-900 text-white" : "text-neutral-600 hover:text-neutral-900"
              }`}
            >
              {pick(lang, r.ar, r.fr)}
            </Link>
          ))}
        </div>
      </div>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
          {pick(lang, "التوصيات", "Recommandations")}
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
          {advice.map((a, i) => (
            <AdviceCard key={i} advice={a} lang={lang} />
          ))}
        </div>
      </section>

      <section className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <KpiCard label={pick(lang, "تذاكر المحطات", "Tickets postes")} value={data.totalTickets} />
        <KpiCard
          label={pick(lang, "متوسط مدة الطلب (تأكيد ← جاهز)", "Durée moy. commande (confirmée → prête)")}
          value={fmtMin(data.avgOrderMinutes)}
        />
        <KpiCard
          label={pick(lang, "في الوقت المحدد", "Dans les temps")}
          value={fmtPct(overallOnTime)}
          tone={overallOnTime === null ? "neutral" : overallOnTime >= 0.85 ? "good" : overallOnTime >= 0.7 ? "warn" : "bad"}
        />
        <KpiCard
          label={pick(lang, "انتظار في الباس (جاهز ← مُسلّم)", "Attente à la passe (prête → remise)")}
          value={fmtMin(stats.avgHandoverMinutes)}
          tone={stats.avgHandoverMinutes !== null && stats.avgHandoverMinutes >= 4 ? "warn" : "neutral"}
        />
        <KpiCard
          label={pick(lang, "انتظار الأطباق المبكرة (أول طبق ← آخر طبق)", "Plats qui attendent (1er poste prêt → dernier)")}
          value={fmtMin(data.avgPlateWaitMinutes)}
          tone={
            data.avgPlateWaitMinutes === null ? "neutral" : data.avgPlateWaitMinutes >= 5 ? "bad" : data.avgPlateWaitMinutes >= 3 ? "warn" : "good"
          }
        />
      </section>

      <section className="mb-8">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
            {pick(lang, "الآن", "En direct")}
          </h2>
          <span className={`text-sm ${liveLate ? "font-semibold text-red-600" : "text-neutral-500"}`}>
            {liveLate} {pick(lang, "تذاكر متأخرة", "ticket(s) en retard")} · {totalStaff} {pick(lang, "في المطبخ", "en cuisine")}
          </span>
        </div>
        <div className="overflow-x-auto rounded-lg border border-neutral-200">
          <table className="w-full min-w-[860px] text-start text-sm">
            <thead className="bg-neutral-50 text-xs text-neutral-500">
              <tr>
                <th className="px-0 py-2 ps-4 text-start font-medium">{pick(lang, "المحطة", "Poste")}</th>
                <th className="py-2 pe-3 text-start font-medium">{pick(lang, "قيد الانتظار", "En file")}</th>
                <th className="py-2 pe-3 text-start font-medium">{pick(lang, "الأقدم", "Plus ancien")}</th>
                <th className="py-2 pe-3 text-start font-medium">{pick(lang, "متأخرة", "En retard")}</th>
                <th className="py-2 pe-3 text-start font-medium">{pick(lang, "تذاكر/طباخ", "Tickets/cuisinier")}</th>
                <th className="py-2 pe-3 text-start font-medium">{pick(lang, "الموظفون", "Personnel")}</th>
                <th className="py-2 pe-3 text-start font-medium">{pick(lang, "الهدف", "Objectif")}</th>
                <th
                  className="py-2 pe-4 text-start font-medium"
                  title={pick(
                    lang,
                    "مع الطلب: تنتظر المحطة لتنتهي مع باقي المحطات. فوراً: تبدأ مباشرة (مثل المشروبات).",
                    "Avec la commande : le poste attend pour finir en même temps que les autres. Tout de suite : il démarre immédiatement (ex. boissons)."
                  )}
                >
                  {pick(lang, "التوقيت", "Synchro")} ⓘ
                </th>
              </tr>
            </thead>
            <tbody className="[&_td:first-child]:ps-4">
              {stats.stations.map((station) => (
                <LiveRow key={station.id} station={station} lang={lang} />
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
          {pick(lang, "على الفترة", "Sur la période")}
        </h2>
        <div className="overflow-x-auto rounded-lg border border-neutral-200">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-neutral-50 text-xs text-neutral-500">
              <tr>
                <th className="py-2 ps-4 text-start font-medium">{pick(lang, "المحطة", "Poste")}</th>
                <th className="py-2 pe-3 text-start font-medium">{pick(lang, "تذاكر", "Tickets")}</th>
                <th className="py-2 pe-3 text-start font-medium">{pick(lang, "المعدل", "Moyenne")}</th>
                <th className="py-2 pe-3 text-start font-medium">P90</th>
                <th className="py-2 pe-3 text-start font-medium">{pick(lang, "في الوقت", "Dans les temps")}</th>
                <th className="py-2 pe-3 text-start font-medium">{pick(lang, "الحجم / الفريق", "Volume / équipe")}</th>
                <th className="py-2 pe-4 text-start font-medium">{pick(lang, "ينهي أخيراً", "Finit en dernier")}</th>
              </tr>
            </thead>
            <tbody>
              {stats.stations.map((s) => {
                const staffShare = totalStaff ? s.staffCount / totalStaff : 0;
                const imbalance = staffShare ? s.period.volumeShare / staffShare : null;
                const lastShare = stats.multiStationOrders
                  ? s.period.lastFinisherCount / stats.multiStationOrders
                  : null;
                return (
                  <tr key={s.id} className="border-t border-neutral-100">
                    <td className="py-3 ps-4 pe-3 font-medium">{s.name}</td>
                    <td className="py-3 pe-3 tabular-nums">{s.period.tickets}</td>
                    <td className={`py-3 pe-3 tabular-nums ${(s.period.avgMinutes ?? 0) > s.targetMinutes ? "font-semibold text-red-600" : ""}`}>
                      {fmtMin(s.period.avgMinutes)}
                    </td>
                    <td className="py-3 pe-3 tabular-nums text-neutral-600">{fmtMin(s.period.p90Minutes)}</td>
                    <td className="py-3 pe-3"><OnTimeBar rate={s.period.onTimeRate} /></td>
                    <td className="py-3 pe-3 tabular-nums">
                      <span className={imbalance !== null && imbalance >= 1.4 ? "font-semibold text-red-600" : imbalance !== null && imbalance <= 0.5 ? "font-semibold text-sky-700" : ""}>
                        {fmtPct(s.period.volumeShare)}
                      </span>
                      <span className="text-neutral-400"> / {fmtPct(staffShare)}</span>
                    </td>
                    <td className="py-3 pe-4 tabular-nums">
                      {lastShare === null ? "—" : (
                        <span className={lastShare >= 0.45 ? "font-semibold text-red-600" : ""}>
                          {fmtPct(lastShare)}
                          {s.period.avgLeadMinutes !== null && (
                            <span className="font-normal text-neutral-400"> · +{fmtMin(s.period.avgLeadMinutes)}</span>
                          )}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-neutral-500">
          {pick(
            lang,
            "الحجم / الفريق: حصة المحطة من الأطباق مقابل حصتها من الموظفين. ينهي أخيراً: في الطلبات متعددة المحطات، كم مرة كانت هذه المحطة الأخيرة وبكم دقيقة بعد الآخرين.",
            "Volume / équipe : part des plats du poste face à sa part du personnel. Finit en dernier : dans les commandes à plusieurs postes, combien de fois ce poste a fini le dernier, et avec combien de retard sur les autres."
          )}
        </p>
      </section>

      {data.hours.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
            {pick(lang, "متوسط وقت التحضير حسب الساعة", "Temps moyen de préparation par heure")}
          </h2>
          <div className="overflow-x-auto rounded-lg border border-neutral-200 p-3">
            <table className="text-xs">
              <thead>
                <tr>
                  <th />
                  {data.hours.map((h) => (
                    <th key={h} className="px-1 pb-1 font-medium text-neutral-500">{h}h</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stats.stations.map((s) => (
                  <tr key={s.id}>
                    <td className="whitespace-nowrap py-0.5 pe-3 text-sm font-medium">{s.name}</td>
                    {data.hours.map((h) => {
                      const cell = data.hourly[s.id]?.[h];
                      return (
                        <td key={h} className="p-0.5">
                          {cell ? (
                            <div
                              className={`flex h-9 w-12 flex-col items-center justify-center rounded tabular-nums ${heatColor(cell.avgMinutes, s.targetMinutes)}`}
                              title={`${s.name} ${h}h: ${cell.tickets} tickets, ${fmtMin(cell.avgMinutes)}`}
                            >
                              <span className="font-semibold">{Math.round(cell.avgMinutes)}′</span>
                              <span className="text-[10px] opacity-70">{cell.tickets}</span>
                            </div>
                          ) : (
                            <div className="h-9 w-12 rounded bg-neutral-50" />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-neutral-500">
              {pick(lang, "الرقم الكبير: المعدل بالدقائق. الصغير: عدد التذاكر. الأحمر = فوق الهدف.", "Grand chiffre : moyenne en minutes. Petit : nombre de tickets. Rouge = au-dessus de l'objectif du poste.")}
            </p>
          </div>
        </section>
      )}

      {stats.stations.length === 0 && (
        <p className="rounded-lg border border-dashed border-neutral-300 px-4 py-8 text-center text-sm text-neutral-500">
          {pick(lang, "أنشئ المحطات أولاً في المخزون ← الإعداد ← المحطات.", "Créez d'abord les postes dans Stock → Configuration → Postes.")}
        </p>
      )}
    </main>
  );
}
