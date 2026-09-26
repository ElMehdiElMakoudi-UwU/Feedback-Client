"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

// Cashiers log in with a short username (stored in the `email` login column).
const staffSchema = z.object({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9._-]{3,30}$/),
  password: z.string().min(6).max(100),
});

export async function createCashier(
  _prevState: { status: "idle" | "error"; message?: string },
  formData: FormData
) {
  await requireAdmin();

  const parsed = staffSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { status: "error" as const, message: "invalid" };

  const existing = await prisma.adminUser.findUnique({
    where: { email: parsed.data.username },
  });
  if (existing) return { status: "error" as const, message: "exists" };

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  await prisma.adminUser.create({
    data: { email: parsed.data.username, passwordHash, role: "CASHIER" },
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
