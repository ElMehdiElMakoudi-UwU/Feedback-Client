import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { AdminMenuView } from "./menu-view";

export const dynamic = "force-dynamic";

export default async function AdminMenuPage() {
  await requireAdmin();

  const sections = await prisma.menuSection.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      categories: {
        orderBy: { sortOrder: "asc" },
        include: { items: { orderBy: { sortOrder: "asc" } } },
      },
    },
  });

  return <AdminMenuView sections={sections} />;
}
