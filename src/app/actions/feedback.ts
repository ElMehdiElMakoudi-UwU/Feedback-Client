"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getISOWeekKey } from "@/lib/week";

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
  });

export type FeedbackFormState = {
  status: "idle" | "success" | "error";
  message?: string;
  enteredDraw?: boolean;
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

  await prisma.feedback.create({
    data: {
      tableNumber: parsed.data.tableNumber,
      foodRating: parsed.data.foodRating,
      serviceRating: parsed.data.serviceRating,
      comment: parsed.data.comment,
      enteredDraw,
      phone: enteredDraw ? parsed.data.phone : null,
      weekKey: enteredDraw ? getISOWeekKey(new Date()) : null,
      itemRatings: itemRatingsToCreate.length
        ? { create: itemRatingsToCreate }
        : undefined,
    },
  });

  return { status: "success", enteredDraw };
}
