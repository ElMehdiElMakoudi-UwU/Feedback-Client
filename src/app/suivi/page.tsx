import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { TrackingLookup } from "./tracking-lookup";

export const metadata: Metadata = {
  title: "Sindibad — Suivi de commande",
};

// Fallback for drivers who only have the code: a plain GET form, so it works
// even before the page's JavaScript has loaded on a weak connection.
export default async function TrackingLookupPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; notFound?: string }>;
}) {
  const { code, notFound } = await searchParams;
  const normalized = code?.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (normalized) redirect(`/suivi/${normalized}`);

  return <TrackingLookup notFound={notFound === "1"} />;
}
