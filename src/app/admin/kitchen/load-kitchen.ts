import { prisma } from "@/lib/prisma";
import { KITCHEN_STATUSES, type OrderStatus } from "@/lib/order-status";
import type { KdsOrder, KdsStation } from "./kds-types";

export async function loadKitchenStations(): Promise<KdsStation[]> {
  const workstations = await prisma.workstation.findMany({
    orderBy: [{ kitchen: { sortOrder: "asc" } }, { sortOrder: "asc" }],
    select: { id: true, name: true, targetMinutes: true, staffCount: true, syncWithOrder: true },
  });
  return workstations;
}

// Everything a kitchen screen renders, stamped with the time it was loaded so
// the client's timers hydrate from the same clock the server used.
export async function loadKitchenBoard() {
  const [stations, orders] = await Promise.all([
    loadKitchenStations(),
    loadKitchenOrders(),
  ]);
  return { stations, orders, renderedAt: Date.now() };
}

// Every order the kitchen is working on, with its fired lines.
export async function loadKitchenOrders(): Promise<KdsOrder[]> {
  const orders = await prisma.order.findMany({
    where: { status: { in: KITCHEN_STATUSES } },
    orderBy: { createdAt: "asc" },
    include: { items: { orderBy: { createdAt: "asc" } } },
  });

  return orders.map((order) => ({
    id: order.id,
    number: order.number,
    tableNumber: order.tableNumber,
    guestName: order.guestName,
    note: order.note,
    status: order.status as OrderStatus,
    createdAt: order.createdAt.toISOString(),
    readyAt: order.readyAt?.toISOString() ?? null,
    rushedAt: order.rushedAt?.toISOString() ?? null,
    items: order.items.map((item) => ({
      id: item.id,
      nameAr: item.nameAr,
      nameFr: item.nameFr,
      size: item.size,
      optionsAr: item.optionsAr,
      optionsFr: item.optionsFr,
      quantity: item.quantity,
      confirmed: item.confirmed,
      workstationId: item.workstationId,
      firedAt: item.firedAt?.toISOString() ?? null,
      holdUntil: item.holdUntil?.toISOString() ?? null,
      startedAt: item.startedAt?.toISOString() ?? null,
      doneAt: item.doneAt?.toISOString() ?? null,
    })),
  }));
}
