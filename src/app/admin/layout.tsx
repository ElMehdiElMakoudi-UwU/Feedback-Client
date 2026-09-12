import { getAdminSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { AdminNav } from "./admin-nav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAdminSession();
  const user = session
    ? await prisma.adminUser.findUnique({ where: { id: session.adminId } })
    : null;

  return (
    <div className="min-h-screen bg-white text-neutral-900">
      {user && <AdminNav role={user.role} />}
      {children}
    </div>
  );
}
