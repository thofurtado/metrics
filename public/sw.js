// Service Worker do Cardápio Digital Metrics (Web Push Nativo)
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Ouvinte de Push disparado pelos servidores do Google (FCM)
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: '⭐ Gostou do nosso atendimento?', body: event.data ? event.data.text() : 'Toque para avaliar.' };
  }

  const orderId = data.order_id || 'update';
  const status = data.status || 'status';
  const title = data.title || '⭐ Gostou do nosso atendimento?';
  const options = {
    body: data.body || 'Faça uma avaliação e nos ajude a crescer!',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: 'order-' + orderId + '-' + status,
    renotify: true,
    requireInteraction: true,
    vibrate: [200, 100, 200, 100, 300],
    data: {
      url: data.url || '/cardapio'
    }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Ao clicar na notificação, abre o link de avaliação ou foca a tela do pedido
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/cardapio';

  event.waitUntil(
    (async () => {
      // Se for link externo (Google Reviews, Maps, busca externa), abre direto em nova janela
      if (targetUrl.startsWith('http') && !targetUrl.includes(self.location.host)) {
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      }

      // Se for link interno da loja
      const clientList = await clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          if (targetUrl && targetUrl !== '/cardapio' && client.navigate) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })()
  );
});
