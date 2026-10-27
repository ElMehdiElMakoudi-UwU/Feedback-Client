import type { Prisma } from "@prisma/client";

// Order statuses during which postes still have work on screen.
export const STATION_ACTIVE_STATUSES = ["CONFIRMED", "PREPARING"];

// A poste is only held back when it would otherwise finish this much earlier
// than the rest of the order; below that, a plate waiting at the passe is fine.
const HOLD_MIN_MINUTES = 2;
// Cook-time estimates come from recent tickets the poste actually started.
const ESTIMATE_DAYS = 14;
const MIN_SAMPLES = 5;

// Sends every confirmed, not-yet-fired item of an order to its poste,
// snapshotting the poste the menu item is routed to right now, then times
// the new tickets so all postes finish the order together.
export async function fireOrderItems(tx: Prisma.TransactionClient, orderId: string) {
  const items = await tx.orderItem.findMany({
    where: { orderId, confirmed: true, firedAt: null },
    select: { id: true, menuItem: { select: { workstationId: true } } },
  });
  const now = new Date();
  for (const item of items) {
    await tx.orderItem.update({
      where: { id: item.id },
      data: { firedAt: now, workstationId: item.menuItem?.workstationId ?? null },
    });
  }
  if (items.length > 0) {
    await scheduleOrderHolds(tx, orderId, new Set(items.map((item) => item.id)), now);
  }
  return items.length;
}

// When a poste's clock starts: a held ticket's wait at the poste only begins
// once it's released (or the cook starts it early), so the hold never counts
// as the cook being slow.
export function ticketStart(firedAt: Date, holdUntil: Date | null, startedAt: Date | null) {
  if (!holdUntil || holdUntil <= firedAt) return firedAt;
  return startedAt && startedAt < holdUntil ? startedAt : holdUntil;
}

// A poste's queue time for one item: from when it reached the cook to when it was bumped.
export function prepMinutes(from: Date, doneAt: Date) {
  return Math.max(0, (doneAt.getTime() - from.getTime()) / 60000);
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

type Estimates = { byItem: Map<string, number>; byStation: Map<string, number> };

// Typical hands-on time (started → bumped), per menu item and per poste.
async function loadCookEstimates(
  tx: Prisma.TransactionClient,
  stationIds: string[]
): Promise<Estimates> {
  const rows = await tx.orderItem.findMany({
    where: {
      workstationId: { in: stationIds },
      startedAt: { gte: new Date(Date.now() - ESTIMATE_DAYS * 86400000) },
      doneAt: { not: null },
    },
    select: { menuItemId: true, workstationId: true, startedAt: true, doneAt: true },
  });

  const byItem = new Map<string, number[]>();
  const byStation = new Map<string, number[]>();
  for (const row of rows) {
    const minutes = prepMinutes(row.startedAt!, row.doneAt!);
    // Bumped without pressing "Lancer" (no real start time) or left open by mistake.
    if (minutes < 0.5 || minutes > 90) continue;
    if (row.menuItemId) byItem.set(row.menuItemId, [...(byItem.get(row.menuItemId) ?? []), minutes]);
    byStation.set(row.workstationId!, [...(byStation.get(row.workstationId!) ?? []), minutes]);
  }

  const medians = (map: Map<string, number[]>) =>
    new Map(
      [...map].filter(([, values]) => values.length >= MIN_SAMPLES).map(([key, values]) => [key, median(values)])
    );
  return { byItem: medians(byItem), byStation: medians(byStation) };
}

type TimedLine = { menuItemId: string | null; quantity: number };
type TimedStation = { id: string; targetMinutes: number; staffCount: number };

// One ticket is cooked in parallel: the longest dish, plus a little per extra plate.
function cookMinutes(lines: TimedLine[], station: TimedStation, estimates: Estimates) {
  const fallback = estimates.byStation.get(station.id) ?? station.targetMinutes * 0.6;
  const longest = Math.max(
    ...lines.map((line) => (line.menuItemId && estimates.byItem.get(line.menuItemId)) || fallback)
  );
  const plates = lines.reduce((sum, line) => sum + line.quantity, 0);
  return longest + 0.5 * (plates - 1);
}

// Minutes of work already waiting at each poste before a new ticket reaches a cook.
async function loadQueueMinutes(
  tx: Prisma.TransactionClient,
  stations: TimedStation[],
  excludeOrderId: string,
  estimates: Estimates,
  now: Date
) {
  const open = await tx.orderItem.findMany({
    where: {
      workstationId: { in: stations.map((s) => s.id) },
      firedAt: { not: null },
      doneAt: null,
      orderId: { not: excludeOrderId },
      order: { status: { in: STATION_ACTIVE_STATUSES } },
      // Tickets still on hold aren't in the cook's way yet.
      OR: [{ holdUntil: null }, { holdUntil: { lte: now } }, { startedAt: { not: null } }],
    },
    select: { orderId: true, workstationId: true, menuItemId: true, quantity: true, startedAt: true },
  });

  const queue = new Map<string, number>();
  for (const station of stations) {
    const tickets = new Map<string, typeof open>();
    for (const item of open.filter((i) => i.workstationId === station.id)) {
      tickets.set(item.orderId, [...(tickets.get(item.orderId) ?? []), item]);
    }
    let work = 0;
    for (const lines of tickets.values()) {
      const cook = cookMinutes(lines, station, estimates);
      const started = lines.find((l) => l.startedAt)?.startedAt;
      work += started ? Math.max(0, cook - prepMinutes(started, now)) : cook;
    }
    queue.set(station.id, work / Math.max(1, station.staffCount));
  }
  return queue;
}

// Finds the poste that will finish this order last, and holds back the newly
// fired tickets of faster postes so they finish at the same moment.
async function scheduleOrderHolds(
  tx: Prisma.TransactionClient,
  orderId: string,
  newItemIds: Set<string>,
  now: Date
) {
  const lines = await tx.orderItem.findMany({
    where: { orderId, firedAt: { not: null }, doneAt: null, workstationId: { not: null } },
    select: {
      id: true,
      menuItemId: true,
      quantity: true,
      startedAt: true,
      holdUntil: true,
      workstation: { select: { id: true, targetMinutes: true, staffCount: true, syncWithOrder: true } },
    },
  });
  const synced = lines.filter((line) => line.workstation!.syncWithOrder);
  const stations = [...new Map(synced.map((l) => [l.workstation!.id, l.workstation!])).values()];
  if (stations.length < 2) return;

  const estimates = await loadCookEstimates(tx, stations.map((s) => s.id));
  const queue = await loadQueueMinutes(tx, stations, orderId, estimates, now);

  const parts = stations.map((station) => {
    const own = synced.filter((l) => l.workstation!.id === station.id);
    const cook = cookMinutes(own, station, estimates);
    const started = own.find((l) => l.startedAt)?.startedAt;
    const heldUntil = own.find((l) => l.holdUntil && l.holdUntil > now)?.holdUntil;
    const reachesCook = started
      ? started.getTime()
      : Math.max(now.getTime() + queue.get(station.id)! * 60000, heldUntil?.getTime() ?? 0);
    return {
      station,
      own,
      cook,
      queue: queue.get(station.id)!,
      isNew: !started && own.some((l) => newItemIds.has(l.id)),
      finishesAt: reachesCook + cook * 60000,
    };
  });

  const finishTogetherAt = Math.max(...parts.map((p) => p.finishesAt));
  for (const part of parts) {
    if (!part.isNew) continue;
    // Release it to the poste's queue so it reaches a cook just in time.
    const holdMinutes =
      (finishTogetherAt - now.getTime()) / 60000 - part.cook - part.queue;
    if (holdMinutes < HOLD_MIN_MINUTES) continue;
    await tx.orderItem.updateMany({
      where: { id: { in: part.own.filter((l) => newItemIds.has(l.id)).map((l) => l.id) } },
      data: { holdUntil: new Date(now.getTime() + holdMinutes * 60000) },
    });
  }
}
