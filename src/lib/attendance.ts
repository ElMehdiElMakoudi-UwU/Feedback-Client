// An open shift older than this is treated as a forgotten clock-out: it stays
// open (flagged for the admin) and the next punch starts a new shift.
export const MAX_SHIFT_HOURS = 16;

// Shift photo columns hold a private-storage key ("attendance/<file>");
// this is the admin-gated URL that serves it.
export function attendancePhotoUrl(key: string) {
  return `/api/attendance/photo/${key.replace(/^attendance\//, "")}`;
}
