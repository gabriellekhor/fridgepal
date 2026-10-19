
self.addEventListener("push", (event) => {
  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }

  const title = data.title || "FridgePal Reminder";

  const options = {
    body: data.body || "Check your fridge for expiring food!",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: "fridgepal-expiry",
    data: {
      url: "/",
    },
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
