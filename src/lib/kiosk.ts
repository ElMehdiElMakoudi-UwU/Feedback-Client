import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const COOKIE_NAME = "sindibad_kiosk";
// The tablet stays enrolled until an admin revokes it.
const COOKIE_TTL_MS = 1000 * 60 * 60 * 24 * 365 * 5;

const COOKIE_SECURE =
  process.env.NODE_ENV === "production" && process.env.COOKIE_SECURE !== "false";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

// Turns the current browser into a clock-in kiosk. Must be called from an
// admin-authenticated action running on the tablet itself.
export async function enrollCurrentBrowserAsKiosk(name: string) {
  const token = randomBytes(32).toString("hex");
  const device = await prisma.kioskDevice.create({
    data: { name, tokenHash: hashToken(token) },
  });

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: "lax",
    path: "/",
    expires: new Date(Date.now() + COOKIE_TTL_MS),
  });
  return device;
}

export async function getKioskDevice() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const device = await prisma.kioskDevice.findUnique({
    where: { tokenHash: hashToken(token) },
  });
  if (!device || device.revokedAt) return null;
  return device;
}
