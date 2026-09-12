"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useLanguage, pick } from "@/lib/language-context";
import { LanguageToggle } from "@/components/language-toggle";
import { logoutAdmin } from "@/app/actions/admin-auth";

function NavLinks({ role, onNavigate }: { role: string; onNavigate?: () => void }) {
  const { lang } = useLanguage();

  return (
    <>
      {role === "ADMIN" && (
        <>
          <Link
            href="/admin/analytics"
            onClick={onNavigate}
            className="text-sm text-neutral-600 hover:text-neutral-900"
          >
            {pick(lang, "التحليلات", "Analytique")}
          </Link>
          <Link
            href="/admin/feedback"
            onClick={onNavigate}
            className="text-sm text-neutral-600 hover:text-neutral-900"
          >
            {pick(lang, "التقييمات", "Avis")}
          </Link>
          <Link
            href="/admin/menu"
            onClick={onNavigate}
            className="text-sm text-neutral-600 hover:text-neutral-900"
          >
            {pick(lang, "القائمة", "Menu")}
          </Link>
          <Link
            href="/admin/draw"
            onClick={onNavigate}
            className="text-sm text-neutral-600 hover:text-neutral-900"
          >
            {pick(lang, "السحب", "Tirage")}
          </Link>
        </>
      )}
      <Link
        href="/admin/orders"
        onClick={onNavigate}
        className="text-sm text-neutral-600 hover:text-neutral-900"
      >
        {pick(lang, "الطلبات", "Commandes")}
      </Link>
      <Link
        href="/admin/loyalty"
        onClick={onNavigate}
        className="text-sm text-neutral-600 hover:text-neutral-900"
      >
        {pick(lang, "نقاط الولاء", "Fidélité")}
      </Link>
      {role === "ADMIN" && (
        <Link
          href="/admin/staff"
          onClick={onNavigate}
          className="text-sm text-neutral-600 hover:text-neutral-900"
        >
          {pick(lang, "الموظفون", "Personnel")}
        </Link>
      )}
    </>
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

  return (
    <nav className="border-b border-neutral-200">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-6 py-4">
        <div className="flex min-w-0 items-center gap-6">
          <span className="flex min-w-0 items-center gap-2">
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
          </span>
          <div className="hidden items-center gap-6 sm:flex">
            <NavLinks role={role} />
          </div>
        </div>
        <div className="hidden items-center gap-4 sm:flex">
          <LanguageToggle />
          <form action={logoutAdmin}>
            <button
              type="submit"
              className="text-sm text-neutral-500 hover:text-neutral-900"
            >
              {pick(lang, "تسجيل الخروج", "Se déconnecter")}
            </button>
          </form>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={pick(lang, "القائمة", "Menu")}
          className="shrink-0 rounded-md border border-neutral-200 p-2 text-neutral-600 sm:hidden"
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
        <div className="flex flex-col gap-4 border-t border-neutral-200 px-6 py-4 sm:hidden">
          <NavLinks role={role} onNavigate={() => setOpen(false)} />
          <div className="flex items-center justify-between border-t border-neutral-100 pt-4">
            <LanguageToggle />
            <form action={logoutAdmin}>
              <button
                type="submit"
                className="text-sm text-neutral-500 hover:text-neutral-900"
              >
                {pick(lang, "تسجيل الخروج", "Se déconnecter")}
              </button>
            </form>
          </div>
        </div>
      )}
    </nav>
  );
}
