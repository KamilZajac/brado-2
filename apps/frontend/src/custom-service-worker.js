self.addEventListener('push', function (event) {
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/assets/icons/icon-72x72.png',
      badge: '/assets/icons/badge.png'
    })
  );
});
