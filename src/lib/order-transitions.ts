import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/require-admin";
import { emitOrderEvent } from "@/lib/order-events";
import { sendOrderPushNotification } from "@/lib/push";
import { fireOrderItems, STATION_ACTIVE_STATUSES } from "@/lib/kitchen";
import { ORDER_STATUS_LABEL, type OrderStatus } from "@/lib/order-status";

// Server-side status changes shared by the cashier (app/actions/orders.ts) and
// the kitchen (app/actions/kitchen.ts). Deliberately not a "use server" file:
// setOrderStatus can jump to any status, so it must not be callable from the
// browser — each actions file exposes only the moves its screen is allowed.

// Give guests time to actually eat before asking them to rate the meal.
const FEEDBACK_REMINDER_DELAY_MS = 12 * 60 * 1000;

function scheduleFeedbackReminder(orderId: string, tableNumber: string) {
  setTimeout(() => {
    sendOrderPushNotification(orderId, {
      title: "Sindibad",
      body: "⭐ Comment était votre repas ? Donnez votre avis / كيف كانت وجبتكم؟ شاركونا رأيكم",
      url: `/feedback?table=${encodeURIComponent(tableNumber)}`,
    }).catch(() => {});
  }, FEEDBACK_REMINDER_DELAY_MS);
}

async function awardLoyaltyPoints(
  orderId: string,
  customerId: string,
  total: number,
  staffId: string
) {
  const points = Math.floor(total);
  if (points <= 0) return;

  await prisma.$transaction(async (tx) => {
    const alreadyAwarded = await tx.pointsTransaction.findFirst({
      where: { orderId },
    });
    if (alreadyAwarded) return;

    await tx.customer.update({
      where: { id: customerId },
      data: { points: { increment: points } },
    });
    await tx.pointsTransaction.create({
      data: {
        customerId,
        points,
        orderTotal: total,
        orderId,
        createdById: staffId,
        note: "Points automatiques - commande confirmée",
      },
    });
  });
}

export async function setOrderStatus(orderId: string, status: OrderStatus) {
  const staff = await requireStaff();

  const order = await prisma.$transaction(async (tx) => {
    const updated = await tx.order.update({
      where: { id: orderId },
      data: {
        status,
        ...(status === "READY" ? { readyAt: new Date() } : {}),
        ...(status === "COMPLETED" ? { completedAt: new Date() } : {}),
      },
    });
    // Confirmation is what puts the order on the poste screens.
    if (STATION_ACTIVE_STATUSES.includes(status)) {
      await fireOrderItems(tx, orderId);
    }
    return updated;
  });

  if (status === "CONFIRMED" && order.customerId) {
    await awardLoyaltyPoints(order.id, order.customerId, order.total, staff.id);
  }

  emitOrderEvent({
    orderId: order.id,
    tableNumber: order.tableNumber,
    status: order.status as OrderStatus,
    kind: "status_changed",
  });

  const label = ORDER_STATUS_LABEL[order.status as OrderStatus];
  await sendOrderPushNotification(order.id, {
    title: "Sindibad",
    body: `${label.emoji} ${label.fr} / ${label.ar}`,
  });

  if (status === "COMPLETED") {
    scheduleFeedbackReminder(order.id, order.tableNumber);
  }

  revalidatePath("/admin/orders");
  revalidatePath("/admin/kitchen", "layout");
  revalidatePath("/admin/loyalty");
}
