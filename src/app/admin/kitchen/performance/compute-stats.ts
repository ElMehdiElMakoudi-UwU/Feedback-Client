import { prisma } from "@/lib/prisma";
import { prepMinutes, ticketStart } from "@/lib/kitchen";
import type { KitchenStats, StationStats } from "@/lib/kitchen-advice";
import { isHeld, lineStart, type KdsOrder, type KdsStation } from "../kds-types";

export type HourCell = { tickets: number; avgMinutes: number };

export type PerformanceData = {
  stats: KitchenStats;
  // stationId → hour (0–23) → cell
  hourly: Record<string, Record<number, HourCell>>;
  hours: number[];
  totalTickets: number;
  avgOrderMinutes: number | null; // confirmation → ready, whole order
  // Orders split over several postes: first plate done → last plate done.
  // This is how long food sits at the passe going cold.
  avgPlateWaitMinutes: number | null;
};

function average(values: number[]) {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
}

function percentile(values: number[], p: number) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
}

export async function computeKitchenPerformance(
  stations: KdsStation[],
  liveOrders: KdsOrder[],
  rangeStart: Date
): Promise<PerformanceData> {
  const now = Date.now();

  const [items, orders, unassignedMenuItems] = await Promise.all([
    prisma.orderItem.findMany({
      where: {
        firedAt: { gte: rangeStart },
        doneAt: { not: null },
        workstationId: { not: null },
        order: { status: { not: "CANCELLED" } },
      },
      select: { orderId: true, workstationId: true, quantity: true, firedAt: true, holdUntil: true, startedAt: true, doneAt: true },
    }),
    prisma.order.findMany({
      where: { createdAt: { gte: rangeStart }, readyAt: { not: null }, status: { not: "CANCELLED" } },
      select: {
        id: true,
        readyAt: true,
        completedAt: true,
        items: { where: { firedAt: { not: null } }, select: { firedAt: true, doneAt: true } },
      },
    }),
    prisma.menuItem.count({ where: { workstationId: null, available: true, comingSoon: false } }),
  ]);

  // One "ticket" = one order's part at one poste.
  type Ticket = { orderId: string; stationId: string; firedAt: Date; doneAt: Date; items: number };
  const ticketMap = new Map<string, Ticket>();
  for (const item of items) {
    const key = `${item.orderId}:${item.workstationId}`;
    // Time on purpose spent on hold isn't the poste being slow.
    const firedAt = ticketStart(item.firedAt!, item.holdUntil, item.startedAt);
    const doneAt = item.doneAt!;
    const existing = ticketMap.get(key);
    if (!existing) {
      ticketMap.set(key, {
        orderId: item.orderId,
        stationId: item.workstationId!,
        firedAt,
        doneAt,
        items: item.quantity,
      });
    } else {
      if (firedAt < existing.firedAt) existing.firedAt = firedAt;
      if (doneAt > existing.doneAt) existing.doneAt = doneAt;
      existing.items += item.quantity;
    }
  }
  const tickets = [...ticketMap.values()];
  const totalItems = tickets.reduce((sum, t) => sum + t.items, 0);

  // Who finished last in orders that went through several postes.
  const byOrder = new Map<string, Ticket[]>();
  for (const t of tickets) byOrder.set(t.orderId, [...(byOrder.get(t.orderId) ?? []), t]);
  const lastCount = new Map<string, number>();
  const leads = new Map<string, number[]>();
  let multiStationOrders = 0;
  const plateWaits: number[] = [];
  for (const group of byOrder.values()) {
    if (group.length < 2) continue;
    multiStationOrders++;
    const sorted = [...group].sort((a, b) => b.doneAt.getTime() - a.doneAt.getTime());
    plateWaits.push(prepMinutes(sorted.at(-1)!.doneAt, sorted[0].doneAt));
    const last = sorted[0];
    lastCount.set(last.stationId, (lastCount.get(last.stationId) ?? 0) + 1);
    leads.set(last.stationId, [
      ...(leads.get(last.stationId) ?? []),
      prepMinutes(sorted[1].doneAt, last.doneAt),
    ]);
  }

  const hourly: PerformanceData["hourly"] = {};
  const hourSet = new Set<number>();

  const stationStats: StationStats[] = stations.map((station) => {
    const own = tickets.filter((t) => t.stationId === station.id);
    const minutes = own.map((t) => prepMinutes(t.firedAt, t.doneAt));
    const items = own.reduce((sum, t) => sum + t.items, 0);

    const perHour = new Map<number, number[]>();
    for (const t of own) {
      const hour = t.firedAt.getHours();
      hourSet.add(hour);
      perHour.set(hour, [...(perHour.get(hour) ?? []), prepMinutes(t.firedAt, t.doneAt)]);
    }
    hourly[station.id] = {};
    const lateHours: number[] = [];
    for (const [hour, values] of perHour) {
      const avg = average(values)!;
      hourly[station.id][hour] = { tickets: values.length, avgMinutes: avg };
      if (values.length >= 3 && avg > station.targetMinutes) lateHours.push(hour);
    }

    // Live queue from the board itself, so it matches what the postes see.
    const open = liveOrders
      .filter((o) => o.status !== "READY")
      .map((o) =>
        o.items.filter(
          (i) => i.firedAt && !i.doneAt && i.workstationId === station.id && !isHeld(i, now)
        )
      )
      .filter((lines) => lines.length > 0);
    const ages = open.map((lines) =>
      Math.max(...lines.map((l) => (now - new Date(lineStart(l)).getTime()) / 60000))
    );

    return {
      id: station.id,
      name: station.name,
      targetMinutes: station.targetMinutes,
      staffCount: station.staffCount,
      syncWithOrder: station.syncWithOrder,
      live: {
        openTickets: open.length,
        openItems: open.flat().reduce((sum, l) => sum + l.quantity, 0),
        oldestMinutes: ages.length ? Math.max(...ages) : 0,
        lateTickets: ages.filter((age) => age >= station.targetMinutes).length,
      },
      period: {
        tickets: own.length,
        items,
        avgMinutes: average(minutes),
        p90Minutes: percentile(minutes, 0.9),
        onTimeRate: minutes.length
          ? minutes.filter((m) => m <= station.targetMinutes).length / minutes.length
          : null,
        volumeShare: totalItems ? items / totalItems : 0,
        lastFinisherCount: lastCount.get(station.id) ?? 0,
        avgLeadMinutes: average(leads.get(station.id) ?? []),
        lateHours,
      },
    };
  });

  const sendDelays: number[] = [];
  const handoverDelays: number[] = [];
  const orderDurations: number[] = [];
  for (const order of orders) {
    const done = order.items.map((i) => i.doneAt).filter((d): d is Date => Boolean(d));
    const fired = order.items.map((i) => i.firedAt!).filter(Boolean);
    if (done.length && done.length === order.items.length) {
      const lastDone = new Date(Math.max(...done.map((d) => d.getTime())));
      if (order.readyAt! >= lastDone) sendDelays.push(prepMinutes(lastDone, order.readyAt!));
    }
    if (fired.length) {
      const firstFired = new Date(Math.min(...fired.map((d) => d.getTime())));
      orderDurations.push(prepMinutes(firstFired, order.readyAt!));
    }
    if (order.completedAt) handoverDelays.push(prepMinutes(order.readyAt!, order.completedAt));
  }

  return {
    stats: {
      stations: stationStats,
      multiStationOrders,
      avgSendMinutes: average(sendDelays),
      avgHandoverMinutes: average(handoverDelays),
      unassignedMenuItems,
    },
    hourly,
    hours: [...hourSet].sort((a, b) => a - b),
    totalTickets: tickets.length,
    avgOrderMinutes: average(orderDurations),
    avgPlateWaitMinutes: average(plateWaits),
  };
}
