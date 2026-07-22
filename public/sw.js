const CACHE = 'pancitos-mordi2-v2'
const APP_SHELL = ['/', '/index.html', '/manifest.webmanifest']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)).catch(() => {}))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))))
  self.clients.claim()
})

// Solo interceptamos navegaciones (network-first). El resto pasa directo
// para no romper el HMR de Vite ni la carga de módulos en desarrollo.
self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return
  event.respondWith(
    fetch(event.request).catch(() => caches.match('/index.html'))
  )
})

// Notificación push entrante (nuevo pedido)
self.addEventListener('push', (event) => {
  let payload = { title: '🔔 ¡Nuevo pedido!', body: 'Tienes un pedido nuevo.', data: { url: '/' } }
  try {
    if (event.data) payload = { ...payload, ...event.data.json() }
  } catch (_) {}
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      vibrate: [200, 100, 200],
      requireInteraction: true,
      tag: 'pm-order',
      renotify: true,
      data: payload.data || { url: '/' },
    })
  )
})

// Clic en la notificación: enfoca o abre la app del admin
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) return client.focus()
      }
      if (self.clients.openWindow) return self.clients.openWindow(url)
    })
  )
})
