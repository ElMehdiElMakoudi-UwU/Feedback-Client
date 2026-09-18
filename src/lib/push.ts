import webPush from "web-push";
import { prisma } from "@/lib/prisma";

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const subject = process.env.VAPID_SUBJECT;

if (publicKey && privateKey && subject) {
  webPush.setVapidDetails(subject, publicKey, privateKey);
}

export async function sendOrderPushNotification(
  orderId: string,
  payload: { title: string; body: string }
) {
  if (!publicKey || !privateKey || !subject) return;

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { orderId },
  });

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webPush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          },
          JSON.stringify(payload)
        );
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await prisma.pushSubscription.delete({
            where: { id: subscription.id },
          });
        }
      }
    })
  );
}
