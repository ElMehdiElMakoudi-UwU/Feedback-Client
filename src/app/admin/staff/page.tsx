import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { StaffView } from "./staff-view";

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  await requireAdmin();

  const cashiers = await prisma.adminUser.findMany({
    where: { role: "CASHIER" },
    orderBy: { createdAt: "desc" },
  });

  return <StaffView cashiers={cashiers} />;
}
