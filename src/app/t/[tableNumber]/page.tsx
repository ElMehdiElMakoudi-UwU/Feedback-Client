import { getPendingTableRequests } from "@/lib/table-requests-server";
import { TableHub } from "./table-hub";

export const dynamic = "force-dynamic";

export default async function TableHubPage({
  params,
}: {
  params: Promise<{ tableNumber: string }>;
}) {
  const { tableNumber } = await params;
  const pendingRequests = await getPendingTableRequests(tableNumber);

  return <TableHub tableNumber={tableNumber} pendingRequests={pendingRequests} />;
}
