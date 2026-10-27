"use client";

import Link from "next/link";
import { useEffect, useRef, useTransition } from "react";
import { useLanguage, pick } from "@/lib/language-context";
import { playChime, STAFF_ALERT } from "@/lib/sound";
import {
  bumpStationTicket,
  recallStationTicket,
  startStationTicket,
} from "@/app/actions/kitchen";
import type { KdsLine, KdsOrder, KdsStation } from "../../kds-types";
import {
  KdsToolbar,
  LineList,
  URGENCY_BADGE,
  URGENCY_BORDER,
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
} from "../../kds-shared";

type StationTicket = {
  order: KdsOrder;
  lines: KdsLine[];
  // When the cook's clock starts: fired time, or release time for a held ticket.
  startsAt: string;
  // Set while the ticket waits so it finishes with the order's other postes.
  heldUntil: string | null;
  started: boolean;
  done: boolean;
  others: { name: string; done: boolean }[];
};

function buildTickets(
  orders: KdsOrder[],
  station: KdsStation,
  stations: KdsStation[],
  now: number
) {
  const nameById = new Map(stations.map((s) => [s.id, s.name]));
  const tickets: StationTicket[] = [];

  for (const order of orders) {
    if (order.status === "READY") continue;
    const lines = order.items.filter(
      (item) => item.firedAt && item.workstationId === station.id
    );
    if (lines.length === 0) continue;

    const pending = lines.filter((line) => !line.doneAt);
    const clockLines = pending.length > 0 ? pending : lines;
    const startsAt = clockLines.map(lineStart).sort()[0];
    // The passe rushing an order releases its held tickets at once.
    const held =
      !order.rushedAt && pending.length > 0 && pending.every((line) => isHeld(line, now));

    const otherIds = [
      ...new Set(
        order.items
          .filter((item) => item.firedAt && item.workstationId !== station.id)
          .map((item) => item.workstationId)
      ),
    ];
    const others = otherIds.map((id) => ({
      name: id ? (nameById.get(id) ?? "?") : "Passe",
      done: order.items
        .filter((item) => item.firedAt && item.workstationId === id)
        .every((item) => item.doneAt),
    }));

    tickets.push({
      order,
      // While the ticket is open, show what's left; keep finished lines struck through.
      lines,
      startsAt,
      heldUntil: held ? startsAt : null,
      started: pending.some((line) => line.startedAt),
      done: pending.length === 0,
      others,
    });
  }

  const open = tickets
    .filter((t) => !t.done && !t.heldUntil)
    .sort((a, b) => {
      if (Boolean(a.order.rushedAt) !== Boolean(b.order.rushedAt)) {
        return a.order.rushedAt ? -1 : 1;
      }
      return a.startsAt.localeCompare(b.startsAt);
    });
  const held = tickets
    .filter((t) => !t.done && t.heldUntil)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const finished = tickets.filter((t) => t.done);
  return { open, held, finished };
}

function TicketCard({
  ticket,
  station,
  now,
  index,
}: {
  ticket: StationTicket;
  station: KdsStation;
  now: number;
  index: number;
}) {
  const { lang } = useLanguage();
  const [pending, startTransition] = useTransition();
  const minutes = minutesBetween(ticket.startsAt, now);
  const urgency = urgencyFor(minutes, station.targetMinutes);
  const rushed = Boolean(ticket.order.rushedAt);

  return (
    <article
      className={`flex flex-col rounded-xl border-2 bg-neutral-900 ${
        rushed ? "border-fuchsia-500 shadow-[0_0_0_3px_rgba(217,70,239,0.25)]" : URGENCY_BORDER[urgency]
      }`}
    >
      {rushed && (
        <div className="animate-pulse rounded-t-lg bg-fuchsia-600 px-4 py-1.5 text-center text-sm font-bold uppercase tracking-wider text-white">
          {pick(lang, "⚡ مستعجل — الباس", "⚡ Urgent — la passe attend")}
        </div>
      )}
      <header className="flex items-start justify-between gap-3 border-b border-neutral-800 px-4 pb-3 pt-3">
        <div className="min-w-0">
          <p className="flex items-baseline gap-2">
            <span className="text-3xl font-black tabular-nums tracking-tight text-white">
              {ticketNumber(ticket.order.number)}
            </span>
            <span className="text-xs font-medium text-neutral-500">#{index + 1}</span>
          </p>
          <p className="mt-0.5 truncate text-sm text-neutral-400">
            {modeLabel(ticket.order.tableNumber, lang)}
            {ticket.order.guestName ? ` · ${ticket.order.guestName}` : ""}
          </p>
        </div>
        <span
          className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-2xl font-bold tabular-nums ring-1 ${
            URGENCY_BADGE[urgency]
          } ${urgency === "late" ? "animate-pulse" : ""}`}
        >
          {formatElapsed(ticket.startsAt, now)}
        </span>
      </header>

      <div className="flex-1 px-4 py-3">
        <LineList lines={ticket.lines} lang={lang} />
        {ticket.order.note && (
          <p className="mt-3 rounded-md bg-amber-400/15 px-3 py-2 text-base font-medium text-amber-200">
            📝 {ticket.order.note}
          </p>
        )}
        {ticket.others.length > 0 && (
          <p className="mt-3 flex flex-wrap gap-1.5 text-xs text-neutral-400">
            <span>{pick(lang, "مع:", "Avec :")}</span>
            {ticket.others.map((other) => (
              <span
                key={other.name}
                className={`rounded-full px-2 py-0.5 ${
                  other.done ? "bg-emerald-500/15 text-emerald-300" : "bg-neutral-800 text-neutral-300"
                }`}
              >
                {other.done ? "✓ " : ""}
                {other.name}
              </span>
            ))}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-2 p-3 pt-0">
        {!ticket.started ? (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(() => startStationTicket(ticket.order.id, station.id))
              }
              className="min-h-[60px] rounded-lg bg-neutral-700 text-lg font-bold text-white transition-colors hover:bg-neutral-600 disabled:opacity-40"
            >
              {pick(lang, "▶ بدء", "▶ Lancer")}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(() => bumpStationTicket(ticket.order.id, station.id))
              }
              className="min-h-[60px] rounded-lg bg-emerald-600 text-lg font-bold text-white transition-colors hover:bg-emerald-500 disabled:opacity-40"
            >
              {pick(lang, "✓ جاهز", "✓ Prêt")}
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(() => bumpStationTicket(ticket.order.id, station.id))
            }
            className="min-h-[64px] rounded-lg bg-emerald-600 text-xl font-bold text-white transition-colors hover:bg-emerald-500 disabled:opacity-40"
          >
            {pick(lang, "✓ جاهز — إلى الباس", "✓ Prêt — envoyer à la passe")}
          </button>
        )}
      </div>
    </article>
  );
}

// A ticket waiting on purpose: the rest of the order takes longer, so starting
// now would only leave this plate going cold at the passe.
function HeldCard({
  ticket,
  station,
  now,
}: {
  ticket: StationTicket;
  station: KdsStation;
  now: number;
}) {
  const { lang } = useLanguage();
  const [pending, startTransition] = useTransition();
  const slower = ticket.others.filter((other) => !other.done).map((other) => other.name);

  return (
    <article className="flex flex-col rounded-xl border-2 border-dashed border-sky-700/70 bg-neutral-900/60">
      <header className="flex items-start justify-between gap-3 px-4 pb-2 pt-3">
        <div className="min-w-0">
          <p className="text-2xl font-black tabular-nums tracking-tight text-neutral-300">
            {ticketNumber(ticket.order.number)}
          </p>
          <p className="truncate text-sm text-neutral-500">{modeLabel(ticket.order.tableNumber, lang)}</p>
        </div>
        <div className="text-end">
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-400">
            {pick(lang, "ابدأ بعد", "Lancer dans")}
          </p>
          <p className="text-3xl font-bold tabular-nums text-sky-300">
            {formatCountdown(ticket.heldUntil!, now)}
          </p>
        </div>
      </header>
      <div className="flex-1 px-4 pb-3 opacity-70">
        <LineList lines={ticket.lines} lang={lang} size="md" />
        {slower.length > 0 && (
          <p className="mt-2 text-xs text-sky-300/80">
            ⏸ {pick(lang, `متزامن مع ${slower.join("، ")}`, `Synchronisé avec ${slower.join(", ")}`)}
          </p>
        )}
      </div>
      <div className="p-3 pt-0">
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(() => startStationTicket(ticket.order.id, station.id))}
          className="min-h-[48px] w-full rounded-lg border border-neutral-700 text-sm font-semibold text-neutral-300 hover:border-neutral-500 disabled:opacity-40"
        >
          ▶ {pick(lang, "ابدأ الآن", "Lancer maintenant")}
        </button>
      </div>
    </article>
  );
}

function FinishedChip({ ticket, station }: { ticket: StationTicket; station: KdsStation }) {
  const { lang } = useLanguage();
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex items-center gap-3 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2">
      <span className="text-lg font-bold tabular-nums text-neutral-300">
        {ticketNumber(ticket.order.number)}
      </span>
      <span className="text-xs text-emerald-400">✓ {pick(lang, "في الباس", "à la passe")}</span>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(() => recallStationTicket(ticket.order.id, station.id))
        }
        className="min-h-[40px] rounded-md border border-neutral-700 px-3 text-xs text-neutral-300 hover:border-neutral-500 disabled:opacity-40"
      >
        ↺ {pick(lang, "استرجاع", "Rappeler")}
      </button>
    </div>
  );
}

export function StationBoard({
  station,
  stations,
  orders,
  renderedAt,
}: {
  station: KdsStation;
  stations: KdsStation[];
  orders: KdsOrder[];
  renderedAt: number;
}) {
  const { lang } = useLanguage();
  const now = useNow(renderedAt);
  useKitchenStream();

  const { open, held, finished } = buildTickets(orders, station, stations, now);
  const late = open.filter(
    (t) => minutesBetween(t.startsAt, now) >= station.targetMinutes
  ).length;
  const itemsLeft = open.reduce(
    (sum, t) => sum + t.lines.filter((l) => !l.doneAt).reduce((s, l) => s + l.quantity, 0),
    0
  );

  // Chime when a ticket this poste hasn't seen yet lands on the screen.
  const seen = useRef<Set<string> | null>(null);
  const openKeys = open.map((t) => `${t.order.id}:${t.startsAt}`).join(",");
  useEffect(() => {
    const keys = openKeys ? openKeys.split(",") : [];
    if (seen.current && keys.some((key) => !seen.current!.has(key)) && !readMuted()) {
      playChime(STAFF_ALERT);
    }
    seen.current = new Set(keys);
  }, [openKeys]);

  return (
    <main className="min-h-[calc(100vh-57px)] bg-neutral-950 px-4 py-4 text-neutral-100 sm:px-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/admin/kitchen"
            className="rounded-md border border-neutral-700 px-3 py-2 text-sm text-neutral-400 hover:border-neutral-500"
          >
            ← {pick(lang, "الباس", "Passe")}
          </Link>
          <h1 className="text-3xl font-black tracking-tight text-white">{station.name}</h1>
          <div className="flex gap-2 text-sm">
            <span className="rounded-full bg-neutral-800 px-3 py-1 font-semibold">
              {open.length} {pick(lang, "تذاكر", "tickets")} · {itemsLeft} {pick(lang, "أطباق", "plats")}
            </span>
            {late > 0 && (
              <span className="animate-pulse rounded-full bg-red-600 px-3 py-1 font-bold text-white">
                {late} {pick(lang, "متأخرة", "en retard")}
              </span>
            )}
            {held.length > 0 && (
              <span className="rounded-full bg-sky-900/60 px-3 py-1 font-semibold text-sky-300">
                ⏸ {held.length} {pick(lang, "في الانتظار", "planifiés")}
              </span>
            )}
            <span className="rounded-full bg-neutral-800 px-3 py-1 text-neutral-400">
              {pick(lang, "الهدف", "Objectif")} {station.targetMinutes} min
            </span>
          </div>
        </div>
        <KdsToolbar lang={lang} now={now} />
      </div>

      {open.length === 0 && held.length > 0 ? (
        <p className="rounded-xl border-2 border-dashed border-neutral-800 px-4 py-8 text-center text-lg text-neutral-500">
          {pick(lang, "لا شيء للبدء الآن", "Rien à lancer pour l'instant")}
        </p>
      ) : open.length === 0 ? (
        <div className="flex h-[50vh]flex-col items-center justify-center rounded-xl border-2 border-dashed border-neutral-800 text-neutral-500">
          <p className="text-5xl">✓</p>
          <p className="mt-3 text-xl">{pick(lang, "لا توجد طلبات", "Aucune commande en attente")}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {open.map((ticket, index) => (
            <TicketCard
              key={ticket.order.id}
              ticket={ticket}
              station={station}
              now={now}
              index={index}
            />
          ))}
        </div>
      )}

      {held.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-sky-400">
            ⏸ {pick(lang, "مخطط — لتخرج مع باقي الطلب", "Planifiés — pour sortir avec le reste de la commande")}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {held.map((ticket) => (
              <HeldCard key={ticket.order.id} ticket={ticket} station={station} now={now} />
            ))}
          </div>
        </section>
      )}

      {finished.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
            {pick(lang, "أُنهيت مؤخراً", "Terminés récemment")}
          </h2>
          <div className="flex flex-wrap gap-2">
            {finished.slice(-8).map((ticket) => (
              <FinishedChip key={ticket.order.id} ticket={ticket} station={station} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
