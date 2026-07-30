// Service Worker — cache offline para SATECs e recursos estáticos
// Estratégia: network-first para HTML/CSS/JS (sempre busca a versão mais
// recente quando há sinal; cache só cobre o cenário sem sinal), cache-first
// apenas para imagem/manifest (raramente mudam, sem custo de ficar atrasado).
//
// Importante: o navegador só verifica se este arquivo mudou (e reinstala o
// worker) de tempos em tempos / a cada navegação -- por isso qualquer ajuste
// na ESTRATÉGIA de cache exige subir a versão abaixo, senão quem já tinha o
// site instalado fica preso na versão antiga (foi o que aconteceu com o CSS
// cache-first anterior: uma correção publicada não chegava a quem já tinha
// o Service Worker instalado).
var CACHE_NAME = 'cat-sertao-v4';
var CACHE_ASSETS = [
  './',
  './index.html',
  './conta.html',
  './usuarios.html',
  './log.html',
  './style.css',
  './common.js',
  './CAT-SERTAO-SEM-FUNDO.png',
  './icon-512.png',
  './manifest.webmanifest'
];

// Instalar: pre-cachear assets criticos.
// cache.add por item (nao addAll): addAll e atomico -- um unico 404 na lista
// rejeita a Promise inteira, o install falha e o Service Worker nunca ativa,
// deixando o site sem offline nenhum. Blindagem preventiva: se um item futuro
// sumir do repositorio, o resto do cache continua funcionando em vez de tudo
// falhar silenciosamente.
self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return Promise.all(CACHE_ASSETS.map(function (url) {
        return cache.add(url).catch(function () { /* segue sem esse item */ });
      }));
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

// URL da raiz do escopo (ex.: https://aquinogr89.github.io/catsertao/) --
// comparar direto com "origin + '/'" nunca casava em GitHub Pages de
// projeto, porque falta o "/catsertao/" do caminho: o fallback offline da
// própria raiz do site ficava sem cobertura nenhuma.
var SCOPE_ROOT_URL = new URL('./', self.registration.scope).href;

// Fetch: estratégias por tipo
self.addEventListener('fetch', function (e) {
  var url = new URL(e.request.url);

  // Nunca cachear respostas do Apps Script (autenticadas, mudam)
  if (url.origin !== self.location.origin) {
    return;
  }

  // Decide pelo pathname, não pela URL completa: e.request.url incluiria
  // qualquer query string (ex.: style.css?v=2, o ?expirado=1 do aviso de
  // sessão), e um endsWith('.css') contra isso falha -- o pedido escapava
  // dos dois ramos abaixo, sem cache e sem fallback offline nenhum.
  var p = url.pathname;
  var isNavegacao = e.request.mode === 'navigate';

  // Network-first para navegação (HTML) e para CSS/JS (tenta rede, cai pro
  // cache só sem sinal) -- são arquivos pequenos, o custo de rebuscar é
  // irrelevante perto do risco de prender alguém numa versão desatualizada
  // do site. mode==='navigate' cobre a raiz do site e qualquer navegação
  // direta, sem depender de comparar a URL exata.
  if (isNavegacao || p.endsWith('.html') || p.endsWith('.css') || p.endsWith('.js')) {
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
          // caches.match() resolve pra undefined quando não há hit --
          // respondWith(undefined) lança TypeError e o navegador mostra
          // erro de rede, pior do que não ter Service Worker nenhum. Cai
          // pro index.html cacheado (SPA-like: melhor mostrar a home do
          // que travar) e, na ausência total, uma resposta 503 explícita.
          return caches.match(e.request).then(function (hit) {
            return hit
              || caches.match(SCOPE_ROOT_URL + 'index.html')
              || new Response('Offline', { status: 503, statusText: 'Offline' });
          });
        })
    );
  }
  // Cache-first para imagens e manifest (raramente mudam)
  else if (
    p.endsWith('.png') ||
    p.endsWith('.jpg') ||
    p.endsWith('.webp') ||
    p.endsWith('.webmanifest')
  ) {
    e.respondWith(
      caches.match(e.request).then(function (cached) {
        return cached || fetch(e.request);
      })
    );
  }
});
