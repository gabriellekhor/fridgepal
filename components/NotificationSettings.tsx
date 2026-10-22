
"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);

  return Uint8Array.from(rawData, (char) =>
    char.charCodeAt(0)
  );
}

export default function NotificationSettings() {
  const [supported, setSupported] = useState(true);
  const [permission, setPermission] =
    useState<NotificationPermission>("default");
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const available =
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;

    setSupported(available);

    if ("Notification" in window) {
      setPermission(Notification.permission);
    }

    if (available) {
      navigator.serviceWorker
        .register("/sw.js")
        .then(async (registration) => {
          const subscription =
            await registration.pushManager.getSubscription();

          setSubscribed(!!subscription);
        })
        .catch(console.error);
    }
  }, []);

  async function enableNotifications() {
    if (!supported || loading) return;

    setLoading(true);
    setMessage("");

    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError || !authData.user) {
        throw new Error("Please sign in first.");
      }

      const registration =
        await navigator.serviceWorker.ready;

      const result = await Notification.requestPermission();
      setPermission(result);

      if (result !== "granted") {
        throw new Error("Notification permission was not granted.");
      }

      const publicKey =
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

      if (!publicKey) {
        throw new Error("Missing VAPID public key.");
      }

      let subscription =
        await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey:
            urlBase64ToUint8Array(publicKey) as BufferSource,
        });
      }

      const subscriptionData = subscription.toJSON();

      const { error } = await supabase
        .from("push_subscriptions")
        .upsert(
          {
            user_id: authData.user.id,
            endpoint: subscription.endpoint,
            p256dh: subscriptionData.keys?.p256dh,
            auth_key: subscriptionData.keys?.auth,
          },
          { onConflict: "endpoint" }
        );

      if (error) throw error;

      setSubscribed(true);
      setMessage("Your device is subscribed to FridgePal notifications!");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not enable notifications."
      );
    } finally {
      setLoading(false);
    }
  }

async function sendTestNotification() {
  setLoading(true);
  setMessage("");

  try {
    const { data, error } =
      await supabase.auth.getSession();

    if (error || !data.session) {
      throw new Error("Please sign in first.");
    }

    const response = await fetch("/api/test-push", {
      method: "POST",
      headers: {
        Authorization:
          `Bearer ${data.session.access_token}`,
      },
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.error || "Notification failed."
      );
    }

    setMessage(
      `Test notification sent to ${result.sent} device(s)!`
    );
  } catch (error) {
    setMessage(
      error instanceof Error
        ? error.message
        : "Could not send notification."
    );
  } finally {
    setLoading(false);
  }
}

return (
  <div className="mt-6 rounded-xl bg-white p-6 shadow">
    <h2 className="mb-2 text-xl font-semibold">
      🔔 Notification Settings
    </h2>

    <p className="mb-4 text-sm text-gray-600">
      Receive alerts when groceries are about to expire.
    </p>

    {!supported ? (
      <p className="text-sm text-red-600">
        Push notifications are not supported here.
        On iPhone, open FridgePal from your Home Screen.
      </p>
    ) : (
      <>
        <button
          onClick={enableNotifications}
          disabled={loading}
          className="w-full rounded-xl bg-[#665548] p-3 font-medium text-white transition hover:bg-[#514237] disabled:opacity-50"
        >
          {loading
            ? "Enabling..."
            : subscribed
            ? "Verify Notification Subscription"
            : "Enable Notifications"}
        </button>

        {subscribed && (
          <button
            onClick={sendTestNotification}
            disabled={loading}
            className="mt-3 w-full rounded-xl border border-[#B5A58F] bg-white p-3 font-medium text-[#665548] transition hover:bg-[#F7F3ED] disabled:opacity-50"
          >
            🔔 Send Test Notification
          </button>
        )}
      </>
    )}

    {message && (
      <p className="mt-3 text-sm text-green-700">
        {message}
      </p>
    )}
  </div>
);
}


