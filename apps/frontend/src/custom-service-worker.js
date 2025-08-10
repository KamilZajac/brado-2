// sw-push.js (or in your custom SW)
importScripts('./ngsw-worker.js');

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data?.json() || {}; } catch {}

  const title = data.title || 'Update';
  const options = {
    body: data.body || '',
    icon: data.icon || '/assets/icons/icon-192.png',
    badge: data.badge || '/assets/icons/badge-72.png',
    tag: data.tag,                 // dedupe channel
    renotify: !!data.renotify,     // repeat sound/vibration if same tag
    requireInteraction: !!data.requireInteraction, // stay visible until user interacts
    data: {
      url: data.url || '/',
      analytics: data.analytics || null,
      _arrivedAt: Date.now(),
    },
    actions: data.actions || [
      { action: 'open', title: 'Open' },
    ],
  };

  // 1) Show OS/browser notification (for bg & hidden tabs)
  event.waitUntil(self.registration.showNotification(title, options));

  // 2) Also forward to any open pages so they can show an in-app toast
  event.waitUntil((async () => {
    const clientsList = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of clientsList) {
      c.postMessage({ type: 'PUSH_MESSAGE', payload: data });
    }
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';

  event.waitUntil((async () => {
    const all = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    const absolute = new URL(url, self.location.origin).href;
    const existing = all.find((w) => w.url === absolute || w.url.startsWith(absolute));

    if (existing) {
      await existing.focus();
      existing.postMessage({ type: 'PUSH_CLICK', url });
      return;
    }
    const opened = await clients.openWindow(absolute);
    if (opened) opened.postMessage?.({ type: 'PUSH_CLICK', url });
  })());
});

self.addEventListener('notificationclose', (event) => {
  // Optional: analytics about dismissals
  // You could postMessage to pages or hit a beacon endpoint here.
});
