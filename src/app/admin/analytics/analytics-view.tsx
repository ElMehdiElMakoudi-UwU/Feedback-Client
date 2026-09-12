"use client";

import { useRouter } from "next/navigation";
import { useLanguage, pick } from "@/lib/language-context";

type Kpis = {
  revenueTotal: number;
  completedCount: number;
  avgOrderValue: number;
  cancellationRate: number | null;
  foodAvg: number | null;
  serviceAvg: number | null;
  feedbackCount: number;
  pointsEarned: number;
  pointsRedeemed: number;
  activeLoyaltyCustomers: number;
};

type RevenuePoint = { day: string; revenue: number; orders: number };
type RatingPoint = { day: string; food: number | null; service: number | null };
type TopItem = {
  nameAr: string;
  nameFr: string;
  quantity: number;
  revenue: number;
};

function KpiCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  return (
    <div className="rounded-md border border-neutral-200 bg-neutral-50 p-4">
      <p
        className={`text-2xl font-semibold tracking-tight ${
          accent ? "text-[var(--sindibad-maroon)]" : "text-neutral-900"
        }`}
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-neutral-500">{label}</p>
    </div>
  );
}

function dayLabel(iso: string, lang: "ar" | "fr") {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(lang === "ar" ? "ar-MA" : "fr-MA", {
    day: "numeric",
    month: "short",
  });
}

function RevenueChart({
  data,
  lang,
}: {
  data: RevenuePoint[];
  lang: "ar" | "fr";
}) {
  const width = 640;
  const height = 180;
  const padding = 24;
  const max = Math.max(1, ...data.map((d) => d.revenue));
  const barWidth = (width - padding * 2) / data.length;
  const showEveryNth = Math.ceil(data.length / 10);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      role="img"
      aria-label={pick(lang, "الإيرادات اليومية", "Revenus quotidiens")}
    >
      {data.map((d, i) => {
        const barHeight = (d.revenue / max) * (height - padding * 2);
        const x = padding + i * barWidth;
        const y = height - padding - barHeight;
        return (
          <g key={d.day}>
            <rect
              x={x + barWidth * 0.15}
              y={y}
              width={barWidth * 0.7}
              height={barHeight}
              rx={2}
              fill="var(--sindibad-maroon)"
              opacity={0.85}
            >
              <title>
                {dayLabel(d.day, lang)}: {d.revenue} DH ({d.orders}{" "}
                {pick(lang, "طلب", "commandes")})
              </title>
            </rect>
            {i % showEveryNth === 0 && (
              <text
                x={x + barWidth / 2}
                y={height - 6}
                textAnchor="middle"
                fontSize="9"
                fill="var(--sindibad-muted)"
              >
                {dayLabel(d.day, lang)}
              </text>
            )}
          </g>
        );
      })}
      <line
        x1={padding}
        y1={height - padding}
        x2={width - padding}
        y2={height - padding}
        stroke="var(--sindibad-line)"
      />
    </svg>
  );
}

function RatingChart({
  data,
  lang,
}: {
  data: RatingPoint[];
  lang: "ar" | "fr";
}) {
  const width = 640;
  const height = 180;
  const padding = 24;
  const stepX = (width - padding * 2) / Math.max(1, data.length - 1);

  function linePath(key: "food" | "service") {
    const points = data
      .map((d, i) => {
        const v = d[key];
        if (v === null) return null;
        const x = padding + i * stepX;
        const y = padding + (1 - v / 5) * (height - padding * 2);
        return `${x},${y}`;
      })
      .filter((p): p is string => p !== null);
    return points.length > 1 ? `M ${points.join(" L ")}` : null;
  }

  const foodPath = linePath("food");
  const servicePath = linePath("service");
  const showEveryNth = Math.ceil(data.length / 10);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      role="img"
      aria-label={pick(lang, "متوسط التقييمات", "Notes moyennes")}
    >
      {[1, 2, 3, 4, 5].map((v) => (
        <line
          key={v}
          x1={padding}
          x2={width - padding}
          y1={padding + (1 - v / 5) * (height - padding * 2)}
          y2={padding + (1 - v / 5) * (height - padding * 2)}
          stroke="var(--sindibad-line)"
          strokeWidth={0.5}
        />
      ))}
      {foodPath && (
        <path d={foodPath} fill="none" stroke="var(--sindibad-maroon)" strokeWidth={2} />
      )}
      {servicePath && (
        <path d={servicePath} fill="none" stroke="var(--sindibad-rose)" strokeWidth={2} />
      )}
      {data.map((d, i) =>
        i % showEveryNth === 0 ? (
          <text
            key={d.day}
            x={padding + i * stepX}
            y={height - 6}
            textAnchor="middle"
            fontSize="9"
            fill="var(--sindibad-muted)"
          >
            {dayLabel(d.day, lang)}
          </text>
        ) : null
      )}
    </svg>
  );
}

export function AnalyticsView({
  range,
  kpis,
  revenueSeries,
  ratingSeries,
  topItems,
}: {
  range: "7d" | "30d" | "90d";
  kpis: Kpis;
  revenueSeries: RevenuePoint[];
  ratingSeries: RatingPoint[];
  topItems: TopItem[];
}) {
  const { lang } = useLanguage();
  const router = useRouter();

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          {pick(lang, "لوحة التحليلات", "Tableau de bord analytique")}
        </h1>
        <div className="flex gap-1 rounded-md border border-neutral-200 p-1 text-sm">
          {(["7d", "30d", "90d"] as const).map((r) => (
            <button
              key={r}
              onClick={() => router.push(`/admin/analytics?range=${r}`)}
              className={`rounded px-3 py-1.5 ${
                range === r
                  ? "bg-[var(--sindibad-maroon)] text-white"
                  : "text-neutral-600 hover:bg-neutral-100"
              }`}
            >
              {r === "7d"
                ? pick(lang, "٧ أيام", "7 jours")
                : r === "30d"
                  ? pick(lang, "٣٠ يوم", "30 jours")
                  : pick(lang, "٩٠ يوم", "90 jours")}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard
          label={pick(lang, "الإيرادات", "Revenus")}
          value={`${kpis.revenueTotal} ${pick(lang, "درهم", "DH")}`}
          accent
        />
        <KpiCard
          label={pick(lang, "الطلبات المكتملة", "Commandes complétées")}
          value={kpis.completedCount}
        />
        <KpiCard
          label={pick(lang, "متوسط الطلب", "Panier moyen")}
          value={`${kpis.avgOrderValue.toFixed(0)} ${pick(lang, "درهم", "DH")}`}
        />
        <KpiCard
          label={pick(lang, "معدل الإلغاء", "Taux d'annulation")}
          value={
            kpis.cancellationRate === null
              ? "-"
              : `${(kpis.cancellationRate * 100).toFixed(0)}%`
          }
        />
      </div>

      <section className="mt-10">
        <h2 className="mb-3 text-sm font-medium text-neutral-700">
          {pick(lang, "الإيرادات اليومية", "Revenus quotidiens")}
        </h2>
        <div className="rounded-md border border-neutral-200 p-4">
          <RevenueChart data={revenueSeries} lang={lang} />
        </div>
      </section>

      <section className="mt-10 grid gap-3 sm:grid-cols-3">
        <KpiCard
          label={pick(lang, "متوسط تقييم الطعام", "Note moyenne — nourriture")}
          value={kpis.foodAvg === null ? "-" : kpis.foodAvg.toFixed(1)}
        />
        <KpiCard
          label={pick(lang, "متوسط تقييم الخدمة", "Note moyenne — service")}
          value={kpis.serviceAvg === null ? "-" : kpis.serviceAvg.toFixed(1)}
        />
        <KpiCard
          label={pick(lang, "عدد التقييمات", "Nombre d'avis")}
          value={kpis.feedbackCount}
        />
      </section>

      <section className="mt-6">
        <div className="mb-3 flex items-center gap-4 text-xs text-neutral-500">
          <span className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: "var(--sindibad-maroon)" }}
            />
            {pick(lang, "الطعام", "Nourriture")}
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: "var(--sindibad-rose)" }}
            />
            {pick(lang, "الخدمة", "Service")}
          </span>
        </div>
        <div className="rounded-md border border-neutral-200 p-4">
          <RatingChart data={ratingSeries} lang={lang} />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="mb-3 text-sm font-medium text-neutral-700">
          {pick(lang, "الأصناف الأكثر مبيعًا", "Articles les plus vendus")}
        </h2>
        <div className="rounded-md border border-neutral-200">
          {topItems.length === 0 ? (
            <p className="p-4 text-sm text-neutral-500">
              {pick(lang, "لا توجد بيانات", "Aucune donnée")}
            </p>
          ) : (
            <div className="flex flex-col divide-y divide-neutral-100">
              {topItems.map((item, i) => (
                <div
                  key={item.nameFr}
                  className="flex items-center justify-between px-4 py-2.5 text-sm"
                >
                  <span>
                    <span className="mr-2 text-neutral-400">{i + 1}.</span>
                    {pick(lang, item.nameAr, item.nameFr)}
                  </span>
                  <span className="text-neutral-500">
                    {item.quantity} × — {item.revenue} {pick(lang, "درهم", "DH")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="mb-3 text-sm font-medium text-neutral-700">
          {pick(lang, "برنامج الولاء", "Programme de fidélité")}
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <KpiCard
            label={pick(lang, "نقاط مكتسبة", "Points gagnés")}
            value={kpis.pointsEarned}
          />
          <KpiCard
            label={pick(lang, "نقاط مستبدلة", "Points échangés")}
            value={kpis.pointsRedeemed}
          />
          <KpiCard
            label={pick(lang, "عملاء نشطون", "Clients actifs")}
            value={kpis.activeLoyaltyCustomers}
          />
        </div>
      </section>
    </main>
  );
}
