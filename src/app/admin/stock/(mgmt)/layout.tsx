import { requireAdmin } from "@/lib/require-admin";
import { StockSubNav } from "@/app/admin/stock/stock-subnav";

export default async function StockManagementLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return (
    <>
      <StockSubNav />
      {children}
    </>
  );
}
