import { prisma } from "@/lib/prisma";
import { getKioskDevice } from "@/lib/kiosk";
import { AttendanceSetupView } from "./attendance-setup-view";

export const dynamic = "force-dynamic";

export default async function AttendanceSetupPage() {
  const [employees, devices, currentDevice] = await Promise.all([
    prisma.employee.findMany({
      orderBy: [{ active: "desc" }, { name: "asc" }],
      select: { id: true, name: true, active: true, lockedUntil: true, createdAt: true },
    }),
    prisma.kioskDevice.findMany({
      where: { revokedAt: null },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, lastSeenAt: true, createdAt: true },
    }),
    getKioskDevice(),
  ]);

  const now = new Date();
  return (
    <AttendanceSetupView
      employees={employees.map((e) => ({
        id: e.id,
        name: e.name,
        active: e.active,
        locked: !!e.lockedUntil && e.lockedUntil > now,
      }))}
      devices={devices.map((d) => ({
        id: d.id,
        name: d.name,
        lastSeenAt: d.lastSeenAt?.toISOString() ?? null,
        createdAt: d.createdAt.toISOString(),
      }))}
      currentDeviceId={currentDevice?.id ?? null}
    />
  );
}
