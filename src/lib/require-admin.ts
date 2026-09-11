import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/session";

export async function requireAdmin() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  return session;
}
