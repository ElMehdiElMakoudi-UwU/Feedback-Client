// Turns kitchen performance numbers into concrete staffing advice for the
// manager. Pure function, so the thresholds below are the whole policy.

export type StationLive = {
  openTickets: number;
  openItems: number;
  oldestMinutes: number;
  lateTickets: number;
};

export type StationPeriod = {
  tickets: number;
  items: number;
  avgMinutes: number | null;
  p90Minutes: number | null;
  onTimeRate: number | null; // 0..1
  // Share of the period's kitchen workload (items) handled by this poste.
  volumeShare: number;
  // Orders with ≥2 postes where this poste finished last, and by how much on average.
  lastFinisherCount: number;
  avgLeadMinutes: number | null;
  // Hours (0–23) where this poste's average was over its target.
  lateHours: number[];
};

export type StationStats = {
  id: string;
  name: string;
  targetMinutes: number;
  staffCount: number;
  syncWithOrder: boolean;
  live: StationLive;
  period: StationPeriod;
};

export type KitchenStats = {
  stations: StationStats[];
  multiStationOrders: number;
  avgSendMinutes: number | null; // last poste bump → passe sends
  avgHandoverMinutes: number | null; // ready → handed to the customer
  unassignedMenuItems: number;
};

export type Advice = {
  severity: "critical" | "warning" | "info" | "good";
  scope: "live" | "period";
  stationId?: string;
  fr: { title: string; detail: string };
  ar: { title: string; detail: string };
};

// Live thresholds
const LIVE_TICKETS_PER_COOK = 4;
const LIVE_LATE_TICKETS = 2;
// Period thresholds
const MIN_TICKETS_FOR_TREND = 10;
const ON_TIME_WARN = 0.7;
const OVERLOAD_RATIO = 1.4; // volume share vs staff share
const UNDERLOAD_RATIO = 0.5;
const BOTTLENECK_SHARE = 0.45;
const MIN_MULTI_ORDERS = 6;
const HANDOVER_WARN_MINUTES = 4;

function pct(value: number) {
  return `${Math.round(value * 100)}%`;
}

function round(value: number) {
  return Math.round(value * 10) / 10;
}

function hourRange(hours: number[]) {
  if (hours.length === 0) return "";
  const sorted = [...hours].sort((a, b) => a - b);
  // Collapse consecutive hours into "12h–14h, 20h–21h".
  const ranges: string[] = [];
  let start = sorted[0];
  let prev = sorted[0];
  for (const hour of [...sorted.slice(1), Infinity]) {
    if (hour !== prev + 1) {
      ranges.push(`${start}h–${prev + 1}h`);
      start = hour;
    }
    prev = hour;
  }
  return ranges.join(", ");
}

function isOverloadedNow(s: StationStats) {
  const perCook = s.live.openTickets / Math.max(1, s.staffCount);
  return (
    s.live.lateTickets >= LIVE_LATE_TICKETS ||
    (perCook >= LIVE_TICKETS_PER_COOK && s.live.oldestMinutes >= s.targetMinutes * 0.75)
  );
}

function isCalmNow(s: StationStats) {
  return s.staffCount > 0 && s.live.openTickets <= 1 && s.live.lateTickets === 0;
}

export function buildKitchenAdvice(stats: KitchenStats): Advice[] {
  const advice: Advice[] = [];
  const { stations } = stats;

  // ---- Live: what to do right now ----
  const calmNow = stations
    .filter(isCalmNow)
    .sort((a, b) => b.staffCount - a.staffCount || a.live.openTickets - b.live.openTickets);
  const helpersUsed = new Set<string>();

  for (const s of stations) {
    if (s.staffCount === 0 && s.live.openTickets > 0) {
      advice.push({
        severity: "critical",
        scope: "live",
        stationId: s.id,
        fr: {
          title: `Personne au poste ${s.name}`,
          detail: `${s.live.openTickets} ticket(s) attendent et aucun cuisinier n'y est affecté. Envoyez quelqu'un immédiatement.`,
        },
        ar: {
          title: `لا أحد في محطة ${s.name}`,
          detail: `${s.live.openTickets} تذكرة تنتظر ولا يوجد طباخ في المحطة. أرسل أحداً فوراً.`,
        },
      });
      continue;
    }
    if (!isOverloadedNow(s)) continue;

    const helper = calmNow.find((c) => c.id !== s.id && !helpersUsed.has(c.id));
    const state = `${s.live.openTickets} tickets, ${s.live.lateTickets} en retard, le plus ancien à ${Math.round(s.live.oldestMinutes)} min (objectif ${s.targetMinutes} min)`;
    const stateAr = `${s.live.openTickets} تذاكر، ${s.live.lateTickets} متأخرة، أقدمها ${Math.round(s.live.oldestMinutes)} د (الهدف ${s.targetMinutes} د)`;

    if (helper) {
      helpersUsed.add(helper.id);
      const canMove = helper.staffCount >= 2;
      advice.push({
        severity: "critical",
        scope: "live",
        stationId: s.id,
        fr: {
          title: canMove
            ? `Déplacez 1 personne de ${helper.name} vers ${s.name}`
            : `${helper.name} est calme : faites-le aider ${s.name}`,
          detail: `${s.name} est débordé (${state}). ${helper.name} n'a que ${helper.live.openTickets} ticket(s) en cours${
            canMove ? ` avec ${helper.staffCount} personnes` : ""
          }.`,
        },
        ar: {
          title: canMove
            ? `انقل شخصاً من ${helper.name} إلى ${s.name}`
            : `${helper.name} هادئة: ليساعد طباخها ${s.name}`,
          detail: `${s.name} تحت الضغط (${stateAr}). ${helper.name} لديها ${helper.live.openTickets} تذكرة فقط.`,
        },
      });
    } else {
      advice.push({
        severity: "critical",
        scope: "live",
        stationId: s.id,
        fr: {
          title: `Renforcez ${s.name} maintenant`,
          detail: `${state}. Aucun autre poste n'est libre : appelez du renfort ou faites patienter la salle.`,
        },
        ar: {
          title: `عزّز ${s.name} الآن`,
          detail: `${stateAr}. لا توجد محطة فارغة: اطلب دعماً إضافياً.`,
        },
      });
    }
  }

  // ---- Period: staffing and organisation ----
  const totalStaff = stations.reduce((sum, s) => sum + s.staffCount, 0);
  const tracked = stations.filter((s) => s.period.tickets >= MIN_TICKETS_FOR_TREND);

  const overloaded = tracked.filter((s) => {
    const staffShare = totalStaff > 0 ? s.staffCount / totalStaff : 0;
    const slow = s.period.onTimeRate !== null && s.period.onTimeRate < ON_TIME_WARN;
    return slow && (staffShare === 0 || s.period.volumeShare / staffShare >= OVERLOAD_RATIO);
  });
  const periodTickets = stations.reduce((sum, s) => sum + s.period.tickets, 0);
  const underloaded = stations.filter((s) => {
    // Shares mean nothing until the kitchen has a few services of history.
    if (periodTickets < MIN_TICKETS_FOR_TREND * stations.length) return false;
    if (s.staffCount === 0 || totalStaff === 0) return false;
    const staffShare = s.staffCount / totalStaff;
    return s.period.volumeShare / staffShare <= UNDERLOAD_RATIO && (s.period.onTimeRate ?? 1) >= 0.9;
  });

  for (const s of tracked) {
    if (s.period.onTimeRate === null || s.period.onTimeRate >= ON_TIME_WARN) continue;
    const isOverloaded = overloaded.includes(s);
    const hours = hourRange(s.period.lateHours);
    const helper = underloaded.find((u) => u.id !== s.id);
    const late = pct(1 - s.period.onTimeRate);

    advice.push({
      severity: "warning",
      scope: "period",
      stationId: s.id,
      fr: {
        title: isOverloaded
          ? `Ajoutez du personnel au poste ${s.name}${hours ? ` (${hours})` : ""}`
          : `${s.name} dépasse souvent son objectif`,
        detail: `${late} des tickets dépassent ${s.targetMinutes} min (moyenne ${round(s.period.avgMinutes ?? 0)} min, 90e centile ${round(s.period.p90Minutes ?? 0)} min). ${
          isOverloaded
            ? `Il traite ${pct(s.period.volumeShare)} du volume avec ${s.staffCount} personne(s) sur ${totalStaff}.`
            : "Le volume est normal pour son effectif : vérifiez la mise en place et l'équipement."
        }${helper ? ` ${helper.name} peut venir en renfort à ces heures.` : ""}`,
      },
      ar: {
        title: isOverloaded
          ? `أضف موظفين إلى محطة ${s.name}${hours ? ` (${hours})` : ""}`
          : `${s.name} تتجاوز هدفها كثيراً`,
        detail: `${late} من التذاكر تتجاوز ${s.targetMinutes} د (المعدل ${round(s.period.avgMinutes ?? 0)} د). ${
          isOverloaded
            ? `تعالج ${pct(s.period.volumeShare)} من الحجم بـ ${s.staffCount} من أصل ${totalStaff} موظفين.`
            : "الحجم عادي بالنسبة لعدد الموظفين: راجع التحضير المسبق والمعدات."
        }${helper ? ` يمكن لـ ${helper.name} المساعدة في هذه الساعات.` : ""}`,
      },
    });
  }

  for (const u of underloaded) {
    const target = overloaded[0];
    const staffShare = u.staffCount / totalStaff;
    advice.push({
      severity: target ? "warning" : "info",
      scope: "period",
      stationId: u.id,
      fr: {
        title: target
          ? `${u.name} a peu de commandes : affectez-le en renfort à ${target.name}`
          : `${u.name} est sous-utilisé`,
        detail: `${u.name} ne traite que ${pct(u.period.volumeShare)} du volume pour ${pct(staffShare)} de l'équipe (${u.staffCount} personne(s)). ${
          target
            ? `Formez son personnel aux plats de ${target.name} pour aider pendant les pics.`
            : "Envisagez de regrouper ce poste avec un autre en heures creuses."
        }`,
      },
      ar: {
        title: target
          ? `${u.name} لديها طلبات قليلة: ليساعد موظفوها ${target.name}`
          : `${u.name} غير مستغلة بالكامل`,
        detail: `${u.name} تعالج ${pct(u.period.volumeShare)} فقط من الحجم بـ ${pct(staffShare)} من الفريق.`,
      },
    });
  }

  if (stats.multiStationOrders >= MIN_MULTI_ORDERS) {
    const worst = [...stations].sort(
      (a, b) => b.period.lastFinisherCount - a.period.lastFinisherCount
    )[0];
    const share = worst ? worst.period.lastFinisherCount / stats.multiStationOrders : 0;
    if (worst && share >= BOTTLENECK_SHARE && (worst.period.avgLeadMinutes ?? 0) >= 2) {
      advice.push({
        severity: "warning",
        scope: "period",
        stationId: worst.id,
        fr: {
          title: `${worst.name} est le goulot d'étranglement`,
          detail: `Dans ${pct(share)} des commandes à plusieurs postes, c'est ${worst.name} qui finit en dernier, en moyenne ${round(worst.period.avgLeadMinutes ?? 0)} min après les autres. Les autres plats refroidissent à la passe : lancez ${worst.name} en priorité et demandez aux autres postes d'attendre son signal.`,
        },
        ar: {
          title: `${worst.name} هي عنق الزجاجة`,
          detail: `في ${pct(share)} من الطلبات متعددة المحطات، تنتهي ${worst.name} أخيراً بمعدل ${round(worst.period.avgLeadMinutes ?? 0)} د بعد الآخرين. ابدأ بها أولاً.`,
        },
      });
    }
  }

  if (stats.avgHandoverMinutes !== null && stats.avgHandoverMinutes >= HANDOVER_WARN_MINUTES) {
    advice.push({
      severity: "warning",
      scope: "period",
      fr: {
        title: "Les plats attendent à la passe",
        detail: `Une commande prête attend en moyenne ${round(stats.avgHandoverMinutes)} min avant d'être remise. Ajoutez un serveur/runner à la passe aux heures de pointe.`,
      },
      ar: {
        title: "الأطباق تنتظر في الباس",
        detail: `الطلب الجاهز ينتظر ${round(stats.avgHandoverMinutes)} د قبل تسليمه. أضف نادلاً للباس في أوقات الذروة.`,
      },
    });
  }

  if (stats.unassignedMenuItems > 0) {
    advice.push({
      severity: "info",
      scope: "period",
      fr: {
        title: `${stats.unassignedMenuItems} plat(s) sans poste`,
        detail: "Ces plats n'apparaissent que sur la passe et ne sont pas mesurés. Affectez-les à un poste dans Stock → Recettes.",
      },
      ar: {
        title: `${stats.unassignedMenuItems} طبق بدون محطة`,
        detail: "تظهر هذه الأطباق في الباس فقط ولا تُقاس. اربطها بمحطة في المخزون ← الوصفات.",
      },
    });
  }

  if (!advice.some((a) => a.severity === "critical" || a.severity === "warning")) {
    advice.unshift({
      severity: "good",
      scope: "live",
      fr: {
        title: "La cuisine tourne bien",
        detail: "Aucun poste n'est en retard et la charge est bien répartie.",
      },
      ar: { title: "المطبخ يعمل بشكل جيد", detail: "لا توجد محطة متأخرة والحمل موزع جيداً." },
    });
  }

  const order = { critical: 0, warning: 1, info: 2, good: 3 };
  return advice.sort((a, b) => order[a.severity] - order[b.severity]);
}
