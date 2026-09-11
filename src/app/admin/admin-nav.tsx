"use client";

import Image from "next/image";
import Link from "next/link";
import { useLanguage, pick } from "@/lib/language-context";
import { LanguageToggle } from "@/components/language-toggle";
import { logoutAdmin } from "@/app/actions/admin-auth";

export function AdminNav() {
  const { lang } = useLanguage();

  return (
    <nav className="border-b border-neutral-200">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-4 px-6 py-4">
        <div className="flex items-center gap-6">
          <span className="flex items-center gap-2">
            <Image
              src="/brand/icon-mark.png"
              alt=""
              width={32}
              height={12}
              className="h-5 w-auto"
            />
            <span className="font-semibold tracking-tight">
              {pick(lang, "إدارة سندباد", "Sindibad Admin")}
            </span>
          </span>
          <Link
            href="/admin/feedback"
            className="text-sm text-neutral-600 hover:text-neutral-900"
          >
            {pick(lang, "التقييمات", "Avis")}
          </Link>
          <Link
            href="/admin/menu"
            className="text-sm text-neutral-600 hover:text-neutral-900"
          >
            {pick(lang, "القائمة", "Menu")}
          </Link>
          <Link
            href="/admin/draw"
            className="text-sm text-neutral-600 hover:text-neutral-900"
          >
            {pick(lang, "السحب", "Tirage")}
          </Link>
        </div>
        <div className="flex items-center gap-4">
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
    </nav>
  );
}
