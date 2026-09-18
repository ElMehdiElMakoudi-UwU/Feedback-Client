import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { PostesView } from "./postes-view";

export const dynamic = "force-dynamic";

export default async function StockPostesPage() {
  await requireAdmin();

  const [kitchens, ingredients] = await Promise.all([
    prisma.kitchen.findMany({
      orderBy: { sortOrder: "asc" },
      include: {
        workstations: {
          orderBy: { sortOrder: "asc" },
          include: {
            ingredients: {
              orderBy: { sortOrder: "asc" },
              include: { ingredient: true },
            },
          },
        },
      },
    }),
    prisma.ingredient.findMany({ orderBy: { name: "asc" } }),
  ]);

  return <PostesView kitchens={kitchens} ingredients={ingredients} />;
}
