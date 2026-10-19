
"use client";

import { useEffect, useState } from "react";

export default function NotificationSettings() {
  const [supported, setSupported] = useState(true);
  const [permission, setPermission] =
    useState<NotificationPermission>("default");
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
        .catch((error) => {
          console.error("Service worker error:", error);
          setMessage("Could not register service worker.");
        });
    }
  }, []);

  async function enableNotifications() {
    setMessage("");

    if (!supported) {
      setMessage("Push notifications aren't supported here.");
      return;
    }

    try {
      const result = await Notification.requestPermission();

      setPermission(result);

      if (result === "granted") {
        setMessage("Notifications enabled on this device!");
      } else if (result === "denied") {
        setMessage(
          "Notifications are blocked. Enable them in your device settings."
        );
      } else {
        setMessage("Notification permission was not granted.");
      }
    } catch {
      setMessage("Could not request notification permission.");
    }
  }

  return (
    <div className="mt-6 rounded-xl bg-white p-6 shadow">
      <h2 className="mb-2 text-xl font-semibold">
        🔔 Notification Settings
      </h2>

      <p className="mb-4 text-sm text-gray-600">
        Get alerts when groceries are about to expire.
      </p>

      {!supported ? (
        <p className="text-sm text-red-600">
          Push notifications are not supported in this browser.
          On iPhone, open FridgePal from your Home Screen.
        </p>
      ) : (
        <button
          onClick={enableNotifications}
          disabled={permission === "granted"}
          className="w-full rounded bg-green-700 p-3 text-white disabled:opacity-50"
        >
          {permission === "granted"
            ? "Notifications Allowed ✓"
            : "Enable Notifications"}
        </button>
      )}

      {message && (
        <p className="mt-3 text-sm text-green-700">
          {message}
        </p>
      )}
    </div>
  );
}
