import type { OrderStatus } from "@/lib/order-status";

export type KdsLine = {
  id: string;
  nameAr: string;
  nameFr: string;
  size: string | null;
  optionsAr: string | null;
  optionsFr: string | null;
  quantity: number;
  confirmed: boolean;
  workstationId: string | null;
  firedAt: string | null;
  holdUntil: string | null;
  startedAt: string | null;
  doneAt: string | null;
};

export type KdsOrder = {
  id: string;
  number: number | null;
  tableNumber: string;
  guestName: string | null;
  note: string | null;
  status: OrderStatus;
  createdAt: string;
  readyAt: string | null;
  rushedAt: string | null;
  items: KdsLine[];
};

export type KdsStation = {
  id: string;
  name: string;
  targetMinutes: number;
  staffCount: number;
  syncWithOrder: boolean;
};

// When a line reached its poste: a held line's clock starts at its release,
// or when the cook started it, if they didn't wait for the release.
export function lineStart(line: KdsLine) {
  if (!line.holdUntil || line.holdUntil <= line.firedAt!) return line.firedAt!;
  return line.startedAt && line.startedAt < line.holdUntil ? line.startedAt : line.holdUntil;
}

// Still waiting for the rest of the order before the cook should start it.
export function isHeld(line: KdsLine, now: number) {
  return (
    !line.startedAt &&
    !line.doneAt &&
    line.holdUntil !== null &&
    new Date(line.holdUntil).getTime() > now
  );
}

// Must match NO_STATION in app/actions/kitchen.ts.
export const NO_STATION = "none";
