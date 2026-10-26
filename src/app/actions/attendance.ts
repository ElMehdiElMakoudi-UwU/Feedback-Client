"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { enrollCurrentBrowserAsKiosk, getKioskDevice } from "@/lib/kiosk";
import { savePrivatePhoto } from "@/lib/upload";
import { MAX_SHIFT_HOURS } from "@/lib/attendance";

const MAX_PIN_ATTEMPTS = 5;
const LOCKOUT_MS = 5 * 60 * 1000;
// Ignore a second punch right after the first (double tap, impatient retry).
const MIN_PUNCH_GAP_MS = 60 * 1000;

const pinSchema = z.string().regex(/^\d{4,6}$/);

// ---- Kiosk ----

export type PunchResult =
  | { status: "ok"; action: "IN" | "OUT"; name: string; at: string; minutes?: number }
  | {
      status: "error";
      code: "no_device" | "bad_pin" | "locked" | "no_photo" | "too_soon" | "invalid";
      lockedMinutes?: number;
    };

export async function kioskPunch(formData: FormData): Promise<PunchResult> {
  const device = await getKioskDevice();
  if (!device) return { status: "error", code: "no_device" };

  const employeeId = String(formData.get("employeeId") || "");
  const pin = String(formData.get("pin") || "");
  if (!employeeId || !pinSchema.safeParse(pin).success) {
    return { status: "error", code: "bad_pin" };
  }

  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee || !employee.active) return { status: "error", code: "invalid" };

  const now = new Date();
  if (employee.lockedUntil && employee.lockedUntil > now) {
    return {
      status: "error",
      code: "locked",
      lockedMinutes: Math.ceil((employee.lockedUntil.getTime() - now.getTime()) / 60000),
    };
  }

  const valid = await bcrypt.compare(pin, employee.pinHash);
  if (!valid) {
    const attempts = employee.failedAttempts + 1;
    const lock = attempts >= MAX_PIN_ATTEMPTS;
    await prisma.employee.update({
      where: { id: employee.id },
      data: {
        failedAttempts: lock ? 0 : attempts,
        lockedUntil: lock ? new Date(now.getTime() + LOCKOUT_MS) : null,
      },
    });
    return lock
      ? { status: "error", code: "locked", lockedMinutes: LOCKOUT_MS / 60000 }
      : { status: "error", code: "bad_pin" };
  }

  const openShift = await prisma.shift.findFirst({
    where: { employeeId: employee.id, clockOutAt: null },
    orderBy: { clockInAt: "desc" },
  });
  const lastEvent = openShift
    ? openShift.clockInAt
    : (
        await prisma.shift.findFirst({
          where: { employeeId: employee.id },
          orderBy: { clockOutAt: "desc" },
          select: { clockOutAt: true },
        })
      )?.clockOutAt;
  if (lastEvent && now.getTime() - lastEvent.getTime() < MIN_PUNCH_GAP_MS) {
    return { status: "error", code: "too_soon" };
  }

  // The snapshot is the whole point of the kiosk: no photo, no punch.
  const photoKey = await savePrivatePhoto(formData.get("photo"), "attendance").catch(() => null);
  if (!photoKey) return { status: "error", code: "no_photo" };

  await prisma.$transaction([
    prisma.employee.update({
      where: { id: employee.id },
      data: { failedAttempts: 0, lockedUntil: null },
    }),
    prisma.kioskDevice.update({ where: { id: device.id }, data: { lastSeenAt: now } }),
  ]);

  const stale =
    openShift && now.getTime() - openShift.clockInAt.getTime() > MAX_SHIFT_HOURS * 3600000;

  revalidatePath("/admin/attendance");

  if (openShift && !stale) {
    await prisma.shift.update({
      where: { id: openShift.id },
      data: { clockOutAt: now, clockOutPhotoUrl: photoKey, clockOutDeviceId: device.id },
    });
    return {
      status: "ok",
      action: "OUT",
      name: employee.name,
      at: now.toISOString(),
      minutes: Math.round((now.getTime() - openShift.clockInAt.getTime()) / 60000),
    };
  }

  await prisma.shift.create({
    data: {
      employeeId: employee.id,
      clockInAt: now,
      clockInPhotoUrl: photoKey,
      clockInDeviceId: device.id,
    },
  });
  return { status: "ok", action: "IN", name: employee.name, at: now.toISOString() };
}

// ---- Admin: employees ----

export type EmployeeFormState = { status: "idle" | "error" | "saved"; message?: string };

const employeeSchema = z.object({
  name: z.string().trim().min(2).max(60),
  pin: pinSchema,
});

export async function createEmployee(
  _prev: EmployeeFormState,
  formData: FormData
): Promise<EmployeeFormState> {
  await requireAdmin();
  const parsed = employeeSchema.safeParse({
    name: formData.get("name"),
    pin: formData.get("pin"),
  });
  if (!parsed.success) return { status: "error", message: "invalid" };

  await prisma.employee.create({
    data: { name: parsed.data.name, pinHash: await bcrypt.hash(parsed.data.pin, 10) },
  });
  revalidatePath("/admin/attendance", "layout");
  return { status: "saved" };
}

export async function resetEmployeePin(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") || "");
  const pin = pinSchema.safeParse(formData.get("pin"));
  if (!id || !pin.success) return;

  await prisma.employee.update({
    where: { id },
    data: { pinHash: await bcrypt.hash(pin.data, 10), failedAttempts: 0, lockedUntil: null },
  });
  revalidatePath("/admin/attendance", "layout");
}

export async function setEmployeeActive(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") || "");
  const active = formData.get("active") === "true";
  if (!id) return;

  await prisma.employee.update({ where: { id }, data: { active } });
  revalidatePath("/admin/attendance", "layout");
}

// ---- Admin: kiosk devices ----

export async function enrollThisDevice(formData: FormData) {
  await requireAdmin();
  const name = String(formData.get("name") || "").trim().slice(0, 60) || "Tablette";
  await enrollCurrentBrowserAsKiosk(name);
  revalidatePath("/admin/attendance", "layout");
}

export async function revokeDevice(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") || "");
  if (!id) return;

  await prisma.kioskDevice.update({ where: { id }, data: { revokedAt: new Date() } });
  revalidatePath("/admin/attendance", "layout");
}

// ---- Admin: shift corrections ----

// Datetime-local inputs carry no timezone; the browser sends the offset of
// the admin's clock alongside so we store the instant they meant.
function parseLocalDateTime(value: FormDataEntryValue | null, offsetMinutes: number) {
  const str = String(value || "");
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(str)) return null;
  const asUtc = new Date(`${str}:00Z`);
  if (Number.isNaN(asUtc.getTime())) return null;
  return new Date(asUtc.getTime() + offsetMinutes * 60000);
}

export async function correctShift(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") || "");
  const offset = Number(formData.get("tzOffset") || 0);
  const note = String(formData.get("note") || "").trim().slice(0, 200);
  const clockInAt = parseLocalDateTime(formData.get("clockInAt"), offset);
  const clockOutAt = parseLocalDateTime(formData.get("clockOutAt"), offset);
  if (!id || !clockInAt || !note) return;
  if (clockOutAt && clockOutAt <= clockInAt) return;

  await prisma.shift.update({
    where: { id },
    data: {
      clockInAt,
      clockOutAt,
      editedById: admin.id,
      editedAt: new Date(),
      editNote: note,
    },
  });
  revalidatePath("/admin/attendance");
}
