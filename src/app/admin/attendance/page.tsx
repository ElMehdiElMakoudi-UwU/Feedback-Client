import { prisma } from "@/lib/prisma";
import { MAX_SHIFT_HOURS, attendancePhotoUrl } from "@/lib/attendance";
import { AttendanceLogView, type LogShift } from "./attendance-log-view";

export const dynamic = "force-dynamic";

function parseDay(value: string | undefined, fallback: Date) {
  const d = value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : fallback;
  return Number.isNaN(d.getTime()) ? fallback : d;
}

function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const from = parseDay(params.from, today);
  const to = parseDay(params.to, from);
  const end = new Date(to);
  end.setDate(end.getDate() + 1);

  // Shifts started in the range, plus anything still open so a forgotten
  // clock-out from an earlier day never drops out of sight.
  const shifts = await prisma.shift.findMany({
    where: {
      OR: [{ clockInAt: { gte: from, lt: end } }, { clockOutAt: null }],
    },
    orderBy: { clockInAt: "desc" },
    include: {
      employee: { select: { name: true } },
      clockInDevice: { select: { name: true } },
    },
  });

  const now = new Date().getTime();
  const editors = await prisma.adminUser.findMany({
    where: { id: { in: shifts.map((s) => s.editedById).filter((id): id is string => !!id) } },
    select: { id: true, email: true },
  });
  const editorName = new Map(editors.map((e) => [e.id, e.email]));

  const list: LogShift[] = shifts.map((s) => ({
    id: s.id,
    employeeId: s.employeeId,
    employeeName: s.employee.name,
    clockInAt: s.clockInAt.toISOString(),
    clockOutAt: s.clockOutAt?.toISOString() ?? null,
    clockInPhoto: attendancePhotoUrl(s.clockInPhotoUrl),
    clockOutPhoto: s.clockOutPhotoUrl ? attendancePhotoUrl(s.clockOutPhotoUrl) : null,
    deviceName: s.clockInDevice?.name ?? null,
    missingClockOut: !s.clockOutAt && now - s.clockInAt.getTime() > MAX_SHIFT_HOURS * 3600000,
    editNote: s.editNote,
    editedBy: s.editedById ? editorName.get(s.editedById) ?? null : null,
    editedAt: s.editedAt?.toISOString() ?? null,
  }));

  return <AttendanceLogView shifts={list} from={dayKey(from)} to={dayKey(to)} />;
}
