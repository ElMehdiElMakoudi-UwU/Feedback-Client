import { requireAdmin } from "@/lib/require-admin";
import { buildKitchenAdvice } from "@/lib/kitchen-advice";
import { loadKitchenOrders, loadKitchenStations } from "../load-kitchen";
import { computeKitchenPerformance } from "./compute-stats";
import { PerformanceView } from "./performance-view";

export const dynamic = "force-dynamic";

const RANGE_DAYS = { today: 1, "7d": 7, "30d": 30 } as const;
type Range = keyof typeof RANGE_DAYS;

function isRange(value: string | undefined): value is Range {
  return value === "today" || value === "7d" || value === "30d";
}

export default async function KitchenPerformancePage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  await requireAdmin();
  const { range: rawRange } = await searchParams;
  const range: Range = isRange(rawRange) ? rawRange : "7d";

  const rangeStart = new Date();
  rangeStart.setHours(0, 0, 0, 0);
  rangeStart.setDate(rangeStart.getDate() - (RANGE_DAYS[range] - 1));

  const [stations, liveOrders] = await Promise.all([
    loadKitchenStations(),
    loadKitchenOrders(),
  ]);
  const data = await computeKitchenPerformance(stations, liveOrders, rangeStart);
  const advice = buildKitchenAdvice(data.stats);

  return <PerformanceView range={range} data={data} advice={advice} />;
}
