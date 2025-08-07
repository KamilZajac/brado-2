importScripts('./ngsw-worker.js');

// Show notifications even when app is closed:
self.addEventListener('push', (event) => {
  const data = (() => {
    try { return event.data?.json() || {}; } catch { return {}; }
  })();

  event.waitUntil(
    self.registration.showNotification(data.title || 'Update', {
      body: data.body || '',
      icon: '/assets/icons/icon-192.png', // app icon is often used on iOS
      badge: '/assets/icons/badge.png'
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow('/')); // change to a deep link if needed
});
