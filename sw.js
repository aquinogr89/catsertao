// Service Worker — cache offline para SATECs e recursos estáticos
// Estratégia: network-first para HTML/CSS/JS/JSON (sempre busca a versão
// mais recente quando há sinal; cache só cobre o cenário sem sinal), cache-first
// apenas para imagem/manifest (raramente mudam, sem custo de ficar atrasado).
//
// Importante: o navegador só verifica se este arquivo mudou (e reinstala o
// worker) de tempos em tempos / a cada navegação -- por isso qualquer ajuste
// na ESTRATÉGIA de cache exige subir a versão abaixo, senão quem já tinha o
// site instalado fica preso na versão antiga (foi o que aconteceu com o CSS
// cache-first anterior: uma correção publicada não chegava a quem já tinha
// o Service Worker instalado).
var CACHE_NAME = 'cat-sertao-v12';
var CACHE_ASSETS = [
  './',
  './index.html',
  './conta.html',
  './usuarios.html',
  './log.html',
  './chat.html',
  './hermes.html',
  './eventos.html',
  './style.css',
  './common.js',
  './content/tac-mppe.json',
  './fonts/fonts.css',
  './fonts/oswald-latin.woff2',
  './fonts/oswald-latin-ext.woff2',
  './fonts/public-sans-latin.woff2',
  './fonts/public-sans-latin-ext.woff2',
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
  // Só GET passa daqui pra frente. Hoje só escapa porque os POSTs (login,
  // ações do Apps Script) vão pra script.google.com e já caem no próximo
  // "return" (origem diferente) -- mas cache.put() lança
  // "TypeError: Request method POST is unsupported" no dia em que existir
  // um POST de mesma origem. Melhor travar aqui de propósito.
  if (e.request.method !== 'GET') return;

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

  // Network-first para navegação (HTML), CSS/JS e JSON de conteúdo (ex.:
  // content/tac-mppe.json) -- tenta rede, cai pro cache só sem sinal. São
  // arquivos pequenos, o custo de rebuscar é irrelevante perto do risco de
  // prender alguém numa versão desatualizada do site (ou, no caso do JSON,
  // com texto de conteúdo desatualizado). mode==='navigate' cobre a raiz do
  // site e qualquer navegação direta, sem depender de comparar a URL exata.
  if (isNavegacao || p.endsWith('.html') || p.endsWith('.css') || p.endsWith('.js') || p.endsWith('.json')) {
    e.respondWith(
      fetch(e.request)
        .then(function (res) {
          if (res && res.status === 200) {
            var clone = res.clone();
            caches.open(CACHE_NAME).then(function (cache) {
              cache.put(e.request, clone);
            });
          }
          return res;
        })
        .catch(function () {
          // caches.match() devolve uma Promise -- testar Promise com ||
          // nunca funciona (objeto Promise é sempre truthy, então o operando
          // seguinte do || nunca é avaliado), é preciso encadear com .then
          // até o fim. Isso já derrubou a correção anterior deste mesmo bug:
          // se index.html também não estivesse em cache (antes do primeiro
          // install terminar, ou entre um activate que limpou o cache velho
          // e o novo ainda não populado), a cadeia resolvia pra undefined e
          // respondWith(undefined) lançava TypeError -- o navegador mostrava
          // erro de rede, pior do que não ter Service Worker nenhum.
          return caches.match(e.request).then(function (hit) {
            if (hit) return hit;
            return caches.match(SCOPE_ROOT_URL + 'index.html').then(function (home) {
              return home || new Response(
                'Offline — conteúdo não disponível em cache.',
                { status: 503, statusText: 'Offline', headers: { 'Content-Type': 'text/plain;charset=utf-8' } }
              );
            });
          });
        })
    );
  }
  // Cache-first para imagens, fontes e manifest (raramente mudam)
  else if (
    p.endsWith('.png') ||
    p.endsWith('.jpg') ||
    p.endsWith('.webp') ||
    p.endsWith('.woff2') ||
    p.endsWith('.webmanifest')
  ) {
    e.respondWith(
      caches.match(e.request).then(function (cached) {
        return cached || fetch(e.request);
      })
    );
  }
});
