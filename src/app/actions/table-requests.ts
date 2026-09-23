"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/require-admin";
import { emitTableRequestEvent } from "@/lib/order-events";
import { isDeliveryTable, isTakeawayTable } from "@/lib/order-mode";
import {
  PAYMENT_METHODS,
  TABLE_REQUEST_REUSE_WINDOW_MS,
  TABLE_REQUEST_TYPES,
  type PaymentMethod,
  type TableRequestStatus,
  type TableRequestType,
} from "@/lib/table-requests";

const createTableRequestSchema = z
  .object({
    tableNumber: z.string().trim().min(1).max(20),
    type: z.enum(TABLE_REQUEST_TYPES),
    paymentMethod: z.enum(PAYMENT_METHODS).optional(),
  })
  .refine((input) => input.type === "BILL" || !input.paymentMethod, {
    message: "Payment method only applies to bill requests",
  });

export type CreateTableRequestState =
  | { status: "ok"; requestId: string }
  | { status: "error"; message: string };

function emitRequest(request: {
  id: string;
  tableNumber: string;
  type: string;
  paymentMethod: string | null;
  status: string;
}) {
  emitTableRequestEvent({
    requestId: request.id,
    tableNumber: request.tableNumber,
    type: request.type as TableRequestType,
    paymentMethod: request.paymentMethod as PaymentMethod | null,
    status: request.status as TableRequestStatus,
  });
}

export async function createTableRequest(
  input: z.infer<typeof createTableRequestSchema>
): Promise<CreateTableRequestState> {
  const parsed = createTableRequestSchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Invalid request",
    };
  }

  const { tableNumber, type, paymentMethod } = parsed.data;
  if (isTakeawayTable(tableNumber) || isDeliveryTable(tableNumber)) {
    return { status: "error", message: "Only available at a table" };
  }

  // Repeated taps reuse the open request instead of flooding the staff board.
  const existing = await prisma.tableRequest.findFirst({
    where: {
      tableNumber,
      type,
      status: "PENDING",
      createdAt: { gte: new Date(Date.now() - TABLE_REQUEST_REUSE_WINDOW_MS) },
    },
    orderBy: { createdAt: "desc" },
  });

  if (existing) {
    if (type === "BILL" && paymentMethod && existing.paymentMethod !== paymentMethod) {
      const updated = await prisma.tableRequest.update({
        where: { id: existing.id },
        data: { paymentMethod },
      });
      emitRequest(updated);
      revalidatePath("/admin/orders");
    }
    return { status: "ok", requestId: existing.id };
  }

  const request = await prisma.tableRequest.create({
    data: { tableNumber, type, paymentMethod: paymentMethod ?? null },
  });

  emitRequest(request);
  revalidatePath("/admin/orders");
  return { status: "ok", requestId: request.id };
}

export async function resolveTableRequest(requestId: string) {
  await requireStaff();

  const request = await prisma.tableRequest.findUnique({
    where: { id: requestId },
  });
  if (!request || request.status !== "PENDING") return;

  const resolved = await prisma.tableRequest.update({
    where: { id: requestId },
    data: { status: "DONE", resolvedAt: new Date() },
  });

  emitRequest(resolved);
  revalidatePath("/admin/orders");
}
