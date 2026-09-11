import { getAdminSession } from "@/lib/session";
import { AdminNav } from "./admin-nav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAdminSession();

  return (
    <div className="min-h-screen bg-white text-neutral-900">
      {session && <AdminNav />}
      {children}
    </div>
  );
}
