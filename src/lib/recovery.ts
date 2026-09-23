// A rating at or below this on food, service or any dish opens a recovery case.
export const LOW_RATING_THRESHOLD = 2;

export function isLowRating(ratings: number[]) {
  return ratings.some((rating) => rating > 0 && rating <= LOW_RATING_THRESHOLD);
}

export const RECOVERY_STATUSES = [
  "OPEN",
  "CONTACTED",
  "RESOLVED",
  "NO_ACTION",
] as const;
export type RecoveryStatus = (typeof RECOVERY_STATUSES)[number];

export const RECOVERY_STATUS_LABEL: Record<
  RecoveryStatus,
  { ar: string; fr: string; className: string }
> = {
  OPEN: { ar: "مفتوح", fr: "Ouvert", className: "bg-red-100 text-red-700" },
  CONTACTED: {
    ar: "تم التواصل",
    fr: "Contacté",
    className: "bg-amber-100 text-amber-700",
  },
  RESOLVED: {
    ar: "تمت المعالجة",
    fr: "Résolu",
    className: "bg-green-100 text-green-700",
  },
  NO_ACTION: {
    ar: "بدون إجراء",
    fr: "Sans suite",
    className: "bg-neutral-100 text-neutral-600",
  },
};

export const ROOT_CAUSES = [
  "WAIT",
  "TEMPERATURE",
  "TASTE",
  "PORTION",
  "STAFF",
  "CLEANLINESS",
  "PRICE",
  "OTHER",
] as const;
export type RootCause = (typeof ROOT_CAUSES)[number];

export const ROOT_CAUSE_LABEL: Record<RootCause, { ar: string; fr: string }> = {
  WAIT: { ar: "مدة الانتظار", fr: "Attente" },
  TEMPERATURE: { ar: "طعام بارد", fr: "Plat froid" },
  TASTE: { ar: "المذاق", fr: "Goût" },
  PORTION: { ar: "الكمية", fr: "Portion" },
  STAFF: { ar: "سلوك الموظفين", fr: "Personnel" },
  CLEANLINESS: { ar: "النظافة", fr: "Propreté" },
  PRICE: { ar: "السعر", fr: "Prix" },
  OTHER: { ar: "أخرى", fr: "Autre" },
};
