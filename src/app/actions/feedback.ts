"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getISOWeekKey } from "@/lib/week";
import { requireAdmin } from "@/lib/require-admin";
import { emitTableRequestEvent } from "@/lib/order-events";
import { isDeliveryTable, isTakeawayTable } from "@/lib/order-mode";
import {
  isLowRating,
  RECOVERY_STATUSES,
  ROOT_CAUSES,
} from "@/lib/recovery";

const phoneRegex = /^[0-9+\s-]{8,20}$/;

const itemRatingSchema = z.object({
  menuItemId: z.string().min(1),
  rating: z.coerce.number().int().min(1).max(5),
});

const feedbackSchema = z
  .object({
    tableNumber: z.string().trim().min(1, "Table number is required").max(20),
    foodRating: z.coerce.number().int().min(1).max(5),
    serviceRating: z.coerce.number().int().min(1).max(5),
    comment: z.string().trim().max(1000).optional(),
    enteredDraw: z.coerce.boolean().optional(),
    requestManager: z.coerce.boolean().optional(),
    contactConsent: z.coerce.boolean().optional(),
    phone: z
      .string()
      .trim()
      .regex(phoneRegex, "Enter a valid phone number")
      .optional()
      .or(z.literal("")),
    itemRatings: z.array(itemRatingSchema).max(50).optional(),
  })
  .refine((data) => !data.enteredDraw || !!data.phone, {
    message: "A phone number is required to enter the draw",
    path: ["phone"],
  })
  .refine((data) => !data.contactConsent || !!data.phone, {
    message: "A phone number is required so we can contact you",
    path: ["phone"],
  });

export type FeedbackFormState = {
  status: "idle" | "success" | "error";
  message?: string;
  enteredDraw?: boolean;
  managerRequested?: boolean;
  contactConsent?: boolean;
};

export type RateableMenuItem = {
  menuItemId: string;
  nameAr: string;
  nameFr: string;
};

// Recent orders for the table (last 6h) tell us which dishes to prompt the
// guest to rate, so item ratings stay tied to what they actually ate.
export async function getRecentOrderItems(
  tableNumber: string
): Promise<RateableMenuItem[]> {
  if (!tableNumber.trim()) return [];

  const since = new Date(Date.now() - 6 * 60 * 60 * 1000);
  const orders = await prisma.order.findMany({
    where: {
      tableNumber,
      status: { not: "CANCELLED" },
      createdAt: { gte: since },
    },
    include: { items: true },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  const seen = new Map<string, RateableMenuItem>();
  for (const order of orders) {
    for (const item of order.items) {
      if (!item.menuItemId || seen.has(item.menuItemId)) continue;
      seen.set(item.menuItemId, {
        menuItemId: item.menuItemId,
        nameAr: item.nameAr,
        nameFr: item.nameFr,
      });
    }
  }

  return Array.from(seen.values());
}

export async function submitFeedback(
  _prevState: FeedbackFormState,
  formData: FormData
): Promise<FeedbackFormState> {
  let itemRatings: { menuItemId: string; rating: number }[] | undefined;
  const rawItemRatings = formData.get("itemRatings");
  if (typeof rawItemRatings === "string" && rawItemRatings.trim()) {
    try {
      itemRatings = JSON.parse(rawItemRatings);
    } catch {
      return { status: "error", message: "Invalid item ratings" };
    }
  }

  const parsed = feedbackSchema.safeParse({
    tableNumber: formData.get("tableNumber"),
    foodRating: formData.get("foodRating"),
    serviceRating: formData.get("serviceRating"),
    comment: formData.get("comment") || undefined,
    enteredDraw: formData.get("enteredDraw") === "on" || undefined,
    requestManager: formData.get("requestManager") === "on" || undefined,
    contactConsent: formData.get("contactConsent") === "on" || undefined,
    phone: formData.get("phone") || undefined,
    itemRatings,
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Invalid submission",
    };
  }

  const enteredDraw = parsed.data.enteredDraw ?? false;

  // De-duplicate by menuItemId in case of a tampered/duplicated payload;
  // the DB has a unique(feedbackId, menuItemId) constraint that would
  // otherwise reject the whole createMany batch.
  const uniqueItemRatings = parsed.data.itemRatings
    ? Array.from(
        new Map(
          parsed.data.itemRatings.map((r) => [r.menuItemId, r])
        ).values()
      )
    : [];

  const validMenuItemIds = uniqueItemRatings.length
    ? new Set(
        (
          await prisma.menuItem.findMany({
            where: { id: { in: uniqueItemRatings.map((r) => r.menuItemId) } },
            select: { id: true },
          })
        ).map((m) => m.id)
      )
    : new Set<string>();

  const itemRatingsToCreate = uniqueItemRatings.filter((r) =>
    validMenuItemIds.has(r.menuItemId)
  );

  const { tableNumber } = parsed.data;
  const lowRating = isLowRating([
    parsed.data.foodRating,
    parsed.data.serviceRating,
    ...itemRatingsToCreate.map((r) => r.rating),
  ]);
  // Recovery options only apply to low ratings, and a manager can only be
  // sent to a real table (not takeaway/delivery).
  const contactConsent = lowRating && (parsed.data.contactConsent ?? false);
  const managerRequested =
    lowRating &&
    (parsed.data.requestManager ?? false) &&
    !isTakeawayTable(tableNumber) &&
    !isDeliveryTable(tableNumber);

  const feedback = await prisma.feedback.create({
    data: {
      tableNumber,
      foodRating: parsed.data.foodRating,
      serviceRating: parsed.data.serviceRating,
      comment: parsed.data.comment,
      enteredDraw,
      phone: enteredDraw || contactConsent ? parsed.data.phone : null,
      weekKey: enteredDraw ? getISOWeekKey(new Date()) : null,
      recoveryStatus: lowRating ? "OPEN" : null,
      managerRequested,
      contactConsent,
      itemRatings: itemRatingsToCreate.length
        ? { create: itemRatingsToCreate }
        : undefined,
      tableRequest: managerRequested
        ? { create: { tableNumber, type: "MANAGER" } }
        : undefined,
    },
    include: { tableRequest: true },
  });

  if (feedback.tableRequest) {
    emitTableRequestEvent({
      requestId: feedback.tableRequest.id,
      tableNumber,
      type: "MANAGER",
      paymentMethod: null,
      status: "PENDING",
    });
    revalidatePath("/admin/orders");
  }
  if (lowRating) revalidatePath("/admin/feedback/recovery");

  return { status: "success", enteredDraw, managerRequested, contactConsent };
}

const recoveryUpdateSchema = z.object({
  feedbackId: z.string().min(1),
  status: z.enum(RECOVERY_STATUSES),
  rootCause: z.enum(ROOT_CAUSES).nullable(),
  note: z.string().trim().max(1000).nullable(),
});

export type RecoveryUpdateState =
  | { status: "ok" }
  | { status: "error"; message: string };

export async function updateRecoveryCase(
  input: z.infer<typeof recoveryUpdateSchema>
): Promise<RecoveryUpdateState> {
  const admin = await requireAdmin();

  const parsed = recoveryUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Invalid update",
    };
  }

  const { feedbackId, status, rootCause, note } = parsed.data;
  const existing = await prisma.feedback.findUnique({
    where: { id: feedbackId },
    select: { recoveryStatus: true },
  });
  if (!existing?.recoveryStatus) {
    return { status: "error", message: "Recovery case not found" };
  }

  const statusChanged = existing.recoveryStatus !== status;
  await prisma.feedback.update({
    where: { id: feedbackId },
    data: {
      recoveryStatus: status,
      rootCause,
      recoveryNote: note || null,
      ...(statusChanged && {
        handledById: status === "OPEN" ? null : admin.id,
        handledAt: status === "OPEN" ? null : new Date(),
      }),
    },
  });

  revalidatePath("/admin/feedback/recovery");
  return { status: "ok" };
}
