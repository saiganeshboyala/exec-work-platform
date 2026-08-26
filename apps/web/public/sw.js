/*
 * Push service worker. Deliberately tiny: it shows what the server sent and
 * focuses an existing tab on click rather than opening a duplicate one.
 */

self.addEventListener('push', (event) => {
  let payload = { title: 'Update', body: '', url: '/' };

  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch {
    // A push with a non-JSON body is still worth surfacing.
    if (event.data) payload.body = event.data.text();
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      // Same tag collapses repeats instead of stacking them up.
      tag: 'ewp-notification',
      data: { url: payload.url },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(target);
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    }),
  );
});
