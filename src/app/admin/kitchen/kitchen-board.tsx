"use client";

import Link from "next/link";
import { useEffect, useRef, useTransition } from "react";
import { useLanguage, pick } from "@/lib/language-context";
import { advanceOrderStatus } from "@/app/actions/orders";
import {
  bumpStationTicket,
  sendOrderFromPasse,
  toggleRushOrder,
} from "@/app/actions/kitchen";
import { playChime, STAFF_ALERT, PICKUP_ALERT } from "@/lib/sound";
import { NO_STATION, type KdsLine, type KdsOrder, type KdsStation } from "./kds-types";
import {
  KdsToolbar,
  LineList,
  URGENCY_BADGE,
  formatCountdown,
  formatElapsed,
  isHeld,
  lineStart,
  minutesBetween,
  modeLabel,
  readMuted,
  ticketNumber,
  urgencyFor,
  useKitchenStream,
  useNow,
  type Urgency,
} from "./kds-shared";

// The passe has no target of its own; a whole order over this is late.
const ORDER_TARGET_MINUTES = 20;

type StationPart = {
  key: string;
  name: string;
  targetMinutes: number;
  lines: KdsLine[];
  startsAt: string;
  // Waiting on purpose so this poste finishes with the slower ones.
  heldUntil: string | null;
  started: boolean;
  done: boolean;
  doneAt: string | null;
};

function stationParts(order: KdsOrder, stations: KdsStation[], now: number): StationPart[] {
  const parts: StationPart[] = [];
  const fired = order.items.filter((item) => item.firedAt);
  const groups = new Map<string, KdsLine[]>();
  for (const item of fired) {
    const key = item.workstationId ?? NO_STATION;
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  const ordered = [
    ...stations.map((s) => s.id).filter((id) => groups.has(id)),
    ...[...groups.keys()].filter((key) => !stations.some((s) => s.id === key)),
  ];
  for (const key of ordered) {
    const lines = groups.get(key)!;
    const station = stations.find((s) => s.id === key);
    const pending = lines.filter((l) => !l.doneAt);
    const startsAt = (pending.length ? pending : lines).map(lineStart).sort()[0];
    const held =
      !order.rushedAt && pending.length > 0 && pending.every((l) => isHeld(l, now));
    parts.push({
      key,
      name: station?.name ?? "Passe",
      targetMinutes: station?.targetMinutes ?? ORDER_TARGET_MINUTES,
      lines,
      startsAt,
      heldUntil: held ? startsAt : null,
      started: pending.some((l) => l.startedAt),
      done: pending.length === 0,
      doneAt: pending.length === 0 ? lines.map((l) => l.doneAt!).sort().at(-1)! : null,
    });
  }
  return parts;
}

function StationStrip({
  stations,
  orders,
  now,
}: {
  stations: KdsStation[];
  orders: KdsOrder[];
  now: number;
}) {
  const { lang } = useLanguage();
  const active = orders.filter((o) => o.status !== "READY");

  return (
    <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
      {stations.map((station) => {
        const parts = active
          .map((o) => stationParts(o, stations, now).find((p) => p.key === station.id))
          .filter((p): p is StationPart => Boolean(p && !p.done));
        const tickets = parts.filter((p) => !p.heldUntil);
        const held = parts.length - tickets.length;
        const oldest = tickets.map((t) => t.startsAt).sort()[0];
        const oldestMin = oldest ? minutesBetween(oldest, now) : 0;
        const late = tickets.filter(
          (t) => minutesBetween(t.startsAt, now) >= station.targetMinutes
        ).length;
        const urgency: Urgency = oldest ? urgencyFor(oldestMin, station.targetMinutes) : "ok";
        return (
          <Link
            key={station.id}
            href={`/admin/kitchen/poste/${station.id}`}
            className={`rounded-lg border bg-neutral-900 px-3 py-2.5 transition-colors hover:border-neutral-500 ${
              late > 0 ? "border-red-500" : urgency === "warn" ? "border-amber-500/70" : "border-neutral-800"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="truncate font-semibold text-white">{station.name}</span>
              <span className="text-xs text-neutral-500">👤 {station.staffCount}</span>
            </div>
            <div className="mt-1 flex items-baseline justify-between gap-2">
              <span className="text-2xl font-bold tabular-nums text-neutral-100">{tickets.length}</span>
              {oldest ? (
                <span className={`rounded px-1.5 py-0.5 text-sm font-semibold tabular-nums ring-1 ${URGENCY_BADGE[urgency]}`}>
                  {formatElapsed(oldest, now)}
                </span>
              ) : (
                <span className="text-xs text-neutral-500">{pick(lang, "فارغ", "libre")}</span>
              )}
            </div>
            {(late > 0 || held > 0) && (
              <p className="mt-1 flex gap-2 text-xs font-semibold">
                {late > 0 && (
                  <span className="text-red-300">
                    {late} {pick(lang, "متأخرة", "en retard")}
                  </span>
                )}
                {held > 0 && (
                  <span className="text-sky-300">
                    ⏸ {held} {pick(lang, "مخطط", "planifié(s)")}
                  </span>
                )}
              </p>
            )}
          </Link>
        );
      })}
      {stations.length === 0 && (
        <p className="col-span-full rounded-lg border border-dashed border-neutral-700 px-4 py-3 text-sm text-neutral-400">
          {pick(
            lang,
            "لا توجد محطات بعد. أنشئها في المخزون ← الإعداد ← المحطات، ثم اربط الأطباق في الوصفات.",
            "Aucun poste configuré. Créez-les dans Stock → Configuration → Postes, puis affectez les plats dans Recettes."
          )}
        </p>
      )}
    </div>
  );
}

function PasseCard({
  order,
  stations,
  now,
}: {
  order: KdsOrder;
  stations: KdsStation[];
  now: number;
}) {
  const { lang } = useLanguage();
  const [pending, startTransition] = useTransition();
  const parts = stationParts(order, stations, now);
  const allDone = parts.length > 0 && parts.every((p) => p.done);
  const waitingOn = parts.filter((p) => !p.done);
  const unconfirmed = order.items.filter((item) => !item.confirmed);
  const total = minutesBetween(order.createdAt, now);
  const urgency = urgencyFor(total, ORDER_TARGET_MINUTES);
  const rushed = Boolean(order.rushedAt);

  return (
    <article
      className={`flex flex-col rounded-xl border-2 bg-neutral-900 ${
        allDone
          ? "border-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.2)]"
          : rushed
            ? "border-fuchsia-500"
            : urgency === "late"
              ? "border-red-500"
              : "border-neutral-800"
      }`}
    >
      <header className="flex items-start justify-between gap-3 border-b border-neutral-800 px-4 py-3">
        <div className="min-w-0">
          <p className="text-3xl font-black tabular-nums tracking-tight text-white">
            {ticketNumber(order.number)}
          </p>
          <p className="truncate text-sm text-neutral-400">
            {modeLabel(order.tableNumber, lang)}
            {order.guestName ? ` · ${order.guestName}` : ""}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`rounded-lg px-2.5 py-1 text-xl font-bold tabular-nums ring-1 ${URGENCY_BADGE[urgency]}`}>
            {formatElapsed(order.createdAt, now)}
          </span>
          {allDone ? (
            <span className="text-xs font-bold uppercase tracking-wide text-emerald-400">
              {pick(lang, "جاهز للإرسال", "Prête à envoyer")}
            </span>
          ) : rushed ? (
            <span className="text-xs font-bold uppercase tracking-wide text-fuchsia-400">⚡ Urgent</span>
          ) : null}
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-3 px-4 py-3">
        {parts.map((part) => {
          const partUrgency = part.done
            ? "ok"
            : urgencyFor(minutesBetween(part.startsAt, now), part.targetMinutes);
          return (
            <div key={part.key}>
              <div className="mb-1 flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wide">
                <span className={part.done ? "text-emerald-400" : "text-neutral-300"}>
                  {part.done ? "✓ " : part.started ? "🔥 " : part.heldUntil ? "⏸ " : "⏳ "}
                  {part.name}
                </span>
                {part.done ? (
                  <span className="text-emerald-500">{pick(lang, "جاهز", "prêt")}</span>
                ) : part.key === NO_STATION ? (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => startTransition(() => bumpStationTicket(order.id, NO_STATION))}
                    className="rounded-md bg-neutral-700 px-2 py-1 text-[11px] font-bold text-white hover:bg-neutral-600 disabled:opacity-40"
                  >
                    ✓ {pick(lang, "تم", "Fait")}
                  </button>
                ) : part.heldUntil ? (
                  <span className="rounded bg-sky-500/15 px-1.5 py-0.5 normal-case tabular-nums text-sky-300 ring-1 ring-sky-500/30">
                    {pick(lang, "يبدأ بعد", "démarre dans")} {formatCountdown(part.heldUntil, now)}
                  </span>
                ) : (
                  <span className={`rounded px-1.5 py-0.5 tabular-nums ring-1 ${URGENCY_BADGE[partUrgency]}`}>
                    {formatElapsed(part.startsAt, now)}
                  </span>
                )}
              </div>
              <LineList lines={part.lines} lang={lang} size="md" />
            </div>
          );
        })}
        {unconfirmed.length > 0 && (
          <p className="rounded-md bg-amber-400/10 px-3 py-2 text-xs text-amber-300">
            + {unconfirmed.length} {pick(lang, "أطباق جديدة تنتظر تأكيد الصندوق", "ajout(s) en attente de confirmation caisse")}
          </p>
        )}
        {order.note && (
          <p className="rounded-md bg-amber-400/15 px-3 py-2 text-sm font-medium text-amber-200">📝 {order.note}</p>
        )}
      </div>

      <div className="flex gap-2 p-3 pt-0">
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(() => sendOrderFromPasse(order.id))}
          className={`min-h-[56px] flex-1 rounded-lg text-base font-bold transition-colors disabled:opacity-40 ${
            allDone
              ? "bg-emerald-600 text-white hover:bg-emerald-500"
              : "border border-neutral-700 text-neutral-300 hover:border-neutral-500"
          }`}
        >
          {allDone
            ? pick(lang, "🔔 إرسال", "🔔 Envoyer")
            : waitingOn.length > 0
              ? pick(lang, `بانتظار ${waitingOn.map((p) => p.name).join("، ")}`, `Attend ${waitingOn.map((p) => p.name).join(", ")}`)
              : pick(lang, "إرسال", "Envoyer")}
        </button>
        {!allDone && (
          <button
            type="button"
            disabled={pending}
            onClick={() => startTransition(() => toggleRushOrder(order.id))}
            aria-pressed={rushed}
            className={`min-h-[56px] rounded-lg px-4 text-base font-bold transition-colors disabled:opacity-40 ${
              rushed ? "bg-fuchsia-600 text-white" : "border border-neutral-700 text-fuchsia-300 hover:border-fuchsia-500"
            }`}
          >
            ⚡
          </button>
        )}
      </div>
    </article>
  );
}

function HandoverRow({ order, now }: { order: KdsOrder; now: number }) {
  const { lang } = useLanguage();
  const [pending, startTransition] = useTransition();
  const since = order.readyAt ?? order.createdAt;
  const urgency = urgencyFor(minutesBetween(since, now), 5);
  return (
    <div className="flex items-center gap-3 rounded-lg border border-emerald-800 bg-emerald-950/40 px-3 py-2">
      <span className="text-2xl font-black tabular-nums text-white">{ticketNumber(order.number)}</span>
      <span className="min-w-0 flex-1 truncate text-sm text-neutral-300">{modeLabel(order.tableNumber, lang)}</span>
      <span className={`rounded px-1.5 py-0.5 text-sm font-semibold tabular-nums ring-1 ${URGENCY_BADGE[urgency]}`}>
        {formatElapsed(since, now)}
      </span>
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(() => advanceOrderStatus(order.id))}
        className="min-h-[44px] rounded-md bg-white px-3 text-sm font-bold text-neutral-900 hover:bg-neutral-200 disabled:opacity-40"
      >
        ✓ {pick(lang, "سُلّم", "Remise")}
      </button>
    </div>
  );
}

export function KitchenBoard({
  orders,
  stations,
  renderedAt,
}: {
  orders: KdsOrder[];
  stations: KdsStation[];
  renderedAt: number;
}) {
  const { lang } = useLanguage();
  const now = useNow(renderedAt);
  useKitchenStream();

  const cooking = orders
    .filter((o) => o.status !== "READY")
    .map((order) => ({ order, parts: stationParts(order, stations, now) }))
    .sort((a, b) => {
      const aDone = a.parts.length > 0 && a.parts.every((p) => p.done);
      const bDone = b.parts.length > 0 && b.parts.every((p) => p.done);
      if (aDone !== bDone) return aDone ? -1 : 1;
      if (Boolean(a.order.rushedAt) !== Boolean(b.order.rushedAt)) return a.order.rushedAt ? -1 : 1;
      return a.order.createdAt.localeCompare(b.order.createdAt);
    });
  const handover = orders.filter((o) => o.status === "READY");

  // Chime for new orders, and a different one when an order is complete at every poste.
  const prev = useRef<{ ids: Set<string>; done: Set<string> } | null>(null);
  const ids = cooking.map((c) => c.order.id).join(",");
  const done = cooking
    .filter((c) => c.parts.length > 0 && c.parts.every((p) => p.done))
    .map((c) => c.order.id)
    .join(",");
  useEffect(() => {
    const idSet = new Set(ids ? ids.split(",") : []);
    const doneSet = new Set(done ? done.split(",") : []);
    if (prev.current && !readMuted()) {
      if ([...doneSet].some((id) => !prev.current!.done.has(id))) playChime(PICKUP_ALERT);
      else if ([...idSet].some((id) => !prev.current!.ids.has(id))) playChime(STAFF_ALERT);
    }
    prev.current = { ids: idSet, done: doneSet };
  }, [ids, done]);

  return (
    <main className="min-h-[calc(100vh-57px)] bg-neutral-950 px-4 py-4 text-neutral-100 sm:px-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-black tracking-tight text-white">{pick(lang, "الباس", "Passe")}</h1>
          <span className="rounded-full bg-neutral-800 px-3 py-1 text-sm font-semibold">
            {cooking.length} {pick(lang, "في المطبخ", "en cuisine")} · {handover.length} {pick(lang, "للتسليم", "à remettre")}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/display"
            target="_blank"
            rel="noreferrer"
            className="min-h-[44px] rounded-md border border-neutral-700 px-3 py-2.5 text-sm text-neutral-300 hover:border-neutral-500"
          >
            📺 {pick(lang, "شاشة الزبائن", "Écran clients")}
          </a>
          <KdsToolbar lang={lang} now={now} />
        </div>
      </div>

      <StationStrip stations={stations} orders={orders} now={now} />

      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <section>
          {cooking.length === 0 ? (
            <div className="flex h-[40vh] items-center justify-center rounded-xl border-2 border-dashed border-neutral-800 text-xl text-neutral-500">
              {pick(lang, "لا توجد طلبات في المطبخ", "Aucune commande en cuisine")}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
              {cooking.map(({ order }) => (
                <PasseCard key={order.id} order={order} stations={stations} now={now} />
              ))}
            </div>
          )}
        </section>
        <aside>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
            🔔 {pick(lang, "جاهز — للتسليم", "Prêtes — à remettre")}
          </h2>
          <div className="flex flex-col gap-2">
            {handover.map((order) => (
              <HandoverRow key={order.id} order={order} now={now} />
            ))}
            {handover.length === 0 && (
              <p className="rounded-lg border border-dashed border-neutral-800 px-3 py-6 text-center text-sm text-neutral-500">
                {pick(lang, "لا شيء هنا", "Rien ici")}
              </p>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}
