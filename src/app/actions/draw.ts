"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { getISOWeekKey } from "@/lib/week";

export async function pickWeeklyWinner() {
  await requireAdmin();
  const weekKey = getISOWeekKey(new Date());

  const existing = await prisma.drawWinner.findUnique({ where: { weekKey } });
  if (existing) return;

  const entries = await prisma.feedback.findMany({
    where: { weekKey, enteredDraw: true, phone: { not: null } },
    orderBy: { createdAt: "asc" },
  });

  // One entry per phone number: keep the most recent submission per phone.
  const byPhone = new Map<string, (typeof entries)[number]>();
  for (const entry of entries) {
    if (entry.phone) byPhone.set(entry.phone, entry);
  }
  const eligible = [...byPhone.values()];
  if (eligible.length === 0) return;

  const winner = eligible[Math.floor(Math.random() * eligible.length)];
  await prisma.drawWinner.create({
    data: { weekKey, feedbackId: winner.id },
  });

  revalidatePath("/admin/draw");
}

export async function clearWeeklyWinner(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") || "");
  if (!id) return;
  await prisma.drawWinner.delete({ where: { id } });
  revalidatePath("/admin/draw");
}
