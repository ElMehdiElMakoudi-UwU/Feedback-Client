"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/require-admin";

const phoneSchema = z.string().trim().min(6).max(20);

function redirectToLoyalty(
  phone: string,
  params: Record<string, string> = {}
): never {
  const query = new URLSearchParams({ phone, ...params });
  redirect(`/admin/loyalty?${query.toString()}`);
}

const earnSchema = z.object({
  phone: phoneSchema,
  orderTotal: z.coerce.number().min(0.01).max(1_000_000),
});

export async function addPointsForOrder(formData: FormData) {
  const staff = await requireStaff();
  const rawPhone = String(formData.get("phone") || "");

  const parsed = earnSchema.safeParse({
    phone: formData.get("phone"),
    orderTotal: formData.get("orderTotal"),
  });
  if (!parsed.success) redirectToLoyalty(rawPhone, { error: "invalid" });

  const { phone, orderTotal } = parsed.data;
  const points = Math.floor(orderTotal);

  const customer = await prisma.customer.upsert({
    where: { phone },
    update: { points: { increment: points } },
    create: { phone, points },
  });

  await prisma.pointsTransaction.create({
    data: {
      customerId: customer.id,
      points,
      orderTotal,
      createdById: staff.id,
    },
  });

  revalidatePath("/admin/loyalty");
  redirectToLoyalty(phone, { ok: "earned" });
}

const redeemSchema = z.object({
  phone: phoneSchema,
  points: z.coerce.number().int().min(1).max(1_000_000),
  note: z.string().trim().max(200).optional(),
});

export async function redeemPoints(formData: FormData) {
  const staff = await requireStaff();
  const rawPhone = String(formData.get("phone") || "");

  const parsed = redeemSchema.safeParse({
    phone: formData.get("phone"),
    points: formData.get("points"),
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) redirectToLoyalty(rawPhone, { error: "invalid" });

  const { phone, points, note } = parsed.data;

  let insufficient = false;
  await prisma.$transaction(async (tx) => {
    const customer = await tx.customer.findUnique({ where: { phone } });
    if (!customer || customer.points < points) {
      insufficient = true;
      return;
    }

    await tx.customer.update({
      where: { id: customer.id },
      data: { points: { decrement: points } },
    });
    await tx.pointsTransaction.create({
      data: {
        customerId: customer.id,
        points: -points,
        note,
        createdById: staff.id,
      },
    });
  });

  if (insufficient) redirectToLoyalty(phone, { error: "insufficient" });

  revalidatePath("/admin/loyalty");
  redirectToLoyalty(phone, { ok: "redeemed" });
}
