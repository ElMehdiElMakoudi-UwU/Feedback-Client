"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/require-admin";
import { emitOrderEvent } from "@/lib/order-events";
import {
  nextOrderStatus,
  canAddItemsToOrder,
  type OrderStatus,
} from "@/lib/order-status";

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
        quantity: z.coerce.number().int().min(1).max(50),
      })
    )
    .min(1, "Add at least one item"),
});

export type AddOrderItemsInput = z.infer<typeof addOrderItemsSchema>;

export type AddOrderItemsState =
  | { status: "idle" }
  | { status: "error"; message: string };


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

  const menuItems = await prisma.menuItem.findMany({
    where: { id: { in: items.map((item) => item.menuItemId) }, available: true },
  });
  const menuItemById = new Map(menuItems.map((item) => [item.id, item]));

  const lineItems: {
    menuItemId: string;
    nameAr: string;
    nameFr: string;
    size: string | null;
    unitPrice: number;
    quantity: number;
  }[] = [];

  for (const item of items) {
    const menuItem = menuItemById.get(item.menuItemId);
    if (!menuItem) {
      return { status: "error", message: "One of the items is no longer available" };
    }

    const unitPrice =
      item.size === "LARGE" ? menuItem.priceLarge : menuItem.price;
    if (unitPrice == null) {
      return { status: "error", message: "One of the items has no price set" };
    }

    lineItems.push({
      menuItemId: menuItem.id,
      nameAr: menuItem.nameAr,
      nameFr: menuItem.nameFr,
      size: item.size ?? null,
      unitPrice,
      quantity: item.quantity,
    });
  }

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

  const menuItems = await prisma.menuItem.findMany({
    where: { id: { in: items.map((item) => item.menuItemId) }, available: true },
  });
  const menuItemById = new Map(menuItems.map((item) => [item.id, item]));

  const lineItems: {
    menuItemId: string;
    nameAr: string;
    nameFr: string;
    size: string | null;
    unitPrice: number;
    quantity: number;
  }[] = [];

  for (const item of items) {
    const menuItem = menuItemById.get(item.menuItemId);
    if (!menuItem) {
      return { status: "error", message: "One of the items is no longer available" };
    }

    const unitPrice =
      item.size === "LARGE" ? menuItem.priceLarge : menuItem.price;
    if (unitPrice == null) {
      return { status: "error", message: "One of the items has no price set" };
    }

    lineItems.push({
      menuItemId: menuItem.id,
      nameAr: menuItem.nameAr,
      nameFr: menuItem.nameFr,
      size: item.size ?? null,
      unitPrice,
      quantity: item.quantity,
    });
  }

  const addedTotal = lineItems.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  );

  await prisma.$transaction(async (tx) => {
    await tx.orderItem.createMany({
      data: lineItems.map((line) => ({ ...line, orderId })),
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

  revalidatePath("/admin/orders");
  revalidatePath("/admin/loyalty");
}

export async function advanceOrderStatus(orderId: string, current: OrderStatus) {
  const next = nextOrderStatus(current);
  if (!next) return;
  await setOrderStatus(orderId, next);
}

export async function cancelOrder(orderId: string) {
  await setOrderStatus(orderId, "CANCELLED");
}
