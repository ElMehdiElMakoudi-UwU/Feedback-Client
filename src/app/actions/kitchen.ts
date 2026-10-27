"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireStaff } from "@/lib/require-admin";
import { emitOrderEvent } from "@/lib/order-events";
import { STATION_ACTIVE_STATUSES } from "@/lib/kitchen";
import { setOrderStatus } from "@/lib/order-transitions";
import type { OrderStatus } from "@/lib/order-status";

// Items whose menu item has no poste are prepared by the passe itself; the
// screens address them with this id instead of a workstation id.
const NO_STATION = "none";

const ticketSchema = z.object({
  orderId: z.string().min(1),
  workstationId: z.string().min(1),
});

function stationFilter(workstationId: string) {
  return workstationId === NO_STATION ? null : workstationId;
}

async function loadActiveOrder(orderId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || !STATION_ACTIVE_STATUSES.includes(order.status)) return null;
  return order;
}

async function afterKitchenChange(order: { id: string; tableNumber: string; status: string }) {
  // The first poste to start cooking moves the order to "preparing" for the
  // customer; setOrderStatus also notifies them.
  if (order.status === "CONFIRMED") {
    await setOrderStatus(order.id, "PREPARING");
  } else {
    emitOrderEvent({
      orderId: order.id,
      tableNumber: order.tableNumber,
      status: order.status as OrderStatus,
      kind: "kitchen_progress",
    });
  }
  revalidatePath("/admin/kitchen", "layout");
}

export async function startStationTicket(orderId: string, workstationId: string) {
  await requireStaff();
  const parsed = ticketSchema.safeParse({ orderId, workstationId });
  if (!parsed.success) return;
  const order = await loadActiveOrder(parsed.data.orderId);
  if (!order) return;

  await prisma.orderItem.updateMany({
    where: {
      orderId: order.id,
      workstationId: stationFilter(parsed.data.workstationId),
      firedAt: { not: null },
      startedAt: null,
      doneAt: null,
    },
    data: { startedAt: new Date() },
  });
  await afterKitchenChange(order);
}

// The poste is done with its part of this order ("bump").
export async function bumpStationTicket(orderId: string, workstationId: string) {
  await requireStaff();
  const parsed = ticketSchema.safeParse({ orderId, workstationId });
  if (!parsed.success) return;
  const order = await loadActiveOrder(parsed.data.orderId);
  if (!order) return;

  const now = new Date();
  const where = {
    orderId: order.id,
    workstationId: stationFilter(parsed.data.workstationId),
    firedAt: { not: null },
    doneAt: null,
  };
  await prisma.$transaction([
    prisma.orderItem.updateMany({
      where: { ...where, startedAt: null },
      data: { startedAt: now },
    }),
    prisma.orderItem.updateMany({ where, data: { doneAt: now } }),
  ]);
  await afterKitchenChange(order);
}

// Undo a bump made by mistake, while the passe hasn't sent the order yet.
export async function recallStationTicket(orderId: string, workstationId: string) {
  await requireStaff();
  const parsed = ticketSchema.safeParse({ orderId, workstationId });
  if (!parsed.success) return;
  const order = await loadActiveOrder(parsed.data.orderId);
  if (!order) return;

  await prisma.orderItem.updateMany({
    where: {
      orderId: order.id,
      workstationId: stationFilter(parsed.data.workstationId),
      doneAt: { not: null },
    },
    data: { doneAt: null },
  });
  await afterKitchenChange(order);
}

// The passe sends the plate out: the order becomes ready for the customer,
// even if a poste forgot to bump its part.
export async function sendOrderFromPasse(orderId: string) {
  await requireStaff();
  const order = await loadActiveOrder(orderId);
  if (!order) return;

  await setOrderStatus(order.id, "READY");
}

// The passe flags an order as urgent on every poste still working on it.
export async function toggleRushOrder(orderId: string) {
  await requireStaff();
  const order = await loadActiveOrder(orderId);
  if (!order) return;

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: { rushedAt: order.rushedAt ? null : new Date() },
  });
  emitOrderEvent({
    orderId: updated.id,
    tableNumber: updated.tableNumber,
    status: updated.status as OrderStatus,
    kind: "kitchen_progress",
  });
  revalidatePath("/admin/kitchen", "layout");
}

const workstationSettingsSchema = z.object({
  workstationId: z.string().min(1),
  targetMinutes: z.coerce.number().int().min(1).max(120).optional(),
  staffCount: z.coerce.number().int().min(0).max(20).optional(),
  syncWithOrder: z.boolean().optional(),
});

export async function updateWorkstationKitchenSettings(
  input: z.infer<typeof workstationSettingsSchema>
) {
  await requireAdmin();
  const parsed = workstationSettingsSchema.safeParse(input);
  if (!parsed.success) return;
  const { workstationId, ...data } = parsed.data;

  await prisma.workstation.update({ where: { id: workstationId }, data });
  revalidatePath("/admin/kitchen", "layout");
}
