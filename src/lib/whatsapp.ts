import { formatOrderNumber } from "@/lib/order-status";

export function trackingPath(trackingCode: string) {
  return `/suivi/${trackingCode}`;
}

// The message staff send back to the driver, in French and Arabic.
export function driverTrackingMessage(
  number: number,
  trackingCode: string,
  origin: string
) {
  const ticket = formatOrderNumber(number);
  const link = `${origin}${trackingPath(trackingCode)}`;
  return [
    `Sindibad — Commande n° ${ticket}`,
    `Suivez votre commande ici : ${link}`,
    `Code : ${trackingCode}`,
    "",
    `سندباد — طلب رقم ${ticket}`,
    `تابع حالة طلبك هنا: ${link}`,
  ].join("\n");
}

// wa.me wants the number in international format without "+" or leading 0s.
// Local Moroccan numbers (06…, 07…, 05…) are assumed when no country code is given.
function toWaNumber(phone: string) {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  else if (digits.startsWith("0") && digits.length === 10) digits = "212" + digits.slice(1);
  return digits;
}

export function whatsAppLink(text: string, phone?: string | null) {
  const target = phone ? toWaNumber(phone) : "";
  return `https://wa.me/${target}?text=${encodeURIComponent(text)}`;
}
