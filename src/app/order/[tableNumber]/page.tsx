import { loadOrderableMenu } from "@/lib/orderable-menu";
import { OrderBuilder } from "./order-builder";

export const dynamic = "force-dynamic";

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ tableNumber: string }>;
  searchParams: Promise<{ phone?: string; address?: string; addToOrder?: string }>;
}) {
  const { tableNumber } = await params;
  const { phone, address, addToOrder } = await searchParams;

  const data = await loadOrderableMenu();

  return (
    <OrderBuilder
      tableNumber={tableNumber}
      sections={data}
      initialPhone={phone ?? ""}
      initialAddress={address ?? ""}
      addToOrderId={addToOrder}
    />
  );
}
