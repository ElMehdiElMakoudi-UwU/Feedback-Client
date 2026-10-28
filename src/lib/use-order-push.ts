"use client";

import { useEffect, useState } from "react";
import { subscribeToOrderPush } from "@/app/actions/orders";

export type OrderPushState =
  | "unsupported"
  | "unsubscribed"
  | "subscribing"
  | "subscribed"
  | "denied";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

// Web push for one order's status changes, shared by the guest confirmation
// page and the driver tracking page.
export function useOrderPush(orderId: string) {
  // Push support can only be detected in the browser; start from the same
  // value the server renders and resolve it after mount to avoid a hydration
  // mismatch.
  const [pushState, setPushState] = useState<OrderPushState>("unsupported");

  useEffect(() => {
    // "denied" renders the same as the initial "unsupported", so leave it be.
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (Notification.permission === "denied") return;

    let cancelled = false;
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => registration.pushManager.getSubscription())
      .then((subscription) => {
        if (!cancelled) setPushState(subscription ? "subscribed" : "unsubscribed");
      })
      .catch(() => {
        if (!cancelled) setPushState("unsubscribed");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function enablePushNotifications() {
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey) return;

    setPushState("subscribing");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setPushState(permission === "denied" ? "denied" : "unsubscribed");
        return;
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      const json = subscription.toJSON();
      await subscribeToOrderPush({
        orderId,
        endpoint: subscription.endpoint,
        keys: {
          p256dh: json.keys?.p256dh ?? "",
          auth: json.keys?.auth ?? "",
        },
      });

      setPushState("subscribed");
    } catch {
      setPushState("unsubscribed");
    }
  }

  return { pushState, enablePushNotifications };
}
