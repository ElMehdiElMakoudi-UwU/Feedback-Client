"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLanguage, pick } from "@/lib/language-context";
import { LanguageToggle } from "@/components/language-toggle";
import { kioskPunch, type PunchResult } from "@/app/actions/attendance";

export type KioskEmployee = { id: string; name: string; onShift: boolean };

const RESULT_MS = 4000;
// Drop back to the name grid if someone walks away mid-PIN.
const IDLE_MS = 30000;
const PIN_MAX = 6;

function useClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);
  return now;
}

type CameraFailure = "insecure" | "denied" | "missing" | "busy" | "other";

function classifyCameraError(err: unknown): CameraFailure {
  if (!window.isSecureContext) return "insecure";
  const name = err instanceof DOMException ? err.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") return "denied";
  if (name === "NotFoundError" || name === "OverconstrainedError") return "missing";
  if (name === "NotReadableError" || name === "AbortError") return "busy";
  return "other";
}

// Keeps the front camera running for as long as the kiosk is open, so the
// permission prompt only appears once and a snapshot can be taken instantly.
function useCamera(enabled: boolean) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<"starting" | "ready" | CameraFailure>("starting");

  useEffect(() => {
    if (!enabled) return;
    let stream: MediaStream | null = null;
    let cancelled = false;

    // Unavailable outside a secure context (plain HTTP other than localhost).
    const request = navigator.mediaDevices?.getUserMedia
      ? navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 } },
          audio: false,
        })
      : Promise.reject(new Error("getUserMedia unavailable"));
    request
      .then((s) => {
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = s;
        if (videoRef.current) videoRef.current.srcObject = s;
        setState("ready");
      })
      .catch((err) => setState(classifyCameraError(err)));

    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [enabled]);

  const capture = useCallback(async (): Promise<File | null> => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return null;
    const width = Math.min(640, video.videoWidth);
    const height = Math.round((video.videoHeight / video.videoWidth) * width);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d")?.drawImage(video, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.75)
    );
    return blob ? new File([blob], "punch.jpg", { type: "image/jpeg" }) : null;
  }, []);

  return { videoRef, state, capture };
}

function formatTime(date: Date, lang: "ar" | "fr") {
  return date.toLocaleTimeString(lang === "ar" ? "ar-MA" : "fr-MA", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h${String(m).padStart(2, "0")}`;
}

export function KioskView({
  enrolled,
  employees,
}: {
  enrolled: boolean;
  employees: KioskEmployee[];
}) {
  const { lang } = useLanguage();
  const router = useRouter();
  const now = useClock();
  const { videoRef, state: cameraState, capture } = useCamera(enrolled);
  const [selected, setSelected] = useState<KioskEmployee | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Extract<PunchResult, { status: "ok" }> | null>(null);
  const [pending, startTransition] = useTransition();

  const reset = useCallback(() => {
    setSelected(null);
    setPin("");
    setError(null);
  }, []);

  useEffect(() => {
    if (!result) return;
    const id = setTimeout(() => setResult(null), RESULT_MS);
    return () => clearTimeout(id);
  }, [result]);

  useEffect(() => {
    if (!selected) return;
    const id = setTimeout(reset, IDLE_MS);
    return () => clearTimeout(id);
  }, [selected, pin, reset]);

  function errorText(r: Extract<PunchResult, { status: "error" }>) {
    switch (r.code) {
      case "bad_pin":
        return pick(lang, "الرمز غير صحيح", "Code incorrect");
      case "locked":
        return pick(
          lang,
          `محاولات كثيرة. حاول بعد ${r.lockedMinutes} دقائق`,
          `Trop d'essais. Réessayez dans ${r.lockedMinutes} min`
        );
      case "no_photo":
        return pick(lang, "تعذر التقاط الصورة", "La photo n'a pas pu être prise");
      case "too_soon":
        return pick(lang, "تم التسجيل للتو", "Pointage déjà enregistré à l'instant");
      case "no_device":
        return pick(lang, "هذا الجهاز غير مسجل", "Cet appareil n'est pas enregistré");
      default:
        return pick(lang, "حدث خطأ", "Une erreur est survenue");
    }
  }

  function submit(fullPin: string) {
    if (!selected) return;
    startTransition(async () => {
      const photo = await capture();
      if (!photo) {
        setError(pick(lang, "تعذر التقاط الصورة", "La photo n'a pas pu être prise"));
        setPin("");
        return;
      }
      const fd = new FormData();
      fd.set("employeeId", selected.id);
      fd.set("pin", fullPin);
      fd.set("photo", photo);
      const r = await kioskPunch(fd);
      if (r.status === "ok") {
        setResult(r);
        reset();
        router.refresh();
      } else {
        setError(errorText(r));
        setPin("");
      }
    });
  }

  function press(digit: string) {
    if (pending) return;
    setError(null);
    setPin((p) => (p.length < PIN_MAX ? p + digit : p));
  }

  if (!enrolled) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <Image src="/brand/icon-mark.png" alt="" width={64} height={24} className="h-8 w-auto" />
        <h1 className="text-2xl font-semibold">
          {pick(lang, "هذا الجهاز غير مسجل للتسجيل", "Cet appareil n'est pas une borne de pointage")}
        </h1>
        <p className="max-w-md text-[var(--sindibad-muted)]">
          {pick(
            lang,
            "لا يمكن تسجيل الحضور إلا من جهاز المطعم. يجب على المدير تسجيل هذا الجهاز من صفحة الإدارة.",
            "Le pointage n'est possible que sur la tablette du restaurant. Un administrateur doit enregistrer cet appareil depuis l'administration."
          )}
        </p>
      </main>
    );
  }

  const cameraBlocked = cameraState !== "starting" && cameraState !== "ready";
  const cameraMessage: Record<CameraFailure, [string, string]> = {
    insecure: [
      "يجب فتح هذه الصفحة عبر https:// لاستعمال الكاميرا.",
      "Ouvrez cette page en https:// pour utiliser la caméra.",
    ],
    denied: [
      "تم رفض الوصول إلى الكاميرا. اسمح بالكاميرا لهذا الموقع في إعدادات المتصفح ثم أعد تحميل الصفحة.",
      "Accès à la caméra refusé. Autorisez la caméra pour ce site dans les réglages du navigateur, puis rechargez la page.",
    ],
    missing: [
      "لم يتم العثور على أي كاميرا في هذا الجهاز.",
      "Aucune caméra détectée sur cet appareil.",
    ],
    busy: [
      "الكاميرا مستعملة من طرف تطبيق آخر. أغلقه ثم أعد تحميل الصفحة.",
      "La caméra est utilisée par une autre application. Fermez-la puis rechargez la page.",
    ],
    other: ["الكاميرا غير متاحة. أعد تحميل الصفحة.", "Caméra indisponible. Rechargez la page."],
  };

  return (
    <main className="flex min-h-screen flex-col px-4 py-6 sm:px-8">
      <header className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Image src="/brand/icon-mark.png" alt="" width={48} height={18} className="h-6 w-auto" />
          <h1 className="text-xl font-semibold">{pick(lang, "تسجيل الحضور", "Pointage")}</h1>
        </div>
        <p className="text-3xl font-semibold tabular-nums" suppressHydrationWarning>
          {now ? formatTime(now, lang) : ""}
        </p>
        <LanguageToggle />
      </header>

      {cameraBlocked && (
        <p className="mb-4 rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-3 text-center text-red-300">
          {cameraBlocked && pick(lang, ...cameraMessage[cameraState])}
        </p>
      )}

      {result ? (
        <section className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <p className="text-5xl">{result.action === "IN" ? "👋" : "✅"}</p>
          <p className="text-3xl font-semibold">
            {result.action === "IN"
              ? pick(lang, `مرحبا ${result.name}`, `Bonjour ${result.name}`)
              : pick(lang, `إلى اللقاء ${result.name}`, `Au revoir ${result.name}`)}
          </p>
          <p className="text-xl text-[var(--sindibad-muted)]">
            {result.action === "IN"
              ? pick(lang, "تسجيل الدخول", "Arrivée")
              : pick(lang, "تسجيل الخروج", "Départ")}{" "}
            · {formatTime(new Date(result.at), lang)}
            {result.minutes !== undefined && ` · ${formatDuration(result.minutes)}`}
          </p>
        </section>
      ) : selected ? (
        <section className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center gap-5">
          <p className="text-2xl font-semibold">{selected.name}</p>
          <p className="text-[var(--sindibad-muted)]">
            {selected.onShift
              ? pick(lang, "أدخل رمزك لتسجيل الخروج", "Entrez votre code pour le départ")
              : pick(lang, "أدخل رمزك لتسجيل الدخول", "Entrez votre code pour l'arrivée")}
          </p>

          <div className="flex h-6 items-center gap-3" dir="ltr">
            {Array.from({ length: Math.max(4, pin.length) }).map((_, i) => (
              <span
                key={i}
                className={`h-4 w-4 rounded-full border border-[var(--sindibad-maroon)] ${
                  i < pin.length ? "bg-[var(--sindibad-maroon)]" : ""
                }`}
              />
            ))}
          </div>

          {error && <p className="text-center text-red-400">{error}</p>}

          <div className="grid w-full grid-cols-3 gap-3" dir="ltr">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => press(d)}
                className="h-16 rounded-xl border border-[var(--sindibad-line)] bg-[var(--sindibad-paper)] text-2xl font-semibold active:bg-[var(--sindibad-line)]"
              >
                {d}
              </button>
            ))}
            <button
              type="button"
              onClick={reset}
              className="h-16 rounded-xl text-base text-[var(--sindibad-muted)]"
            >
              {pick(lang, "رجوع", "Retour")}
            </button>
            <button
              type="button"
              onClick={() => press("0")}
              className="h-16 rounded-xl border border-[var(--sindibad-line)] bg-[var(--sindibad-paper)] text-2xl font-semibold active:bg-[var(--sindibad-line)]"
            >
              0
            </button>
            <button
              type="button"
              onClick={() => setPin((p) => p.slice(0, -1))}
              className="h-16 rounded-xl text-2xl text-[var(--sindibad-muted)]"
              aria-label={pick(lang, "مسح", "Effacer")}
            >
              ⌫
            </button>
          </div>

          <button
            type="button"
            disabled={pin.length < 4 || pending || cameraBlocked}
            onClick={() => submit(pin)}
            className="h-14 w-full rounded-xl bg-[var(--sindibad-maroon)] text-lg font-semibold text-[var(--sindibad-cream)] disabled:opacity-40"
          >
            {pending
              ? "…"
              : selected.onShift
                ? pick(lang, "تسجيل الخروج", "Pointer le départ")
                : pick(lang, "تسجيل الدخول", "Pointer l'arrivée")}
          </button>
        </section>
      ) : (
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {employees.map((e) => (
            <button
              key={e.id}
              type="button"
              disabled={cameraBlocked}
              onClick={() => setSelected(e)}
              className="flex min-h-24 flex-col items-center justify-center gap-1 rounded-xl border border-[var(--sindibad-line)] bg-[var(--sindibad-paper)] px-3 py-4 text-center active:bg-[var(--sindibad-line)] disabled:opacity-40"
            >
              <span className="text-lg font-semibold">{e.name}</span>
              <span
                className={`text-xs ${e.onShift ? "text-green-400" : "text-[var(--sindibad-muted)]"}`}
              >
                {e.onShift ? pick(lang, "في العمل", "En service") : pick(lang, "خارج العمل", "Absent")}
              </span>
            </button>
          ))}
          {employees.length === 0 && (
            <p className="col-span-full py-10 text-center text-[var(--sindibad-muted)]">
              {pick(lang, "لا يوجد موظفون بعد", "Aucun employé enregistré")}
            </p>
          )}
        </section>
      )}

      {/* Always visible so staff know the snapshot is being taken. */}
      <div className="fixed bottom-4 end-4 overflow-hidden rounded-xl border border-[var(--sindibad-line)] shadow-lg">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="h-28 w-36 -scale-x-100 bg-black object-cover"
        />
        <p className="bg-black/70 px-2 py-1 text-center text-[10px] text-[var(--sindibad-muted)]">
          {pick(lang, "يتم التقاط صورة عند التسجيل", "Photo prise à chaque pointage")}
        </p>
      </div>
    </main>
  );
}
