import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { StockRecipesView } from "./stock-recipes-view";

export const dynamic = "force-dynamic";

export default async function StockRecipesPage() {
  await requireAdmin();

  const [categories, workstations, ingredients] = await Promise.all([
    prisma.menuCategory.findMany({
      orderBy: { sortOrder: "asc" },
      include: {
        section: true,
        items: {
          orderBy: { sortOrder: "asc" },
          include: {
            workstation: true,
            recipeItems: { include: { ingredient: true } },
          },
        },
      },
    }),
    prisma.workstation.findMany({ orderBy: { sortOrder: "asc" }, include: { kitchen: true } }),
    prisma.ingredient.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <StockRecipesView
      categories={categories}
      workstations={workstations}
      ingredients={ingredients}
    />
  );
}
