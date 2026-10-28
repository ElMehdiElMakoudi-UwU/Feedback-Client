"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/require-admin";
import { emitOrderEvent } from "@/lib/order-events";
import { resolveOptions } from "@/lib/menu-options";
import { fireOrderItems, STATION_ACTIVE_STATUSES } from "@/lib/kitchen";
import { setOrderStatus } from "@/lib/order-transitions";
import { canAddItemsToOrder, type OrderStatus } from "@/lib/order-status";
import { DELIVERY_TABLE_VALUE, TAKEAWAY_TABLE_VALUE } from "@/lib/order-mode";

const phoneRegex = /^[0-9+\s-]{8,20}$/;

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

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

// Daily ticket number for the pickup display, restarting at 1 each morning.
async function nextDailyOrderNumber(tx: Tx) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const lastToday = await tx.order.aggregate({
    where: { createdAt: { gte: todayStart } },
    _max: { number: true },
  });
  return (lastToday._max.number ?? 0) + 1;
}

// No 0/O or 1/I/L: drivers may type the code from the WhatsApp message by hand.
const TRACKING_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const TRACKING_CODE_LENGTH = 5;

function randomTrackingCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(TRACKING_CODE_LENGTH));
  return Array.from(bytes, (b) => TRACKING_ALPHABET[b % TRACKING_ALPHABET.length]).join("");
}

async function uniqueTrackingCode() {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = randomTrackingCode();
    const taken = await prisma.order.findUnique({
      where: { trackingCode: code },
      select: { id: true },
    });
    if (!taken) return code;
  }
  throw new Error("Could not generate a tracking code");
}

const whatsAppOrderSchema = z.object({
  mode: z.enum(["DELIVERY", "TAKEAWAY"]),
  guestName: z.string().trim().max(60).optional().or(z.literal("")),
  contactPhone: z
    .string()
    .trim()
    .regex(phoneRegex, "Numéro WhatsApp invalide")
    .optional()
    .or(z.literal("")),
  address: z.string().trim().max(300).optional().or(z.literal("")),
  note: z.string().trim().max(500).optional().or(z.literal("")),
  items: placeOrderSchema.shape.items,
});

export type WhatsAppOrderInput = z.infer<typeof whatsAppOrderSchema>;

export type WhatsAppOrderState =
  | {
      status: "ok";
      orderId: string;
      number: number;
      trackingCode: string;
      contactPhone: string | null;
      total: number;
    }
  | { status: "error"; message: string };

// Staff typing in an order received on WhatsApp (usually from a delivery
// driver). The order skips the cashier's "new order" step — staff wrote it
// themselves — and goes straight to the kitchen. The driver gets a short
// tracking code instead of the order id, so tickets can't be guessed.
export async function placeWhatsAppOrder(
  input: WhatsAppOrderInput
): Promise<WhatsAppOrderState> {
  await requireStaff();

  const parsed = whatsAppOrderSchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Commande invalide",
    };
  }

  const { mode, guestName, contactPhone, address, note, items } = parsed.data;

  const built = await buildLineItems(items);
  if (!built.ok) return { status: "error", message: built.message };
  const lineItems = built.lineItems;

  const total = lineItems.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  );

  const trackingCode = await uniqueTrackingCode();

  const order = await prisma.$transaction(async (tx) =>
    tx.order.create({
      data: {
        number: await nextDailyOrderNumber(tx),
        tableNumber: mode === "DELIVERY" ? DELIVERY_TABLE_VALUE : TAKEAWAY_TABLE_VALUE,
        source: "WHATSAPP",
        trackingCode,
        guestName: guestName || null,
        contactPhone: contactPhone || null,
        deliveryAddress: address || null,
        note: note || null,
        total,
        items: { create: lineItems },
      },
    })
  );

  emitOrderEvent({
    orderId: order.id,
    tableNumber: order.tableNumber,
    status: order.status as OrderStatus,
    kind: "created",
  });

  // Fires the items to the postes, notifies screens and revalidates.
  await setOrderStatus(order.id, "CONFIRMED");

  return {
    status: "ok",
    orderId: order.id,
    number: order.number!,
    trackingCode,
    contactPhone: order.contactPhone,
    total,
  };
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
        number: await nextDailyOrderNumber(tx),
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
  const needsConfirmation = order.status !== "SENT";

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

// The front-of-house steps only: confirm a new order, and hand over one the
// passe has sent. Cooking and "ready" belong to the kitchen screens, so an
// order can't be marked ready from the cashier's board while still cooking.
const CASHIER_TRANSITIONS: Partial<Record<OrderStatus, OrderStatus>> = {
  SENT: "CONFIRMED",
  READY: "COMPLETED",
};

export async function advanceOrderStatus(orderId: string) {
  await requireStaff();
  // Trust the database, not the screen: the order may have moved since it rendered.
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { status: true },
  });
  const next = order && CASHIER_TRANSITIONS[order.status as OrderStatus];
  if (!next) return;
  await setOrderStatus(orderId, next);
}

export async function cancelOrder(orderId: string) {
  await setOrderStatus(orderId, "CANCELLED");
}

export async function confirmNewItems(orderId: string) {
  await requireStaff();

  const order = await prisma.$transaction(async (tx) => {
    const updated = await tx.order.update({
      where: { id: orderId },
      data: { items: { updateMany: { where: { confirmed: false }, data: { confirmed: true } } } },
    });
    // Additions to an order the kitchen is already working on go straight to the postes.
    if (STATION_ACTIVE_STATUSES.includes(updated.status)) {
      await fireOrderItems(tx, orderId);
    }
    return updated;
  });

  emitOrderEvent({
    orderId: order.id,
    tableNumber: order.tableNumber,
    status: order.status as OrderStatus,
    kind: "items_confirmed",
  });

  revalidatePath("/admin/orders");
  revalidatePath("/admin/kitchen", "layout");
}
