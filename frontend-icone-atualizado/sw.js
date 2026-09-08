/**
 * Service Worker mínimo — necessário para o navegador considerar o site
 * "instalável" como app (critério do Chrome/Android). Não faz cache
 * agressivo de nada para não guardar dados desatualizados: só repassa
 * as requisições direto para a rede.
 */
self.addEventListener('install', function (event) {
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  self.clients.claim();
});

self.addEventListener('fetch', function (event) {
  event.respondWith(fetch(event.request));
});
