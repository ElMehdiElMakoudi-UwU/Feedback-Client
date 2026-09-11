"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createAdminSession, destroyAdminSession } from "@/lib/session";

export type LoginFormState = {
  status: "idle" | "error";
  code?: "missing_fields" | "invalid_credentials";
};

export async function loginAdmin(
  _prevState: LoginFormState,
  formData: FormData
): Promise<LoginFormState> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  if (!email || !password) {
    return { status: "error", code: "missing_fields" };
  }

  const admin = await prisma.adminUser.findUnique({ where: { email } });
  if (!admin) {
    return { status: "error", code: "invalid_credentials" };
  }

  const valid = await bcrypt.compare(password, admin.passwordHash);
  if (!valid) {
    return { status: "error", code: "invalid_credentials" };
  }

  await createAdminSession(admin.id);
  redirect("/admin/feedback");
}

export async function logoutAdmin() {
  await destroyAdminSession();
  redirect("/admin/login");
}
