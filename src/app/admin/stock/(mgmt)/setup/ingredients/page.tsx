import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { IngredientsView } from "./ingredients-view";

export const dynamic = "force-dynamic";

export default async function StockIngredientsPage() {
  await requireAdmin();

  const ingredients = await prisma.ingredient.findMany({ orderBy: { name: "asc" } });

  return <IngredientsView ingredients={ingredients} />;
}
