"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactElement } from "react";
import { useLanguage, pick } from "@/lib/language-context";
import { LanguageToggle } from "@/components/language-toggle";
import { logoutAdmin } from "@/app/actions/admin-auth";
import {
  IconGrid,
  IconStar,
  IconGift,
  IconCart,
  IconClipboard,
  IconPackage,
  IconHeart,
  IconUsers,
  IconChevronDown,
  IconLogout,
} from "@/app/admin/stock/icons";

type IconComponent = (props: { className?: string }) => ReactElement;

type NavLink = { href: string; ar: string; fr: string; icon: IconComponent };
type NavEntry =
  | ({ type: "link" } & NavLink)
  | { type: "group"; key: string; ar: string; fr: string; icon: IconComponent; items: NavLink[] };

function buildNav(role: string): NavEntry[] {
  if (role === "WORKER") {
    return [
      {
        type: "link",
        href: "/admin/stock/count",
        icon: IconClipboard,
        ar: "الجرد",
        fr: "Inventaire",
      },
    ];
  }

  const entries: NavEntry[] = [];

  if (role === "ADMIN") {
    entries.push({
      type: "link",
      href: "/admin/analytics",
      icon: IconGrid,
      ar: "لوحة القيادة",
      fr: "Tableau de bord",
    });
    entries.push({
      type: "group",
      key: "feedback",
      icon: IconStar,
      ar: "التقييمات",
      fr: "Avis",
      items: [
        { href: "/admin/feedback", icon: IconStar, ar: "التقييمات", fr: "Avis" },
        {
          href: "/admin/feedback/recovery",
          icon: IconHeart,
          ar: "معالجة الشكاوى",
          fr: "Récupération",
        },
        { href: "/admin/draw", icon: IconGift, ar: "السحب", fr: "Tirage" },
      ],
    });
  }

  entries.push({
    type: "link",
    href: "/admin/orders",
    icon: IconCart,
    ar: "الطلبات",
    fr: "Commandes",
  });

  if (role === "ADMIN") {
    entries.push({
      type: "link",
      href: "/admin/menu",
      icon: IconClipboard,
      ar: "القائمة",
      fr: "Menu",
    });
    entries.push({
      type: "link",
      href: "/admin/stock",
      icon: IconPackage,
      ar: "المخزون",
      fr: "Stock",
    });
  }

  entries.push({
    type: "link",
    href: "/admin/loyalty",
    icon: IconHeart,
    ar: "نقاط الولاء",
    fr: "Fidélité",
  });

  if (role === "ADMIN") {
    entries.push({
      type: "link",
      href: "/admin/staff",
      icon: IconUsers,
      ar: "الموظفون",
      fr: "Personnel",
    });
  }

  return entries;
}

function isEntryActive(entry: NavEntry, pathname: string) {
  if (entry.type === "link") {
    return entry.href === "/admin/analytics"
      ? pathname.startsWith(entry.href)
      : pathname.startsWith(entry.href);
  }
  return entry.items.some((item) => pathname.startsWith(item.href));
}

function DesktopGroup({
  entry,
  active,
  lang,
}: {
  entry: Extract<NavEntry, { type: "group" }>;
  active: boolean;
  lang: "ar" | "fr";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const Icon = entry.icon;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150 ${
          active
            ? "text-[var(--sindibad-maroon)]"
            : "text-neutral-600 hover:text-neutral-900"
        }`}
      >
        <Icon className="h-4 w-4" />
        {pick(lang, entry.ar, entry.fr)}
        <IconChevronDown
          className={`h-3.5 w-3.5 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 min-w-[180px] rounded-lg border border-neutral-200 bg-white py-1.5 shadow-lg">
          {entry.items.map((item) => {
            const ItemIcon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900"
              >
                <ItemIcon className="h-4 w-4 text-neutral-400" />
                {pick(lang, item.ar, item.fr)}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MobileGroup({
  entry,
  active,
  pathname,
  lang,
  onNavigate,
}: {
  entry: Extract<NavEntry, { type: "group" }>;
  active: boolean;
  pathname: string;
  lang: "ar" | "fr";
  onNavigate: () => void;
}) {
  const [expanded, setExpanded] = useState(active);
  const Icon = entry.icon;

  return (
    <div className="border-b border-neutral-100 last:border-b-0">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className={`flex min-h-[52px] w-full items-center gap-3 px-2 py-3 text-base font-medium ${
          active ? "text-[var(--sindibad-maroon)]" : "text-neutral-800"
        }`}
      >
        <Icon className="h-5 w-5 shrink-0" />
        <span className="flex-1 text-left">{pick(lang, entry.ar, entry.fr)}</span>
        <IconChevronDown
          className={`h-4 w-4 shrink-0 transition-transform duration-150 ${
            expanded ? "rotate-180" : ""
          }`}
        />
      </button>
      {expanded && (
        <div className="flex flex-col pb-2 pl-8">
          {entry.items.map((item) => {
            const ItemIcon = item.icon;
            // A nested sibling (e.g. /admin/feedback/recovery) wins over its parent.
            const itemActive =
              pathname.startsWith(item.href) &&
              !entry.items.some(
                (other) =>
                  other.href.length > item.href.length &&
                  pathname.startsWith(other.href)
              );
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={`flex min-h-[48px] items-center gap-3 rounded-md px-3 text-sm font-medium ${
                  itemActive
                    ? "bg-neutral-100 text-neutral-900"
                    : "text-neutral-600 active:bg-neutral-50"
                }`}
              >
                <ItemIcon className="h-4 w-4 shrink-0 text-neutral-400" />
                {pick(lang, item.ar, item.fr)}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function AdminNav({ role }: { role: string }) {
  const { lang } = useLanguage();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [openedForPathname, setOpenedForPathname] = useState(pathname);

  if (pathname !== openedForPathname) {
    setOpenedForPathname(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [open]);

  const nav = buildNav(role);

  return (
    <nav className="sticky top-0 z-40 border-b border-neutral-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link
          href="/admin"
          className="flex min-w-0 items-center gap-2"
        >
          <Image
            src="/brand/icon-mark.png"
            alt=""
            width={32}
            height={12}
            className="h-5 w-auto shrink-0"
          />
          <span className="truncate font-semibold tracking-tight">
            {pick(lang, "إدارة سندباد", "Sindibad Admin")}
          </span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {nav.map((entry) =>
            entry.type === "link" ? (
              <Link
                key={entry.href}
                href={entry.href}
                className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150 ${
                  isEntryActive(entry, pathname)
                    ? "text-[var(--sindibad-maroon)]"
                    : "text-neutral-600 hover:text-neutral-900"
                }`}
              >
                <entry.icon className="h-4 w-4" />
                {pick(lang, entry.ar, entry.fr)}
              </Link>
            ) : (
              <DesktopGroup
                key={entry.key}
                entry={entry}
                active={isEntryActive(entry, pathname)}
                lang={lang}
              />
            )
          )}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <LanguageToggle />
          <form action={logoutAdmin}>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900"
            >
              <IconLogout className="h-4 w-4" />
              {pick(lang, "تسجيل الخروج", "Se déconnecter")}
            </button>
          </form>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={pick(lang, "القائمة", "Menu")}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-neutral-200 text-neutral-600 active:bg-neutral-50 md:hidden"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
          >
            {open ? (
              <path d="M6 6l12 12M18 6L6 18" />
            ) : (
              <path d="M4 7h16M4 12h16M4 17h16" />
            )}
          </svg>
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 right-0 flex w-[88%] max-w-sm flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
              <span className="font-semibold tracking-tight">
                {pick(lang, "القائمة", "Menu")}
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={pick(lang, "إغلاق", "Fermer")}
                className="flex h-11 w-11 items-center justify-center rounded-md text-neutral-500 active:bg-neutral-50"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                >
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-2 py-2">
              {nav.map((entry) =>
                entry.type === "link" ? (
                  <Link
                    key={entry.href}
                    href={entry.href}
                    onClick={() => setOpen(false)}
                    className={`flex min-h-[52px] items-center gap-3 rounded-md border-b border-neutral-100 px-2 py-3 text-base font-medium last:border-b-0 ${
                      isEntryActive(entry, pathname)
                        ? "text-[var(--sindibad-maroon)]"
                        : "text-neutral-800 active:bg-neutral-50"
                    }`}
                  >
                    <entry.icon className="h-5 w-5 shrink-0" />
                    {pick(lang, entry.ar, entry.fr)}
                  </Link>
                ) : (
                  <MobileGroup
                    key={entry.key}
                    entry={entry}
                    active={isEntryActive(entry, pathname)}
                    pathname={pathname}
                    lang={lang}
                    onNavigate={() => setOpen(false)}
                  />
                )
              )}
            </div>

            <div className="flex items-center justify-between border-t border-neutral-100 px-4 py-4">
              <LanguageToggle />
              <form action={logoutAdmin}>
                <button
                  type="submit"
                  className="flex min-h-[44px] items-center gap-1.5 rounded-md px-3 text-sm font-medium text-neutral-500 active:bg-neutral-50"
                >
                  <IconLogout className="h-4 w-4" />
                  {pick(lang, "تسجيل الخروج", "Se déconnecter")}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
