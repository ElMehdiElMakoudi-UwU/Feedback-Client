// Shared by the order builder (client) and order actions (server) so the price
// a guest sees is computed exactly like the price that gets charged.

export type MenuOptionView = {
  id: string;
  nameAr: string;
  nameFr: string;
  priceDelta: number;
};

export type MenuOptionGroupView = {
  id: string;
  nameAr: string;
  nameFr: string;
  required: boolean;
  maxSelect: number; // 1 = single choice, 0 = no limit
  options: MenuOptionView[];
};

export type ResolvedOptions =
  | {
      ok: true;
      optionIds: string[];
      priceDelta: number;
      labelAr: string | null;
      labelFr: string | null;
    }
  | { ok: false; groupId: string; reason: "required" | "too_many" | "unknown" };

export function resolveOptions(
  groups: MenuOptionGroupView[],
  selectedIds: string[]
): ResolvedOptions {
  const selected = new Set(selectedIds);
  const known = new Set(groups.flatMap((g) => g.options.map((o) => o.id)));
  for (const id of selected) {
    if (!known.has(id)) return { ok: false, groupId: "", reason: "unknown" };
  }

  const chosen: MenuOptionView[] = [];
  for (const group of groups) {
    const picks = group.options.filter((o) => selected.has(o.id));
    if (group.required && picks.length === 0) {
      return { ok: false, groupId: group.id, reason: "required" };
    }
    if (group.maxSelect > 0 && picks.length > group.maxSelect) {
      return { ok: false, groupId: group.id, reason: "too_many" };
    }
    chosen.push(...picks);
  }

  return {
    ok: true,
    optionIds: chosen.map((o) => o.id),
    priceDelta: chosen.reduce((sum, o) => sum + o.priceDelta, 0),
    labelAr: chosen.length ? chosen.map((o) => o.nameAr).join("، ") : null,
    labelFr: chosen.length ? chosen.map((o) => o.nameFr).join(", ") : null,
  };
}

export function formatPriceDelta(delta: number) {
  if (delta === 0) return "";
  return delta > 0 ? `+${delta}` : `${delta}`;
}
