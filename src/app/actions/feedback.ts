"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getISOWeekKey } from "@/lib/week";

const phoneRegex = /^[0-9+\s-]{8,20}$/;

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

export async function submitFeedback(
  _prevState: FeedbackFormState,
  formData: FormData
): Promise<FeedbackFormState> {
  const parsed = feedbackSchema.safeParse({
    tableNumber: formData.get("tableNumber"),
    foodRating: formData.get("foodRating"),
    serviceRating: formData.get("serviceRating"),
    comment: formData.get("comment") || undefined,
    enteredDraw: formData.get("enteredDraw") === "on" || undefined,
    phone: formData.get("phone") || undefined,
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Invalid submission",
    };
  }

  const enteredDraw = parsed.data.enteredDraw ?? false;

  await prisma.feedback.create({
    data: {
      tableNumber: parsed.data.tableNumber,
      foodRating: parsed.data.foodRating,
      serviceRating: parsed.data.serviceRating,
      comment: parsed.data.comment,
      enteredDraw,
      phone: enteredDraw ? parsed.data.phone : null,
      weekKey: enteredDraw ? getISOWeekKey(new Date()) : null,
    },
  });

  return { status: "success", enteredDraw };
}
