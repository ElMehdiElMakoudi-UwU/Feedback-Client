import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/require-admin";
import { KitchenBoard } from "./kitchen-board";
import { loadKitchenBoard } from "./load-kitchen";

export const dynamic = "force-dynamic";

// The passe: the whole kitchen at a glance. Cooks assigned to a poste land
// straight on their own screen.
export default async function AdminKitchenPage() {
  const user = await requireStaff();
  if (user.role === "WORKER" && user.workstationId) {
    redirect(`/admin/kitchen/poste/${user.workstationId}`);
  }

  const { stations, orders, renderedAt } = await loadKitchenBoard();

  return <KitchenBoard orders={orders} stations={stations} renderedAt={renderedAt} />;
}
