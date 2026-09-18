import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/session";

export async function getStaffSession() {
  const session = await getAdminSession();
  if (!session) return null;

  return prisma.adminUser.findUnique({
    where: { id: session.adminId },
  });
}

export async function requireStaff() {
  const user = await getStaffSession();
  if (!user) redirect("/admin/login");

  return user;
}

export async function requireAdmin() {
  const user = await requireStaff();
  if (user.role !== "ADMIN") redirect("/admin/loyalty");
  return user;
}

export async function requireWorker() {
  const user = await requireStaff();
  if (user.role !== "WORKER") redirect("/admin/loyalty");
  return user;
}
