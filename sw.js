// Service Worker — cache offline para SATECs e recursos estáticos
// Estratégia: network-first para HTML, cache-first para assets

var CACHE_NAME = 'cat-sertao-v1';
var CACHE_ASSETS = [
  './',
  './index.html',
  './conta.html',
  './usuarios.html',
  './log.html',
  './style.css',
  './common.js',
  './CAT-SERTAO-SEM-FUNDO.png',
  './manifest.webmanifest'
];

// Instalar: pré-cachear assets críticos
self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(CACHE_ASSETS);
    })
  );
  self.skipWaiting();
});

// Ativar: limpar caches antigos
self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (names) {
      return Promise.all(
        names.map(function (name) {
          if (name !== CACHE_NAME) return caches.delete(name);
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch: estratégias por tipo
self.addEventListener('fetch', function (e) {
  var url = new URL(e.request.url);

  // Nunca cachear respostas do Apps Script (autenticadas, mudam)
  if (url.origin !== self.location.origin) {
    return;
  }

  // Network-first para HTML (tenta rede, depois cache)
  if (e.request.url.endsWith('.html') || e.request.url === url.origin + '/') {
    e.respondWith(
      fetch(e.request)
        .then(function (res) {
          if (res && res.status === 200) {
            var clone = res.clone();
            caches.open(CACHE_NAME).then(function (cache) {
              cache.put(e.request, clone);
            });
            return res;
          }
          return res;
        })
        .catch(function () {
          return caches.match(e.request);
        })
    );
  }
  // Cache-first para CSS, JS, imagens, manifest (usa cache primeiro)
  else if (
    e.request.url.endsWith('.css') ||
    e.request.url.endsWith('.js') ||
    e.request.url.endsWith('.png') ||
    e.request.url.endsWith('.jpg') ||
    e.request.url.endsWith('.webp') ||
    e.request.url.endsWith('.webmanifest')
  ) {
    e.respondWith(
      caches.match(e.request).then(function (cached) {
        return cached || fetch(e.request);
      })
    );
  }
});
