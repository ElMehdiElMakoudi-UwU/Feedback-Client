"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useLanguage, pick } from "@/lib/language-context";
import { LanguageToggle } from "@/components/language-toggle";
import { placeOrder, addItemsToOrder } from "@/app/actions/orders";
import { isTakeawayTable, isDeliveryTable } from "@/lib/order-mode";
import type { MenuSectionView, MenuItemView } from "@/app/menu/types";
import { resolveOptions, formatPriceDelta } from "@/lib/menu-options";

type Size = "REGULAR" | "LARGE";

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

type PendingAdd = { item: MenuItemView; size: Size | null; basePrice: number };

function cartKey(menuItemId: string, size: Size | null, optionIds: string[]) {
  return `${menuItemId}:${size ?? "REGULAR"}:${[...optionIds].sort().join(",")}`;
}

function OptionPicker({
  pendingAdd,
  lang,
  onCancel,
  onConfirm,
}: {
  pendingAdd: PendingAdd;
  lang: "ar" | "fr";
  onCancel: () => void;
  onConfirm: (optionIds: string[]) => void;
}) {
  const { item, size, basePrice } = pendingAdd;
  const groups = item.optionGroups;
  const [selected, setSelected] = useState<string[]>(() =>
    // Pre-select the first choice of required single-choice groups.
    groups
      .filter((g) => g.required && g.maxSelect === 1)
      .map((g) => g.options[0].id)
  );
  const [showErrors, setShowErrors] = useState(false);

  const resolved = resolveOptions(groups, selected);
  const unitPrice = basePrice + (resolved.ok ? resolved.priceDelta : 0);

  function toggle(groupId: string, optionId: string) {
    const group = groups.find((g) => g.id === groupId)!;
    const groupOptionIds = new Set(group.options.map((o) => o.id));
    setSelected((prev) => {
      if (group.maxSelect === 1) {
        const others = prev.filter((id) => !groupOptionIds.has(id));
        return prev.includes(optionId) && !group.required
          ? others
          : [...others, optionId];
      }
      if (prev.includes(optionId)) return prev.filter((id) => id !== optionId);
      const inGroup = prev.filter((id) => groupOptionIds.has(id)).length;
      if (group.maxSelect > 0 && inGroup >= group.maxSelect) return prev;
      return [...prev, optionId];
    });
  }

  function confirm() {
    if (!resolved.ok) {
      setShowErrors(true);
      return;
    }
    onConfirm(resolved.optionIds);
  }

  return (
    <div
      className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 sm:items-center"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-md flex-col rounded-t-xl bg-[var(--sindibad-cream)] sm:rounded-xl"
      >
        <div className="border-b border-[var(--sindibad-line)] px-5 py-4">
          <h3 className="font-display text-lg text-[var(--sindibad-ink)]">
            {pick(lang, item.nameAr, item.nameFr)}
            {size === "LARGE" && (
              <span className="ml-1 text-sm text-[var(--sindibad-muted)]">(L)</span>
            )}
          </h3>
        </div>

        <div className="flex flex-col gap-5 overflow-y-auto px-5 py-4">
          {groups.map((group) => {
            const count = group.options.filter((o) => selected.includes(o.id)).length;
            const invalid =
              showErrors && !resolved.ok && resolved.groupId === group.id;
            return (
              <fieldset key={group.id}>
                <legend className="mb-2 flex w-full items-baseline justify-between gap-2">
                  <span className="text-sm font-medium text-[var(--sindibad-ink)]">
                    {pick(lang, group.nameAr, group.nameFr)}
                  </span>
                  <span
                    className={`text-xs ${invalid ? "text-red-700" : "text-[var(--sindibad-muted)]"}`}
                  >
                    {group.required
                      ? pick(lang, "إجباري", "Obligatoire")
                      : pick(lang, "اختياري", "Optionnel")}
                    {group.maxSelect > 1 &&
                      ` · ${count}/${group.maxSelect}`}
                  </span>
                </legend>
                <div className="flex flex-col gap-1.5">
                  {group.options.map((option) => {
                    const checked = selected.includes(option.id);
                    return (
                      <label
                        key={option.id}
                        className={`flex cursor-pointer items-center justify-between gap-3 rounded-md border px-3 py-2.5 text-sm transition ${
                          checked
                            ? "border-[var(--sindibad-maroon)] bg-[var(--sindibad-paper)]"
                            : "border-[var(--sindibad-line)]"
                        }`}
                      >
                        <span className="flex items-center gap-2.5">
                          <input
                            type={group.maxSelect === 1 ? "radio" : "checkbox"}
                            name={group.id}
                            checked={checked}
                            onChange={() => toggle(group.id, option.id)}
                            onClick={() => {
                              // Radios don't fire onChange when re-clicked; allow
                              // un-selecting an optional single choice.
                              if (group.maxSelect === 1 && checked && !group.required) {
                                toggle(group.id, option.id);
                              }
                            }}
                            className="accent-[var(--sindibad-maroon)]"
                          />
                          {pick(lang, option.nameAr, option.nameFr)}
                        </span>
                        {option.priceDelta !== 0 && (
                          <span className="whitespace-nowrap text-xs text-[var(--sindibad-muted)]">
                            {formatPriceDelta(option.priceDelta)} {pick(lang, "درهم", "DH")}
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            );
          })}
        </div>

        <div className="flex items-center gap-3 border-t border-[var(--sindibad-line)] px-5 py-4">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-[var(--sindibad-line)] px-4 py-3 text-sm text-[var(--sindibad-muted)]"
          >
            {pick(lang, "إلغاء", "Annuler")}
          </button>
          <button
            type="button"
            onClick={confirm}
            className="font-display flex-1 rounded-md bg-[var(--sindibad-ink)] px-4 py-3 text-sm tracking-wide text-[var(--sindibad-cream)] transition hover:bg-[var(--sindibad-maroon)]"
          >
            {pick(lang, "إضافة", "Ajouter")} · {unitPrice} {pick(lang, "درهم", "DH")}
          </button>
        </div>
      </div>
    </div>
  );
}

function ItemRow({
  item,
  lang,
  onAdd,
}: {
  item: MenuItemView;
  lang: "ar" | "fr";
  onAdd: (size: Size | null, unitPrice: number) => void;
}) {
  if (item.comingSoon) return null;

  const hasSizes = item.priceLarge != null && item.price != null;
  const orderable = item.price != null || item.priceLarge != null;

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-[var(--sindibad-line)] bg-[var(--sindibad-paper)]">
      <div className="aspect-square w-full bg-[var(--sindibad-line)]/30">
        {item.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.photoUrl}
            alt={pick(lang, item.nameAr, item.nameFr)}
            className="h-full w-full object-cover"
          />
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-1 p-3">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="font-display text-base leading-tight text-[var(--sindibad-ink)]">
            {pick(lang, item.nameAr, item.nameFr)}
          </h3>
          {!hasSizes && item.price != null && (
            <span className="whitespace-nowrap text-sm text-[var(--sindibad-ink)]">
              {item.price} {pick(lang, "درهم", "DH")}
            </span>
          )}
        </div>

        {item.noteAr || item.noteFr ? (
          <span className="w-fit whitespace-nowrap rounded-full bg-[var(--sindibad-rose)]/25 px-2 py-0.5 text-xs text-[var(--sindibad-maroon)]">
            {pick(lang, item.noteAr ?? "", item.noteFr ?? "")}
          </span>
        ) : null}

        {(item.descriptionAr || item.descriptionFr) && (
          <p className="text-xs leading-relaxed text-[var(--sindibad-muted)]">
            {pick(lang, item.descriptionAr ?? "", item.descriptionFr ?? "")}
          </p>
        )}

        <div className="mt-auto pt-2">
          {!orderable ? null : hasSizes ? (
            <div className="flex flex-col gap-1.5">
              <button
                type="button"
                onClick={() => onAdd("REGULAR", item.price as number)}
                className="rounded-md border border-[var(--sindibad-line)] px-2 py-1.5 text-xs transition hover:border-[var(--sindibad-maroon)] hover:text-[var(--sindibad-maroon)]"
              >
                {pick(lang, "إضافة (صغير)", "Ajouter (M)")} · {item.price}{" "}
                {pick(lang, "درهم", "DH")}
              </button>
              <button
                type="button"
                onClick={() => onAdd("LARGE", item.priceLarge as number)}
                className="rounded-md border border-[var(--sindibad-line)] px-2 py-1.5 text-xs transition hover:border-[var(--sindibad-maroon)] hover:text-[var(--sindibad-maroon)]"
              >
                {pick(lang, "إضافة (كبير)", "Ajouter (L)")} · {item.priceLarge}{" "}
                {pick(lang, "درهم", "DH")}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onAdd(null, item.price as number)}
              className="w-full rounded-md border border-[var(--sindibad-line)] px-2 py-1.5 text-xs transition hover:border-[var(--sindibad-maroon)] hover:text-[var(--sindibad-maroon)]"
            >
              {pick(lang, "إضافة", "Ajouter")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function OrderBuilder({
  tableNumber,
  sections,
  initialPhone = "",
  initialAddress = "",
  addToOrderId,
}: {
  tableNumber: string;
  sections: MenuSectionView[];
  initialPhone?: string;
  initialAddress?: string;
  addToOrderId?: string;
}) {
  const { lang } = useLanguage();
  const isTakeaway = isTakeawayTable(tableNumber);
  const isDelivery = isDeliveryTable(tableNumber);
  const [cart, setCart] = useState<Record<string, CartLine>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [pendingAdd, setPendingAdd] = useState<PendingAdd | null>(null);
  const cartRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef<number | null>(null);

  // Roll the cart down as soon as the guest scrolls the menu, so it never
  // hides the dishes they're browsing. Skip while typing in the cart: the
  // mobile keyboard scrolls the page to reveal the focused field.
  useEffect(() => {
    if (!cartOpen) return;
    const openedAt = window.scrollY;
    function onScroll() {
      if (cartRef.current?.contains(document.activeElement)) return;
      if (Math.abs(window.scrollY - openedAt) > 48) setCartOpen(false);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [cartOpen]);

  function onDragStart(e: React.TouchEvent) {
    dragStartY.current = e.touches[0].clientY;
  }

  function onDragEnd(e: React.TouchEvent) {
    const start = dragStartY.current;
    dragStartY.current = null;
    if (start === null) return;
    const dy = e.changedTouches[0].clientY - start;
    if (dy > 40) setCartOpen(false);
    else if (dy < -40) setCartOpen(true);
  }

  const lines = useMemo(() => Object.values(cart), [cart]);
  const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);
  const total = lines.reduce(
    (sum, line) => sum + line.unitPrice * line.quantity,
    0
  );

  const categories = useMemo(
    () =>
      sections.flatMap((section) =>
        section.categories.map((category) => ({
          id: category.id,
          nameAr: category.nameAr,
          nameFr: category.nameFr,
        }))
      ),
    [sections]
  );

  const normalizedQuery = query.trim().toLowerCase();

  const filteredSections = useMemo(() => {
    return sections
      .map((section) => ({
        ...section,
        categories: section.categories
          .filter(
            (category) => !activeCategoryId || category.id === activeCategoryId
          )
          .map((category) => ({
            ...category,
            items: category.items.filter((item) => {
              if (!normalizedQuery) return true;
              const haystack = [
                item.nameAr,
                item.nameFr,
                item.descriptionAr,
                item.descriptionFr,
              ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();
              return haystack.includes(normalizedQuery);
            }),
          }))
          .filter((category) => category.items.length > 0),
      }))
      .filter((section) => section.categories.length > 0);
  }, [sections, normalizedQuery, activeCategoryId]);

  function requestAdd(item: MenuItemView, size: Size | null, basePrice: number) {
    if (item.optionGroups.length > 0) {
      setPendingAdd({ item, size, basePrice });
    } else {
      addToCart(item, size, basePrice, []);
    }
  }

  function addToCart(
    item: MenuItemView,
    size: Size | null,
    basePrice: number,
    optionIds: string[]
  ) {
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
    setCartOpen(true);
  }

  function updateQuantity(key: string, delta: number) {
    setCart((prev) => {
      const existing = prev[key];
      if (!existing) return prev;
      const quantity = existing.quantity + delta;
      if (quantity <= 0) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: { ...existing, quantity } };
    });
  }

  function submitOrder() {
    setError(null);
    startTransition(async () => {
      const cartItems = lines.map((line) => ({
        menuItemId: line.menuItemId,
        size: line.size ?? undefined,
        optionIds: line.optionIds,
        quantity: line.quantity,
      }));
      const result = addToOrderId
        ? await addItemsToOrder({
            orderId: addToOrderId,
            tableNumber,
            items: cartItems,
          })
        : await placeOrder({
            tableNumber,
            phone: initialPhone,
            address: initialAddress,
            note,
            items: cartItems,
          });
      if (result?.status === "error") {
        setError(result.message);
      }
    });
  }

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-5 pb-32">
      <header className="sticky top-0 z-10 -mx-5 mb-6 border-b border-[var(--sindibad-line)] bg-[var(--sindibad-cream)]/95 px-5 py-3 backdrop-blur">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/brand/icon-mark.png"
              alt=""
              width={36}
              height={14}
              className="h-6 w-auto"
            />
            <span className="font-display text-lg tracking-wide">
              {pick(lang, "سندباد", "Sindibad")}
            </span>
          </Link>
          <LanguageToggle />
        </div>
        <p className="mt-2 text-sm text-[var(--sindibad-muted)]">
          {isTakeaway
            ? pick(lang, "طلب خارجي", "Commande à emporter")
            : isDelivery
              ? pick(lang, "طلب توصيل", "Commande en livraison")
              : `${pick(lang, "طاولة رقم", "Table n°")} ${tableNumber}`}
        </p>

        <div className="mt-3">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={pick(lang, "ابحث عن طبق...", "Rechercher un plat...")}
            className="w-full rounded-md border border-[var(--sindibad-line)] bg-[var(--sindibad-paper)] px-4 py-2.5 text-sm focus:border-[var(--sindibad-maroon)] focus:outline-none"
          />
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setActiveCategoryId(null)}
            className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-sm transition ${
              activeCategoryId === null
                ? "border-[var(--sindibad-maroon)] bg-[var(--sindibad-maroon)] text-[var(--sindibad-cream)]"
                : "border-[var(--sindibad-line)] text-[var(--sindibad-muted)]"
            }`}
          >
            {pick(lang, "الكل", "Tout")}
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() =>
                setActiveCategoryId((current) =>
                  current === category.id ? null : category.id
                )
              }
              className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-sm transition ${
                activeCategoryId === category.id
                  ? "border-[var(--sindibad-maroon)] bg-[var(--sindibad-maroon)] text-[var(--sindibad-cream)]"
                  : "border-[var(--sindibad-line)] text-[var(--sindibad-muted)]"
              }`}
            >
              {pick(lang, category.nameAr, category.nameFr)}
            </button>
          ))}
        </div>
      </header>

      <div className="mb-8 text-center">
        <h1 className="font-display text-3xl tracking-wide">
          {addToOrderId
            ? pick(lang, "إضافة إلى طلبكم", "Ajouter à ma commande")
            : pick(lang, "اطلبوا الآن", "Commander")}
        </h1>
        <div className="hairline mx-auto mt-3 w-40" />
      </div>

      {filteredSections.length === 0 && (
        <p className="py-10 text-center text-sm text-[var(--sindibad-muted)]">
          {pick(lang, "لا توجد نتائج", "Aucun résultat")}
        </p>
      )}

      <div className="flex flex-col gap-14">
        {filteredSections.map((section) => (
          <section key={section.id}>
            <h2 className="font-display mb-6 text-center text-2xl tracking-wide">
              {pick(lang, section.nameAr, section.nameFr)}
            </h2>
            <div className="flex flex-col gap-10">
              {section.categories.map((category) => (
                <div key={category.id}>
                  <h3 className="font-display mb-2 text-center text-xl tracking-[0.08em] text-[var(--sindibad-maroon)]">
                    {pick(lang, category.nameAr, category.nameFr)}
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {category.items.map((item) => (
                      <ItemRow
                        key={item.id}
                        item={item}
                        lang={lang}
                        onAdd={(size, unitPrice) => requestAdd(item, size, unitPrice)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {itemCount > 0 && (
        <div
          ref={cartRef}
          className={`fixed inset-x-0 bottom-0 z-20 rounded-t-2xl border-t border-[var(--sindibad-line)] bg-[var(--sindibad-cream)]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur transition-shadow duration-300 ${
            cartOpen ? "shadow-[0_-12px_32px_rgba(0,0,0,0.12)]" : "shadow-none"
          }`}
        >
          <button
            type="button"
            aria-label={
              cartOpen
                ? pick(lang, "إخفاء السلة", "Masquer le panier")
                : pick(lang, "عرض السلة", "Afficher le panier")
            }
            aria-expanded={cartOpen}
            onClick={() => setCartOpen((v) => !v)}
            onTouchStart={onDragStart}
            onTouchEnd={onDragEnd}
            className="flex w-full touch-none justify-center pt-2 pb-1"
          >
            <span className="h-1 w-10 rounded-full bg-[var(--sindibad-line)]" />
          </button>

          <div
            inert={!cartOpen}
            className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${
              cartOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
            }`}
          >
            <div className="min-h-0 overflow-hidden">
            <div className="mx-auto max-h-[55vh] max-w-2xl overflow-y-auto overscroll-contain px-5 pt-2">
              <div className="flex flex-col divide-y divide-[var(--sindibad-line)]">
                {lines.map((line) => {
                  const key = cartKey(line.menuItemId, line.size, line.optionIds);
                  return (
                    <div
                      key={key}
                      className="flex items-center justify-between gap-3 py-3"
                    >
                      <div>
                        <p className="text-sm text-[var(--sindibad-ink)]">
                          {pick(lang, line.nameAr, line.nameFr)}
                          {line.size === "LARGE" && (
                            <span className="ml-1 text-xs text-[var(--sindibad-muted)]">
                              (L)
                            </span>
                          )}
                        </p>
                        {line.optionsFr && (
                          <p className="text-xs text-[var(--sindibad-muted)]">
                            {pick(lang, line.optionsAr ?? "", line.optionsFr)}
                          </p>
                        )}
                        <p className="text-xs text-[var(--sindibad-muted)]">
                          {line.unitPrice} {pick(lang, "درهم", "DH")}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => updateQuantity(key, -1)}
                          className="h-7 w-7 rounded-full border border-[var(--sindibad-line)] text-sm"
                        >
                          −
                        </button>
                        <span className="w-4 text-center text-sm">
                          {line.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(key, 1)}
                          className="h-7 w-7 rounded-full border border-[var(--sindibad-line)] text-sm"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {!addToOrderId && (
                <div className="flex flex-col gap-3 py-4">
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                    maxLength={500}
                    placeholder={pick(
                      lang,
                      "ملاحظة على الطلب (اختياري)",
                      "Note sur la commande (optionnel)"
                    )}
                    className="w-full rounded-md border border-[var(--sindibad-line)] bg-[var(--sindibad-paper)] px-4 py-3 text-sm focus:border-[var(--sindibad-maroon)] focus:outline-none"
                  />
                </div>
              )}

            </div>
            </div>
          </div>

          {error && (
            <p className="mx-auto max-w-2xl px-5 pt-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <div
            onTouchStart={onDragStart}
            onTouchEnd={onDragEnd}
            className="mx-auto flex max-w-2xl items-center justify-between gap-4 px-5 pt-2 pb-4"
          >
            <button
              type="button"
              aria-expanded={cartOpen}
              onClick={() => setCartOpen((v) => !v)}
              className="flex items-center gap-2 text-sm text-[var(--sindibad-muted)]"
            >
              <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-[var(--sindibad-maroon)] px-1.5 text-xs text-[var(--sindibad-cream)]">
                {itemCount}
              </span>
              <span className="text-[var(--sindibad-ink)]">
                {total} {pick(lang, "درهم", "DH")}
              </span>
              <svg
                aria-hidden
                viewBox="0 0 20 20"
                className={`h-4 w-4 transition-transform duration-300 ${
                  cartOpen ? "rotate-180" : ""
                }`}
              >
                <path
                  d="M5 12l5-5 5 5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={submitOrder}
              className="font-display rounded-md bg-[var(--sindibad-ink)] px-6 py-3 text-sm tracking-wide text-[var(--sindibad-cream)] transition hover:bg-[var(--sindibad-maroon)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {pending
                ? pick(lang, "جارٍ الإرسال...", "Envoi...")
                : addToOrderId
                  ? pick(lang, "إضافة إلى الطلب", "Ajouter à la commande")
                  : pick(lang, "تأكيد الطلب", "Valider la commande")}
            </button>
          </div>
        </div>
      )}

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
