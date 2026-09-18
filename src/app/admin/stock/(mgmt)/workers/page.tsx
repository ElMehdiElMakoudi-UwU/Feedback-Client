import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { StockWorkersView } from "./stock-workers-view";

export const dynamic = "force-dynamic";

export default async function StockWorkersPage() {
  await requireAdmin();

  const [workers, workstations] = await Promise.all([
    prisma.adminUser.findMany({
      where: { role: "WORKER" },
      orderBy: { createdAt: "desc" },
      include: { workstation: { include: { kitchen: true } } },
    }),
    prisma.workstation.findMany({
      orderBy: { sortOrder: "asc" },
      include: { kitchen: true },
    }),
  ]);

  return <StockWorkersView workers={workers} workstations={workstations} />;
}
