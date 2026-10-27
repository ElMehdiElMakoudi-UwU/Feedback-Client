import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/require-admin";
import { loadKitchenBoard } from "../../load-kitchen";
import { StationBoard } from "./station-board";

export const dynamic = "force-dynamic";

export default async function KitchenStationPage({
  params,
}: {
  params: Promise<{ workstationId: string }>;
}) {
  await requireStaff();
  const { workstationId } = await params;

  const { stations, orders, renderedAt } = await loadKitchenBoard();
  const station = stations.find((s) => s.id === workstationId);
  if (!station) notFound();

  return (
    <StationBoard station={station} stations={stations} orders={orders} renderedAt={renderedAt} />
  );
}
