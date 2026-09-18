import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { StockOverviewView } from "./stock-overview-view";

export const dynamic = "force-dynamic";

export default async function StockOverviewPage() {
  await requireAdmin();

  const kitchens = await prisma.kitchen.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      workstations: {
        orderBy: { sortOrder: "asc" },
        include: {
          ingredients: true,
          workers: true,
          menuItems: true,
        },
      },
    },
  });

  return <StockOverviewView kitchens={kitchens} />;
}
