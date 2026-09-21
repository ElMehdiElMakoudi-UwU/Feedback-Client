import { requireAdmin } from "@/lib/require-admin";
import { getConsumptionByIngredient, normalizeToDay } from "@/lib/stock";
import { StockConsumptionView } from "./stock-consumption-view";

export const dynamic = "force-dynamic";

export default async function StockConsumptionPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  await requireAdmin();
  const { date: dateParam } = await searchParams;
  const date = normalizeToDay(dateParam ? new Date(dateParam) : new Date());

  const ingredients = await getConsumptionByIngredient(date);

  return <StockConsumptionView date={date.toISOString().slice(0, 10)} ingredients={ingredients} />;
}
