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
    data = { title: '🔔 Atualização do seu Pedido!', body: event.data ? event.data.text() : 'Seu pedido foi atualizado.' };
  }

  const orderId = data.order_id || 'update';
  const status = data.status || 'status';
  const title = data.title || '🔔 Atualização do seu Pedido!';
  const options = {
    body: data.body || 'O status do seu pedido foi atualizado.',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: 'order-' + orderId + '-' + status,
    renotify: false,
    requireInteraction: true,
    vibrate: [200, 100, 200, 100, 300],
    data: {
      url: data.url || '/cardapio'
    }
  };

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Se o usuário estiver ativo e com foco na página, a própria página já exibe o status ao vivo
      const isFocused = clientList.some((c) => c.focused);
      if (isFocused) {
        return;
      }
      return self.registration.showNotification(title, options);
    })
  );
});

// Ao clicar na notificação, foca ou abre a tela do pedido
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/cardapio';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
