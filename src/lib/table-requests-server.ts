import { prisma } from "@/lib/prisma";
import {
  TABLE_REQUEST_REUSE_WINDOW_MS,
  type PaymentMethod,
  type PendingTableRequest,
  type TableRequestType,
} from "@/lib/table-requests";

export async function getPendingTableRequests(
  tableNumber: string
): Promise<PendingTableRequest[]> {
  const requests = await prisma.tableRequest.findMany({
    where: {
      tableNumber,
      status: "PENDING",
      createdAt: { gte: new Date(Date.now() - TABLE_REQUEST_REUSE_WINDOW_MS) },
    },
    orderBy: { createdAt: "desc" },
  });

  return requests.map((request) => ({
    id: request.id,
    type: request.type as TableRequestType,
    paymentMethod: request.paymentMethod as PaymentMethod | null,
  }));
}
