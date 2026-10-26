import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getKioskDevice } from "@/lib/kiosk";
import { MAX_SHIFT_HOURS } from "@/lib/attendance";
import { KioskView, type KioskEmployee } from "./kiosk-view";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sindibad — Pointage",
};

// Clock-in kiosk. Only works in a browser an admin enrolled from
// /admin/attendance/setup; anywhere else it just says so, which is what stops
// a shared PIN from being used to clock in from home.
export default async function PointagePage() {
  const device = await getKioskDevice();
  if (!device) return <KioskView enrolled={false} employees={[]} />;

  // A shift left open past the limit counts as a forgotten clock-out, so the
  // next punch is an arrival — show it that way.
  const cutoff = new Date();
  cutoff.setTime(cutoff.getTime() - MAX_SHIFT_HOURS * 3600000);
  const employees = await prisma.employee.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      shifts: { where: { clockOutAt: null, clockInAt: { gte: cutoff } }, select: { id: true }, take: 1 },
    },
  });

  const list: KioskEmployee[] = employees.map((e) => ({
    id: e.id,
    name: e.name,
    onShift: e.shifts.length > 0,
  }));

  return <KioskView enrolled employees={list} />;
}
