"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/require-admin";
import { emitOrderEvent } from "@/lib/order-events";
import { sendOrderPushNotification } from "@/lib/push";
import { resolveOptions } from "@/lib/menu-options";
import {
  nextOrderStatus,
  canAddItemsToOrder,
  ORDER_STATUS_LABEL,
  type OrderStatus,
} from "@/lib/order-status";

const phoneRegex = /^[0-9+\s-]{8,20}$/;

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

const placeOrderSchema = z.object({
  tableNumber: z.string().trim().min(1, "Table number is required").max(20),
  guestName: z.string().trim().max(60).optional().or(z.literal("")),
  phone: z
    .string()
    .trim()
    .regex(phoneRegex, "Enter a valid phone number")
    .optional()
    .or(z.literal("")),
  address: z.string().trim().max(300).optional().or(z.literal("")),
  note: z.string().trim().max(500).optional().or(z.literal("")),
  items: z
    .array(
      z.object({
        menuItemId: z.string().min(1),
        size: z.enum(["REGULAR", "LARGE"]).optional(),
        optionIds: z.array(z.string().min(1)).max(30).optional(),
        quantity: z.coerce.number().int().min(1).max(50),
      })
    )
    .min(1, "Add at least one item"),
});

export type PlaceOrderInput = z.infer<typeof placeOrderSchema>;

export type PlaceOrderState =
  | { status: "idle" }
  | { status: "error"; message: string };

const addOrderItemsSchema = z.object({
  orderId: z.string().min(1),
  tableNumber: z.string().trim().min(1).max(20),
  items: z
    .array(
      z.object({
        menuItemId: z.string().min(1),
        size: z.enum(["REGULAR", "LARGE"]).optional(),
        optionIds: z.array(z.string().min(1)).max(30).optional(),
        quantity: z.coerce.number().int().min(1).max(50),
      })
    )
    .min(1, "Add at least one item"),
});

export type AddOrderItemsInput = z.infer<typeof addOrderItemsSchema>;

export type AddOrderItemsState =
  | { status: "idle" }
  | { status: "error"; message: string };


type RequestedItem = PlaceOrderInput["items"][number];

type LineItem = {
  menuItemId: string;
  nameAr: string;
  nameFr: string;
  size: string | null;
  optionsAr: string | null;
  optionsFr: string | null;
  unitPrice: number;
  quantity: number;
};

// Prices always come from the database, never from the client.
async function buildLineItems(
  items: RequestedItem[]
): Promise<{ ok: true; lineItems: LineItem[] } | { ok: false; message: string }> {
  const menuItems = await prisma.menuItem.findMany({
    where: { id: { in: items.map((item) => item.menuItemId) }, available: true },
    include: {
      optionGroups: {
        orderBy: { sortOrder: "asc" },
        include: {
          options: { where: { available: true }, orderBy: { sortOrder: "asc" } },
        },
      },
    },
  });
  const menuItemById = new Map(menuItems.map((item) => [item.id, item]));

  const lineItems: LineItem[] = [];
  for (const item of items) {
    const menuItem = menuItemById.get(item.menuItemId);
    if (!menuItem) {
      return { ok: false, message: "One of the items is no longer available" };
    }

    const basePrice =
      item.size === "LARGE" ? menuItem.priceLarge : menuItem.price;
    if (basePrice == null) {
      return { ok: false, message: "One of the items has no price set" };
    }

    // A group whose options are all switched off is skipped, same as on the menu.
    const options = resolveOptions(
      menuItem.optionGroups.filter((group) => group.options.length > 0),
      item.optionIds ?? []
    );
    if (!options.ok) {
      return {
        ok: false,
        message:
          options.reason === "unknown"
            ? "One of the chosen options is no longer available"
            : "Please review the options for " + menuItem.nameFr,
      };
    }

    lineItems.push({
      menuItemId: menuItem.id,
      nameAr: menuItem.nameAr,
      nameFr: menuItem.nameFr,
      size: item.size ?? null,
      optionsAr: options.labelAr,
      optionsFr: options.labelFr,
      unitPrice: Math.max(0, basePrice + options.priceDelta),
      quantity: item.quantity,
    });
  }

  return { ok: true, lineItems };
}

export async function placeOrder(
  input: PlaceOrderInput
): Promise<PlaceOrderState> {
  const parsed = placeOrderSchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Invalid order",
    };
  }

  const { tableNumber, guestName, phone, address, note, items } = parsed.data;

  const built = await buildLineItems(items);
  if (!built.ok) return { status: "error", message: built.message };
  const lineItems = built.lineItems;

  const total = lineItems.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  );

  let customerId: string | undefined;
  if (phone) {
    const customer = await prisma.customer.upsert({
      where: { phone },
      update: {},
      create: { phone },
    });
    customerId = customer.id;
  }

  const order = await prisma.$transaction(async (tx) => {
    return tx.order.create({
      data: {
        tableNumber,
        guestName: guestName || null,
        deliveryAddress: address || null,
        note: note || null,
        total,
        customerId,
        items: { create: lineItems },
      },
    });
  });

  emitOrderEvent({
    orderId: order.id,
    tableNumber: order.tableNumber,
    status: order.status as OrderStatus,
    kind: "created",
  });

  revalidatePath("/admin/orders");
  redirect(`/order/${encodeURIComponent(tableNumber)}/confirmation/${order.id}`);
}

export async function addItemsToOrder(
  input: AddOrderItemsInput
): Promise<AddOrderItemsState> {
  const parsed = addOrderItemsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Invalid order",
    };
  }

  const { orderId, tableNumber, items } = parsed.data;

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || order.tableNumber !== tableNumber) {
    return { status: "error", message: "Order not found" };
  }
  if (!canAddItemsToOrder(order.status as OrderStatus)) {
    return {
      status: "error",
      message: "This order no longer accepts changes",
    };
  }

  const built = await buildLineItems(items);
  if (!built.ok) return { status: "error", message: built.message };
  const lineItems = built.lineItems;

  const addedTotal = lineItems.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  );

  // Items added after a cashier already confirmed the order need a separate
  // re-confirmation, without un-confirming the order itself in front of the
  // customer (that would revert their "confirmed" status screen/notification).
  const needsConfirmation = order.status === "CONFIRMED";

  await prisma.$transaction(async (tx) => {
    await tx.orderItem.createMany({
      data: lineItems.map((line) => ({
        ...line,
        orderId,
        confirmed: !needsConfirmation,
      })),
    });
    await tx.order.update({
      where: { id: orderId },
      data: { total: { increment: addedTotal } },
    });
  });

  emitOrderEvent({
    orderId: order.id,
    tableNumber: order.tableNumber,
    status: order.status as OrderStatus,
    kind: "items_added",
  });

  revalidatePath("/admin/orders");
  redirect(`/order/${encodeURIComponent(tableNumber)}/confirmation/${orderId}`);
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

async function setOrderStatus(orderId: string, status: OrderStatus) {
  const staff = await requireStaff();

  const order = await prisma.order.update({
    where: { id: orderId },
    data: { status },
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
  revalidatePath("/admin/loyalty");
}

const pushSubscriptionSchema = z.object({
  orderId: z.string().min(1),
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export async function subscribeToOrderPush(
  input: z.infer<typeof pushSubscriptionSchema>
) {
  const parsed = pushSubscriptionSchema.safeParse(input);
  if (!parsed.success) return { status: "error" as const };

  const { orderId, endpoint, keys } = parsed.data;

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return { status: "error" as const };

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    update: { orderId, p256dh: keys.p256dh, auth: keys.auth },
    create: { orderId, endpoint, p256dh: keys.p256dh, auth: keys.auth },
  });

  return { status: "ok" as const };
}

export async function advanceOrderStatus(orderId: string, current: OrderStatus) {
  const next = nextOrderStatus(current);
  if (!next) return;
  await setOrderStatus(orderId, next);
}

export async function cancelOrder(orderId: string) {
  await setOrderStatus(orderId, "CANCELLED");
}

export async function confirmNewItems(orderId: string) {
  await requireStaff();

  const order = await prisma.order.update({
    where: { id: orderId },
    data: { items: { updateMany: { where: { confirmed: false }, data: { confirmed: true } } } },
  });

  emitOrderEvent({
    orderId: order.id,
    tableNumber: order.tableNumber,
    status: order.status as OrderStatus,
    kind: "items_confirmed",
  });

  revalidatePath("/admin/orders");
}
