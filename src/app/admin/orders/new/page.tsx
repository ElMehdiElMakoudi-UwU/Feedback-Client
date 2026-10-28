import { requireStaff } from "@/lib/require-admin";
import { loadOrderableMenu } from "@/lib/orderable-menu";
import { WhatsAppOrderForm } from "./whatsapp-order-form";

export const dynamic = "force-dynamic";

export default async function NewWhatsAppOrderPage() {
  await requireStaff();
  const sections = await loadOrderableMenu();

  return <WhatsAppOrderForm sections={sections} />;
}
