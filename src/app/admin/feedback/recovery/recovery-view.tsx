"use client";

import { useEffect, useState, useTransition } from "react";
import { useLanguage, pick, type Lang } from "@/lib/language-context";
import { KpiCard } from "@/app/admin/kpi-card";
import {
  IconAlertTriangle,
  IconCheckCircle,
  IconHeart,
  IconStar,
} from "@/app/admin/stock/icons";
import { updateRecoveryCase } from "@/app/actions/feedback";
import {
  RECOVERY_STATUS_LABEL,
  RECOVERY_STATUSES,
  ROOT_CAUSE_LABEL,
  ROOT_CAUSES,
  type RecoveryStatus,
  type RootCause,
} from "@/lib/recovery";

type RecoveryCase = {
  id: string;
  tableNumber: string;
  foodRating: number;
  serviceRating: number;
  comment: string | null;
  lowItems: { nameAr: string; nameFr: string; rating: number }[];
  phone: string | null;
  managerRequested: boolean;
  status: RecoveryStatus;
  rootCause: RootCause | null;
  note: string | null;
  handledBy: string | null;
  handledAt: string | null;
  createdAt: string;
};

type RecoveryStats = {
  open: number;
  total: number;
  handledRate: number | null;
  medianResponseMinutes: number | null;
  topCauses: { cause: RootCause; count: number }[];
};

// Moroccan local numbers (06…/07…) become 2126…/2127… for wa.me links.
function whatsappNumber(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("00")) return digits.slice(2);
  if (digits.startsWith("0")) return `212${digits.slice(1)}`;
  return digits;
}

function formatAge(iso: string, now: number, lang: Lang) {
  const minutes = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000));
  if (minutes < 60) return pick(lang, `منذ ${minutes} د`, `il y a ${minutes} min`);
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return pick(lang, `منذ ${hours} س`, `il y a ${hours} h`);
  const days = Math.floor(hours / 24);
  return pick(lang, `منذ ${days} ي`, `il y a ${days} j`);
}

function formatDuration(minutes: number | null, lang: Lang) {
  if (minutes === null) return "-";
  if (minutes < 60) return pick(lang, `${minutes} د`, `${minutes} min`);
  const hours = Math.round(minutes / 60);
  return pick(lang, `${hours} س`, `${hours} h`);
}

function CaseCard({
  entry,
  now,
  lang,
}: {
  entry: RecoveryCase;
  now: number;
  lang: Lang;
}) {
  const [status, setStatus] = useState<RecoveryStatus>(entry.status);
  const [rootCause, setRootCause] = useState<RootCause | "">(entry.rootCause ?? "");
  const [note, setNote] = useState(entry.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const dirty =
    status !== entry.status ||
    (rootCause || null) !== entry.rootCause ||
    note.trim() !== (entry.note ?? "");
  const statusLabel = RECOVERY_STATUS_LABEL[entry.status];

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await updateRecoveryCase({
        feedbackId: entry.id,
        status,
        rootCause: rootCause || null,
        note: note.trim() || null,
      });
      if (result.status === "error") {
        setError(result.message);
      } else {
        setSaved(true);
      }
    });
  }

  useEffect(() => {
    if (!saved) return;
    const timeout = setTimeout(() => setSaved(false), 2000);
    return () => clearTimeout(timeout);
  }, [saved]);

  return (
    <div
      className={`rounded-lg border bg-white p-4 ${
        entry.status === "OPEN" ? "border-red-200" : "border-neutral-200"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold">
            {pick(lang, "طاولة", "Table")} {entry.tableNumber}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusLabel.className}`}
          >
            {pick(lang, statusLabel.ar, statusLabel.fr)}
          </span>
          {entry.managerRequested && (
            <span className="rounded-full bg-neutral-900 px-2 py-0.5 text-xs font-medium text-white">
              ⚠️ {pick(lang, "طلب المسؤول", "Responsable demandé")}
            </span>
          )}
        </div>
        <span className="text-xs text-neutral-400">
          {formatAge(entry.createdAt, now, lang)}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-neutral-600">
        <span className={entry.foodRating <= 2 ? "font-semibold text-red-700" : ""}>
          {pick(lang, "الطعام", "Plat")}: {entry.foodRating}★
        </span>
        <span className={entry.serviceRating <= 2 ? "font-semibold text-red-700" : ""}>
          {pick(lang, "الخدمة", "Service")}: {entry.serviceRating}★
        </span>
        {entry.lowItems.map((item) => (
          <span key={item.nameFr} className="font-semibold text-red-700">
            {pick(lang, item.nameAr, item.nameFr)}: {item.rating}★
          </span>
        ))}
      </div>

      {entry.comment && (
        <p className="mt-2 text-sm text-neutral-800">&ldquo;{entry.comment}&rdquo;</p>
      )}

      {entry.phone && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-neutral-500">{entry.phone}</span>
          <a
            href={`tel:${entry.phone.replace(/\s/g, "")}`}
            className="rounded-md border border-neutral-300 px-2 py-1 text-xs text-neutral-700 hover:border-neutral-400"
          >
            📞 {pick(lang, "اتصال", "Appeler")}
          </a>
          <a
            href={`https://wa.me/${whatsappNumber(entry.phone)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-green-300 px-2 py-1 text-xs text-green-700 hover:border-green-400"
          >
            WhatsApp
          </a>
        </div>
      )}

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <label className="text-xs text-neutral-500">
          {pick(lang, "الحالة", "Statut")}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as RecoveryStatus)}
            className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-2 py-2 text-sm text-neutral-900"
          >
            {RECOVERY_STATUSES.map((value) => (
              <option key={value} value={value}>
                {pick(lang, RECOVERY_STATUS_LABEL[value].ar, RECOVERY_STATUS_LABEL[value].fr)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-neutral-500">
          {pick(lang, "السبب", "Cause")}
          <select
            value={rootCause}
            onChange={(e) => setRootCause(e.target.value as RootCause | "")}
            className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-2 py-2 text-sm text-neutral-900"
          >
            <option value="">{pick(lang, "— غير محدد —", "— Non précisée —")}</option>
            {ROOT_CAUSES.map((value) => (
              <option key={value} value={value}>
                {pick(lang, ROOT_CAUSE_LABEL[value].ar, ROOT_CAUSE_LABEL[value].fr)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        maxLength={1000}
        placeholder={pick(
          lang,
          "ما الذي تم فعله؟ (مثال: تحلية مجانية، اعتذار...)",
          "Qu'avez-vous fait ? (ex. dessert offert, excuses...)"
        )}
        className="mt-2 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
      />

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-neutral-400">
          {entry.handledBy &&
            entry.handledAt &&
            `${pick(lang, "بواسطة", "Par")} ${entry.handledBy} · ${new Date(
              entry.handledAt
            ).toLocaleString(lang === "ar" ? "ar-MA" : "fr-MA")}`}
        </span>
        <div className="flex items-center gap-2">
          {error && <span className="text-xs text-red-700">{error}</span>}
          {saved && (
            <span className="text-xs text-green-700">
              ✓ {pick(lang, "تم الحفظ", "Enregistré")}
            </span>
          )}
          <button
            type="button"
            disabled={!dirty || pending}
            onClick={save}
            className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs text-white hover:bg-neutral-700 disabled:opacity-40"
          >
            {pending ? pick(lang, "جارٍ الحفظ...", "Enregistrement...") : pick(lang, "حفظ", "Enregistrer")}
          </button>
        </div>
      </div>
    </div>
  );
}

export function RecoveryView({
  statsWindowDays,
  stats,
  cases,
}: {
  statsWindowDays: number;
  stats: RecoveryStats;
  cases: RecoveryCase[];
}) {
  const { lang } = useLanguage();
  const [filter, setFilter] = useState<"OPEN" | "ALL">("OPEN");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  const visible = filter === "OPEN" ? cases.filter((c) => c.status === "OPEN") : cases;

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">
        {pick(lang, "معالجة التقييمات المنخفضة", "Récupération des avis négatifs")}
      </h1>
      <p className="mb-6 text-sm text-neutral-500">
        {pick(
          lang,
          `كل تقييم ≤2★ يفتح حالة. الإحصائيات لآخر ${statsWindowDays} يوماً.`,
          `Chaque note ≤2★ ouvre un cas. Statistiques sur ${statsWindowDays} jours.`
        )}
      </p>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard
          icon={IconAlertTriangle}
          label={pick(lang, "حالات مفتوحة", "Cas ouverts")}
          value={stats.open}
          tone={stats.open > 0 ? "bad" : "good"}
        />
        <KpiCard
          icon={IconStar}
          label={pick(lang, `حالات (${statsWindowDays} يوماً)`, `Cas (${statsWindowDays} j)`)}
          value={stats.total}
        />
        <KpiCard
          icon={IconCheckCircle}
          label={pick(lang, "نسبة المعالجة", "Taux de traitement")}
          value={stats.handledRate === null ? "-" : `${stats.handledRate}%`}
          tone={
            stats.handledRate === null
              ? "neutral"
              : stats.handledRate >= 80
                ? "good"
                : "warn"
          }
        />
        <KpiCard
          icon={IconHeart}
          label={pick(lang, "وسيط مدة الاستجابة", "Délai médian de réponse")}
          value={formatDuration(stats.medianResponseMinutes, lang)}
        />
      </div>

      {stats.topCauses.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {stats.topCauses.map(({ cause, count }) => (
            <span
              key={cause}
              className="rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs text-neutral-700"
            >
              {pick(lang, ROOT_CAUSE_LABEL[cause].ar, ROOT_CAUSE_LABEL[cause].fr)}{" "}
              <span className="font-semibold">{count}</span>
            </span>
          ))}
        </div>
      )}

      <div className="mb-4 flex gap-2">
        {(["OPEN", "ALL"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${
              filter === value
                ? "bg-neutral-900 text-white"
                : "border border-neutral-300 text-neutral-600 hover:border-neutral-400"
            }`}
          >
            {value === "OPEN"
              ? pick(lang, `مفتوحة (${stats.open})`, `Ouverts (${stats.open})`)
              : pick(lang, "الكل", "Tous")}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {visible.length === 0 && (
          <p className="py-6 text-sm text-neutral-500">
            {filter === "OPEN"
              ? pick(lang, "لا توجد حالات مفتوحة 🎉", "Aucun cas ouvert 🎉")
              : pick(lang, "لا توجد حالات بعد.", "Aucun cas pour le moment.")}
          </p>
        )}
        {visible.map((entry) => (
          <CaseCard
            key={`${entry.id}-${entry.status}-${entry.handledAt}`}
            entry={entry}
            now={now}
            lang={lang}
          />
        ))}
      </div>
    </main>
  );
}
