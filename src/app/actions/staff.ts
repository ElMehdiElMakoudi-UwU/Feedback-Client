"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

const staffSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(6).max(100),
});

export async function createCashier(
  _prevState: { status: "idle" | "error"; message?: string },
  formData: FormData
) {
  await requireAdmin();

  const parsed = staffSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { status: "error" as const, message: "invalid" };

  const existing = await prisma.adminUser.findUnique({
    where: { email: parsed.data.email },
  });
  if (existing) return { status: "error" as const, message: "exists" };

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  await prisma.adminUser.create({
    data: { email: parsed.data.email, passwordHash, role: "CASHIER" },
  });

  revalidatePath("/admin/staff");
  return { status: "idle" as const };
}

export async function deleteStaff(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") || "");
  if (!id || id === admin.id) return;

  await prisma.adminUser.delete({ where: { id, role: "CASHIER" } });
  revalidatePath("/admin/staff");
}
