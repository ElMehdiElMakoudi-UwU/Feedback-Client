import { requireAdmin } from "@/lib/require-admin";
import { AttendanceSubNav } from "./attendance-subnav";

export default async function AttendanceLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <>
      <AttendanceSubNav />
      {children}
    </>
  );
}
