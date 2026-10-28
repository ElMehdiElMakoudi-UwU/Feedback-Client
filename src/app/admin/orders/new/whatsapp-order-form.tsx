"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useLanguage, pick } from "@/lib/language-context";
import type { MenuItemView, MenuSectionView } from "@/app/menu/types";
import { resolveOptions } from "@/lib/menu-options";
import { formatOrderNumber } from "@/lib/order-status";
import {
  placeWhatsAppOrder,
  type WhatsAppOrderState,
} from "@/app/actions/orders";
import {
  OptionPicker,
  cartKey,
  type PendingAdd,
  type Size,
} from "@/app/order/[tableNumber]/order-builder";
import { driverTrackingMessage, trackingPath, whatsAppLink } from "@/lib/whatsapp";

type CartLine = {
  menuItemId: string;
  nameAr: string;
  nameFr: string;
  size: Size | null;
  optionIds: string[];
  optionsAr: string | null;
  optionsFr: string | null;
  unitPrice: number;
  quantity: number;
};

type Mode = "DELIVERY" | "TAKEAWAY";

type CreatedOrder = Extract<WhatsAppOrderState, { status: "ok" }>;

const inputClass =
  "w-full rounded-md border border-neutral-300 px-3 py-2.5 text-sm focus:border-[var(--sindibad-maroon)] focus:outline-none";

function CreatedPanel({
  order,
  lang,
  onNext,
}: {
  order: CreatedOrder;
  lang: "ar" | "fr";
  onNext: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const message = driverTrackingMessage(
    order.number,
    order.trackingCode,
    window.location.origin
  );

  async function copy() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (http, old browser): the message stays selectable below.
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-8 sm:px-6">
      <div className="rounded-lg border border-green-200 bg-green-50 p-6 text-center">
        <p className="text-sm text-green-800">
          ✅ {pick(lang, "تم إرسال الطلب إلى المطبخ", "Commande envoyée en cuisine")}
        </p>
        <p className="mt-4 text-xs uppercase tracking-widest text-neutral-500">
          {pick(lang, "رقم الطلب", "Numéro de commande")}
        </p>
        <p className="text-6xl font-semibold tracking-wide text-neutral-900">
          {formatOrderNumber(order.number)}
        </p>
        <p className="mt-2 text-sm text-neutral-600">
          {pick(lang, "رمز التتبع", "Code de suivi")}:{" "}
          <span className="font-mono font-semibold tracking-widest">
            {order.trackingCode}
          </span>
          {" · "}
          {order.total} {pick(lang, "درهم", "DH")}
        </p>
      </div>

      <p className="mb-2 mt-6 text-sm font-medium text-neutral-700">
        {pick(lang, "الرسالة للسائق", "Message pour le livreur")}
      </p>
      <pre className="whitespace-pre-wrap rounded-md border border-neutral-200 bg-neutral-50 p-3 text-xs text-neutral-800 select-all">
        {message}
      </pre>

      <div className="mt-4 flex flex-col gap-2">
        <a
          href={whatsAppLink(message, order.contactPhone)}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md bg-[#25D366] px-4 py-3 text-center text-sm font-semibold text-white hover:opacity-90"
        >
          {order.contactPhone
            ? pick(lang, "إرسال عبر واتساب", "Envoyer sur WhatsApp")
            : pick(lang, "فتح واتساب واختيار المحادثة", "Ouvrir WhatsApp et choisir la discussion")}
        </a>
        <button
          type="button"
          onClick={copy}
          className="rounded-md border border-neutral-300 px-4 py-3 text-sm font-medium text-neutral-800 hover:border-neutral-400"
        >
          {copied
            ? pick(lang, "✓ تم النسخ", "✓ Copié")
            : pick(lang, "نسخ الرسالة", "Copier le message")}
        </button>
        <a
          href={trackingPath(order.trackingCode)}
          target="_blank"
          rel="noopener noreferrer"
          className="py-2 text-center text-xs text-neutral-500 underline"
        >
          {pick(lang, "معاينة صفحة التتبع", "Voir la page de suivi")}
        </a>
      </div>

      <div className="mt-6 flex gap-2">
        <button
          type="button"
          onClick={onNext}
          className="flex-1 rounded-md bg-neutral-900 px-4 py-3 text-sm font-semibold text-white hover:bg-[var(--sindibad-maroon)]"
        >
          {pick(lang, "طلب جديد", "Nouvelle commande")}
        </button>
        <Link
          href="/admin/orders"
          className="rounded-md border border-neutral-300 px-4 py-3 text-sm text-neutral-700 hover:border-neutral-400"
        >
          {pick(lang, "الطلبات", "Commandes")}
        </Link>
      </div>
    </main>
  );
}

function ItemButtons({
  item,
  lang,
  onAdd,
}: {
  item: MenuItemView;
  lang: "ar" | "fr";
  onAdd: (size: Size | null, basePrice: number) => void;
}) {
  const hasSizes = item.price != null && item.priceLarge != null;
  const buttonClass =
    "whitespace-nowrap rounded-md border border-neutral-300 px-2.5 py-1.5 text-xs font-medium hover:border-[var(--sindibad-maroon)] hover:text-[var(--sindibad-maroon)]";

  if (hasSizes) {
    return (
      <div className="flex shrink-0 gap-1.5">
        <button type="button" className={buttonClass} onClick={() => onAdd("REGULAR", item.price!)}>
          M · {item.price}
        </button>
        <button type="button" className={buttonClass} onClick={() => onAdd("LARGE", item.priceLarge!)}>
          L · {item.priceLarge}
        </button>
      </div>
    );
  }
  const price = item.price ?? item.priceLarge;
  if (price == null) return null;
  return (
    <button
      type="button"
      className={buttonClass}
      onClick={() => onAdd(item.price != null ? null : "LARGE", price)}
    >
      + {price} {pick(lang, "درهم", "DH")}
    </button>
  );
}

export function WhatsAppOrderForm({ sections }: { sections: MenuSectionView[] }) {
  const { lang } = useLanguage();
  const [mode, setMode] = useState<Mode>("DELIVERY");
  const [guestName, setGuestName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [cart, setCart] = useState<Record<string, CartLine>>({});
  const [query, setQuery] = useState("");
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [pendingAdd, setPendingAdd] = useState<PendingAdd | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedOrder | null>(null);
  const [pending, startTransition] = useTransition();

  const lines = useMemo(() => Object.entries(cart), [cart]);
  const total = lines.reduce((sum, [, line]) => sum + line.unitPrice * line.quantity, 0);

  const categories = useMemo(
    () => sections.flatMap((section) => section.categories),
    [sections]
  );

  const normalizedQuery = query.trim().toLowerCase();
  const visibleCategories = categories
    .filter((category) => !activeCategoryId || category.id === activeCategoryId)
    .map((category) => ({
      ...category,
      items: category.items.filter(
        (item) =>
          !normalizedQuery ||
          `${item.nameAr} ${item.nameFr}`.toLowerCase().includes(normalizedQuery)
      ),
    }))
    .filter((category) => category.items.length > 0);

  function requestAdd(item: MenuItemView, size: Size | null, basePrice: number) {
    if (item.optionGroups.length > 0) setPendingAdd({ item, size, basePrice });
    else addToCart(item, size, basePrice, []);
  }

  function addToCart(item: MenuItemView, size: Size | null, basePrice: number, optionIds: string[]) {
    const resolved = resolveOptions(item.optionGroups, optionIds);
    if (!resolved.ok) return;
    const key = cartKey(item.id, size, resolved.optionIds);
    setCart((prev) => {
      const existing = prev[key];
      return {
        ...prev,
        [key]: existing
          ? { ...existing, quantity: existing.quantity + 1 }
          : {
              menuItemId: item.id,
              nameAr: item.nameAr,
              nameFr: item.nameFr,
              size,
              optionIds: resolved.optionIds,
              optionsAr: resolved.labelAr,
              optionsFr: resolved.labelFr,
              unitPrice: basePrice + resolved.priceDelta,
              quantity: 1,
            },
      };
    });
  }

  function updateQuantity(key: string, delta: number) {
    setCart((prev) => {
      const existing = prev[key];
      if (!existing) return prev;
      const quantity = existing.quantity + delta;
      const next = { ...prev };
      if (quantity <= 0) delete next[key];
      else next[key] = { ...existing, quantity };
      return next;
    });
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await placeWhatsAppOrder({
        mode,
        guestName,
        contactPhone,
        address: mode === "DELIVERY" ? address : "",
        note,
        items: lines.map(([, line]) => ({
          menuItemId: line.menuItemId,
          size: line.size ?? undefined,
          optionIds: line.optionIds,
          quantity: line.quantity,
        })),
      });
      if (result.status === "error") setError(result.message);
      else setCreated(result);
    });
  }

  function reset() {
    setCreated(null);
    setCart({});
    setGuestName("");
    setContactPhone("");
    setAddress("");
    setNote("");
    setQuery("");
    setError(null);
  }

  if (created) return <CreatedPanel order={created} lang={lang} onNext={reset} />;

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          {pick(lang, "طلب واتساب", "Commande WhatsApp")}
        </h1>
        <Link href="/admin/orders" className="text-sm text-neutral-500 hover:text-neutral-900">
          {pick(lang, "← الطلبات", "← Commandes")}
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_340px]">
        <section className="min-w-0">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={pick(lang, "ابحث عن طبق...", "Rechercher un plat...")}
            className={inputClass}
          />
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setActiveCategoryId(null)}
              className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs ${
                activeCategoryId === null
                  ? "border-[var(--sindibad-maroon)] bg-[var(--sindibad-maroon)] text-white"
                  : "border-neutral-300 text-neutral-600"
              }`}
            >
              {pick(lang, "الكل", "Tout")}
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() =>
                  setActiveCategoryId((current) => (current === category.id ? null : category.id))
                }
                className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs ${
                  activeCategoryId === category.id
                    ? "border-[var(--sindibad-maroon)] bg-[var(--sindibad-maroon)] text-white"
                    : "border-neutral-300 text-neutral-600"
                }`}
              >
                {pick(lang, category.nameAr, category.nameFr)}
              </button>
            ))}
          </div>

          <div className="mt-4 flex flex-col gap-5">
            {visibleCategories.length === 0 && (
              <p className="py-8 text-center text-sm text-neutral-500">
                {pick(lang, "لا توجد نتائج", "Aucun résultat")}
              </p>
            )}
            {visibleCategories.map((category) => (
              <div key={category.id}>
                <h2 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--sindibad-maroon)]">
                  {pick(lang, category.nameAr, category.nameFr)}
                </h2>
                <div className="divide-y divide-neutral-100 rounded-md border border-neutral-200">
                  {category.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-3 px-3 py-2">
                      <span className="min-w-0 text-sm text-neutral-900">
                        {pick(lang, item.nameAr, item.nameFr)}
                      </span>
                      <ItemButtons
                        item={item}
                        lang={lang}
                        onAdd={(size, basePrice) => requestAdd(item, size, basePrice)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <aside className="md:sticky md:top-20 md:self-start">
          <div className="rounded-lg border border-neutral-200 p-4">
            <div className="grid grid-cols-2 gap-1 rounded-md bg-neutral-100 p-1">
              {(["DELIVERY", "TAKEAWAY"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMode(value)}
                  className={`rounded px-3 py-2 text-sm font-medium ${
                    mode === value ? "bg-white shadow-sm" : "text-neutral-500"
                  }`}
                >
                  {value === "DELIVERY"
                    ? pick(lang, "🛵 توصيل", "🛵 Livraison")
                    : pick(lang, "🛍️ خارجي", "🛍️ À emporter")}
                </button>
              ))}
            </div>

            <div className="mt-3 flex flex-col gap-2">
              <input
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                maxLength={60}
                placeholder={
                  mode === "DELIVERY"
                    ? pick(lang, "اسم السائق / الشركة (مثلاً Glovo)", "Nom du livreur / app (ex. Glovo)")
                    : pick(lang, "اسم الزبون", "Nom du client")
                }
                className={inputClass}
              />
              <input
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                inputMode="tel"
                placeholder={pick(lang, "رقم واتساب (اختياري)", "N° WhatsApp (optionnel)")}
                className={inputClass}
              />
              {mode === "DELIVERY" && (
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  maxLength={300}
                  placeholder={pick(lang, "عنوان التوصيل (اختياري)", "Adresse de livraison (optionnel)")}
                  className={inputClass}
                />
              )}
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                maxLength={500}
                placeholder={pick(lang, "ملاحظة للمطبخ (اختياري)", "Note pour la cuisine (optionnel)")}
                className={inputClass}
              />
            </div>

            <div className="mt-4 border-t border-neutral-100 pt-3">
              {lines.length === 0 ? (
                <p className="py-4 text-center text-sm text-neutral-400">
                  {pick(lang, "أضف أطباقاً من القائمة", "Ajoutez des plats depuis le menu")}
                </p>
              ) : (
                <div className="flex max-h-72 flex-col divide-y divide-neutral-100 overflow-y-auto">
                  {lines.map(([key, line]) => (
                    <div key={key} className="flex items-center justify-between gap-2 py-2">
                      <div className="min-w-0">
                        <p className="text-sm text-neutral-900">
                          {pick(lang, line.nameAr, line.nameFr)}
                          {line.size === "LARGE" && (
                            <span className="ml-1 text-xs text-neutral-500">(L)</span>
                          )}
                        </p>
                        {line.optionsFr && (
                          <p className="text-xs text-neutral-500">
                            {pick(lang, line.optionsAr ?? "", line.optionsFr)}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          type="button"
                          onClick={() => updateQuantity(key, -1)}
                          className="h-7 w-7 rounded-full border border-neutral-300 text-sm"
                        >
                          −
                        </button>
                        <span className="w-4 text-center text-sm">{line.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(key, 1)}
                          className="h-7 w-7 rounded-full border border-neutral-300 text-sm"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {error && <p className="mt-2 text-sm text-red-700">{error}</p>}

            <button
              type="button"
              disabled={pending || lines.length === 0}
              onClick={submit}
              className="mt-3 w-full rounded-md bg-neutral-900 px-4 py-3 text-sm font-semibold text-white hover:bg-[var(--sindibad-maroon)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {pending
                ? pick(lang, "جارٍ الإرسال...", "Envoi...")
                : `${pick(lang, "إرسال إلى المطبخ", "Envoyer en cuisine")} · ${total} ${pick(lang, "درهم", "DH")}`}
            </button>
          </div>
        </aside>
      </div>

      {pendingAdd && (
        <OptionPicker
          key={`${pendingAdd.item.id}:${pendingAdd.size}`}
          pendingAdd={pendingAdd}
          lang={lang}
          onCancel={() => setPendingAdd(null)}
          onConfirm={(optionIds) => {
            addToCart(pendingAdd.item, pendingAdd.size, pendingAdd.basePrice, optionIds);
            setPendingAdd(null);
          }}
        />
      )}
    </main>
  );
}
