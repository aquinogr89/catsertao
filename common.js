'use strict';

/**
 * Compartilhado por index.html, conta.html, usuarios.html e log.html.
 * Guarda a configuração do backend e a sessão de login (localStorage),
 * usados por todas as páginas do site.
 */
var CatAuth = (function () {
  var APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwQwjmNoPHYD0lOvqaAsOs9wQntZ24p68y9cAGn1yck7cUgmZia_-6aH2yv1dqPvmcIGQ/exec';
  var SESSION_KEY = 'cat_session';
  var PERFIL_LABEL = { admin_master: 'Admin Master', admin: 'Admin', user1: 'Vistoriador', user2: 'Acesso Básico' };

  // Em ambiente de teste local (localhost/127.0.0.1), os links para os sites
  // irmãos apontam para as portas locais em vez das URLs públicas do GitHub
  // Pages — assim dá pra testar o fluxo integrado sem precisar lembrar de
  // reverter isso antes do merge.
  var isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  var RTI_URL = isLocalhost ? 'http://localhost:5501/' : 'https://aquinogr89.github.io/oci-catsertao/';
  var TRIAGEM_URL = isLocalhost ? 'http://localhost:5502/' : 'https://aquinogr89.github.io/triagem-catsertao/';

  var session = null; // { token, login, perfil }

  function show(el) { if (el) el.classList.remove('u-hidden'); }
  function hide(el) { if (el) el.classList.add('u-hidden'); }
  function toggle(el, visible) { if (!el) return; if (visible) show(el); else hide(el); }

  function escapeHtml(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // Remove acentos para busca/comparação tolerante (ex.: "joao" encontra
  // "João", "sao jose" encontra "São José"). ̀-ͯ (marcas de acento
  // combinantes) via escape Unicode em vez do caractere combinante literal
  // no regex: literal funciona só enquanto o arquivo permanecer em UTF-8
  // intacto -- qualquer editor, minificador ou copy-paste que normalize o
  // texto quebra a remoção de acentos silenciosamente. Usado em index.html,
  // e antes reescrito à mão em várias funções ali -- centralizado aqui para
  // não repetir a lógica.
  function normalizar(s) {
    return String(s == null ? '' : s)
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }

  // Sem timeout, em sinal fraco a Promise nunca resolve nem rejeita: o botão
  // "Entrar" fica desabilitado pra sempre e "Carregando..." nunca resolve --
  // nem sucesso, nem erro, sem jeito de tentar de novo.
  var API_TIMEOUT_MS = 15000;

  function api(payload, timeoutMs) {
    var ctrl = new AbortController();
    var t = setTimeout(function () { ctrl.abort(); }, timeoutMs || API_TIMEOUT_MS);
    return fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    }).then(function (res) { return res.json(); })
      .finally(function () { clearTimeout(t); });
  }

  // localStorage (não sessionStorage): sessionStorage só é herdado por abas
  // abertas via "Duplicar aba" — uma aba aberta por um link comum (mesmo com
  // target="_blank") recebe um sessionStorage vazio, então as páginas que
  // abrem em nova aba (Mapa de OCI, Usuários, LOG, Minha Conta) nunca viam a
  // sessão. localStorage é realmente compartilhado entre todas as abas da
  // mesma origem. A expiração de verdade continua sendo sempre no servidor
  // (token de 8h, revalidado a cada chamada) — isso aqui é só onde o
  // navegador guarda o token entre uma página e outra.
  //
  // saved_at espelha localmente o mesmo limite de 8h do servidor: os
  // relógios de inatividade/revalidação (ver iniciarMonitorInatividade)
  // só agem em cima de INATIVIDADE, então uma aba usada continuamente por
  // mais de 8h sem nunca recarregar nem ficar ociosa passava batido --
  // o token já teria expirado no servidor, mas nada localmente percebia
  // isso até a próxima chamada de fato falhar. saved_at preserva o
  // momento do login original entre revalidações (não reinicia a cada
  // saveSession -- o relógio é o do login, não o da última confirmação).
  var SESSAO_MAX_MS = 8 * 60 * 60 * 1000; // 8 horas

  function saveSession(s) {
    // Preservar saved_at só faz sentido se "existente" for a MESMA sessão
    // (mesmo token) -- sem essa checagem, uma sessão de outro login que
    // nunca foi limpa (aba fechada em vez de "Sair") emprestava o relógio
    // pro login novo, que podia expirar localmente em minutos. Pior num
    // aparelho compartilhado, que é onde mais acontece. Um token novo
    // (login de verdade, ou reemissão após trocar a senha) sempre começa
    // com saved_at novo -- e faz sentido: o servidor também reinicia a
    // validade de 8h pra um token novo.
    var existente = loadSessionBruta();
    var mesmaSessao = existente && existente.token === s.token;
    s.saved_at = (mesmaSessao && existente.saved_at) || Date.now();
    session = s;
    localStorage.setItem(SESSION_KEY, JSON.stringify(s));
  }
  function clearSession() {
    session = null;
    localStorage.removeItem(SESSION_KEY);
  }
  function loadSessionBruta() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); }
    catch (e) { return null; }
  }
  function loadSession() {
    var s = loadSessionBruta();
    if (s && s.saved_at && Date.now() - s.saved_at > SESSAO_MAX_MS) {
      clearSession();
      return null;
    }
    return s;
  }
  function getSession() { return session; }

  /**
   * Revalida a sessão salva contra o servidor. Usado por toda página que
   * exige login (index.html e as páginas utilitárias). Se perfisPermitidos
   * for informado, também exige que o perfil esteja nessa lista.
   * Resolve com a sessão validada; rejeita com { code, perfil? }.
   */
  function requireSession(perfisPermitidos) {
    var saved = loadSession();
    if (!saved || !saved.token) {
      return Promise.reject({ code: 'no_session' });
    }
    return api({ action: 'validarToken', token: saved.token }).then(function (res) {
      if (!res.ok) {
        clearSession();
        return Promise.reject({ code: 'invalid_session' });
      }
      if (perfisPermitidos && perfisPermitidos.indexOf(res.perfil) === -1) {
        return Promise.reject({ code: 'forbidden', perfil: res.perfil });
      }
      var s = { token: saved.token, login: res.login, perfil: res.perfil };
      saveSession(s);
      return s;
    }, function () {
      // Falha de REDE (não do servidor) não deve apagar uma sessão local
      // válida -- só não deu pra confirmar agora. Devolve a sessão salva
      // pra quem chamou decidir: negar acesso como sessão inválida, ou
      // degradar pra um modo offline sabendo quem provavelmente está
      // logado.
      return Promise.reject({ code: 'network_error', sessaoLocal: saved });
    });
  }

  // ===================== Logout por inatividade =====================
  // 30 min sem interação (mouse, teclado, toque, scroll) desloga sozinho.
  // O "último momento de atividade" fica no localStorage (INATIVIDADE_KEY),
  // não numa variável em memória, porque o usuário pode ter mais de uma aba
  // aberta ao mesmo tempo (ex.: Usuários numa aba, Mapa de OCI em outra) —
  // um timer isolado por aba deslogaria uma aba parada mesmo com atividade
  // em outra. Como localStorage é compartilhado entre abas da mesma origem,
  // atividade em qualquer aba mantém todas vivas.
  var INATIVIDADE_KEY = 'cat_last_activity';
  var INATIVIDADE_LIMITE_MS = 30 * 60 * 1000; // 30 minutos
  var INATIVIDADE_CHECK_MS = 30 * 1000; // confere a cada 30s
  var INATIVIDADE_THROTTLE_MS = 5 * 1000; // não escreve no localStorage a cada pixel de mousemove
  var monitorLigado = false; // ver comentário em iniciarMonitorInatividade

  function registrarAtividade() {
    var agora = Date.now();
    var ultimo = Number(localStorage.getItem(INATIVIDADE_KEY) || 0);
    if (agora - ultimo > INATIVIDADE_THROTTLE_MS) {
      localStorage.setItem(INATIVIDADE_KEY, String(agora));
    }
  }

  /**
   * Liga o monitor de inatividade nesta página. onTimeout é chamado quando o
   * limite é atingido, depois da sessão já ter sido limpa (local e, best
   * effort, no servidor). Passa limiteMs só para testes locais (ex.: alguns
   * segundos) — em produção usa o padrão de 30 minutos. onVisible (opcional)
   * é chamado sempre que a página volta a ficar visível E a sessão NÃO
   * acabou de expirar agora -- usado por index.html pra tentar revalidar o
   * modo offline sem precisar de outro listener de visibilitychange (ver
   * abaixo).
   */
  function iniciarMonitorInatividade(onTimeout, limiteMs, onVisible) {
    // Nesta aba, esta função pode ser chamada mais de uma vez num único
    // carregamento de página (ex.: index.html no modo offline -- revalidação
    // falha de vez, showGate(), usuário loga de novo pelo formulário,
    // showApp() roda outra vez). Os listeners de atividade (addEventListener
    // com a mesma referência de função) deduplicam sozinhos, mas o
    // setInterval e o listener de visibilitychange (anônimo) empilhavam:
    // verificarInatividade rodava duas vezes por tick (dois logout ao
    // servidor no mesmo instante) e onVisible disparava em dobro a cada
    // volta à aba. onTimeout/onVisible são sempre os mesmos em cada página,
    // então ignorar a segunda chamada é seguro.
    if (monitorLigado) return;
    monitorLigado = true;

    var limite = limiteMs || INATIVIDADE_LIMITE_MS;
    registrarAtividade(); // carregar a página já conta como atividade

    // 'focus' e 'visibilitychange' NAO entram aqui: os dois disparam quando o
    // usuario VOLTA pra pagina (e visibilitychange dispara tambem ao sair).
    // Como registrarAtividade regrava o carimbo de tempo, bloquear e
    // desbloquear a tela do celular zerava a contagem -- a sessao nunca
    // expirava por inatividade em aparelho movel.
    ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'].forEach(function (evt) {
      document.addEventListener(evt, registrarAtividade, { passive: true });
    });

    // Devolve true quando decidiu por expirar a sessão agora -- usado logo
    // abaixo pra dar precedência ao logout por inatividade sobre onVisible:
    // se a sessão acabou de cair, não faz sentido também tentar revalidar
    // um modo offline na mesma volada de eventos.
    function verificarInatividade() {
      var saved = loadSession();
      if (!saved) return false; // ninguém logado nesta aba, nada a fazer

      var ultimo = Number(localStorage.getItem(INATIVIDADE_KEY) || 0);
      if (Date.now() - ultimo > limite) {
        api({ action: 'logout', token: saved.token }).catch(function () {});
        clearSession();
        // sessionStorage (não localStorage): o aviso é só desta aba, não das
        // outras -- cada onTimeout aqui já dispara um location.reload() na
        // própria aba, e a página recarregada lê essa flag pra explicar por
        // que caiu (em vez de só mostrar o login/acesso negado em silêncio).
        try { sessionStorage.setItem('cat_expirado', '1'); } catch (err) {}
        if (typeof onTimeout === 'function') onTimeout();
        return true;
      }
      return false;
    }

    // Ao voltar pra pagina (desbloquear a tela, trocar de app de volta),
    // verificar na hora em vez de esperar o proximo tick de 30s: o
    // setInterval fica suspenso ou muito lento com a aba em segundo plano.
    // Mesmo listener também dispara onVisible (revalidação do modo offline)
    // -- só quando NÃO expirou agora, pra não empilhar um segundo listener
    // de visibilitychange à toa nem disputar com o logout por inatividade.
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) {
        var expirou = verificarInatividade();
        if (!expirou && typeof onVisible === 'function') onVisible();
      }
    });

    setInterval(verificarInatividade, INATIVIDADE_CHECK_MS);
  }

  // ===================== Perfil: menu + dados da sessão =====================
  // Usado por index.html/conta.html/usuarios.html/log.html/eventos.html --
  // regra idêntica em todas (admin_master/admin veem Termo, Usuários e
  // Controle de Eventos; só admin_master vê LOG e Hermes), repetida em cada
  // página como montarSidebar()/applyPerfilVisibility() antes de vir pra cá.
  // hermes.html não usa isso: painel próprio, tema escuro, sem essa sidebar.
  // opts.termoSectionId é só de index.html, que tem uma seção própria
  // (#termo-section) pra mostrar/esconder junto do link do menu -- as
  // páginas utilitárias não têm essa seção.
  function aplicarPerfil(session, opts) {
    opts = opts || {};
    var perfil = session.perfil;
    var canTermo = perfil === 'admin_master' || perfil === 'admin';
    var canUsuarios = perfil === 'admin_master' || perfil === 'admin';
    var canLog = perfil === 'admin_master';
    var canHermes = perfil === 'admin_master';
    var canEventos = perfil === 'admin_master' || perfil === 'admin';

    // Mapa de OCI e Triagem de Riscos: visíveis para qualquer usuário logado
    // (todos podem ver os mapas; cadastrar/editar continua restrito dentro
    // de cada site, revalidado no servidor).
    var navRti = document.getElementById('nav-rti');
    var navTriagem = document.getElementById('nav-triagem');
    if (navRti) navRti.href = RTI_URL;
    if (navTriagem) navTriagem.href = TRIAGEM_URL;
    toggle(document.getElementById('nav-termo'), canTermo);
    toggle(document.getElementById('nav-usuarios'), canUsuarios);
    toggle(document.getElementById('nav-log'), canLog);
    toggle(document.getElementById('nav-hermes'), canHermes);
    toggle(document.getElementById('nav-eventos'), canEventos);
    if (opts.termoSectionId) toggle(document.getElementById(opts.termoSectionId), canTermo);

    document.getElementById('session-login').textContent = session.login;
    document.getElementById('session-perfil').textContent = PERFIL_LABEL[perfil] || perfil;
  }

  // ===================== Itens da sidebar =====================
  // Os 11 itens (+ 3 rótulos de grupo) do menu lateral eram HTML estático
  // repetido nos 4 arquivos -- e já tinham divergido: nav-usuarios tinha
  // target="cat-secundaria" em index.html/log.html mas não em
  // usuarios.html (onde é a página atual, com classe "active" e sem seta
  // "↗" no rótulo). hermes.html não usa essa sidebar (painel próprio) e
  // fica de fora.
  //
  // tipo 'ancora': seções da própria index.html (#atendimento etc.) --
  //   dentro de index.html o href é só "#id"; nas páginas utilitárias, que
  //   estão em outro arquivo, precisa do prefixo "index.html#id"
  //   (paginaBase).
  // tipo 'externo': Mapa de OCI / Triagem -- nunca é "página atual" nessa
  //   lista (são outro site), sempre target="cat-ferramenta".
  // tipo 'pagina': Usuários / LOG / Hermes / Controle de Eventos / Minha
  //   Conta -- páginas separadas de verdade. Quando é a PRÓPRIA página atual
  //   (paginaAtual), perde o target (não faz sentido abrir a si mesma em
  //   outra aba), ganha classe "active" e perde a seta "↗" do rótulo.
  //
  // I8: "externo" e "pagina" usavam o MESMO nome de janela
  // (cat-secundaria) -- abrir "Usuários" depois de "Mapa de OCI" reusava a
  // aba do mapa e a substituía, fechando de fato o que o usuário tinha
  // deixado aberto. Dois nomes separam os dois contextos: cat-ferramenta
  // (sites irmãos, o usuário costuma querer manter aberto ao lado) e
  // cat-admin (páginas internas do próprio site, sempre uma por vez).
  var SIDEBAR_ITEMS = [
    { grupo: 'Página' },
    { tipo: 'ancora', key: 'atendimento', label: 'Atendimento', anchor: 'atendimento' },
    { tipo: 'ancora', key: 'documentos', label: 'Documentos', anchor: 'documentos' },
    { tipo: 'ancora', key: 'termo', id: 'nav-termo', label: 'Termo de Compromisso', anchor: 'termo-section', hiddenByDefault: true },
    { tipo: 'ancora', key: 'satecs', label: 'SATECs', anchor: 'satecs' },
    { grupo: 'Ferramentas' },
    { tipo: 'externo', key: 'rti', id: 'nav-rti', label: 'Mapa de OCI', href: '#' },
    { tipo: 'externo', key: 'triagem', id: 'nav-triagem', label: 'Triagem de Riscos', href: '#' },
    { grupo: 'Admin' },
    { tipo: 'pagina', key: 'usuarios', id: 'nav-usuarios', label: 'Usuários', href: 'usuarios.html', hiddenByDefault: true },
    { tipo: 'pagina', key: 'log', id: 'nav-log', label: 'LOG', href: 'log.html', hiddenByDefault: true },
    { tipo: 'pagina', key: 'hermes', id: 'nav-hermes', label: 'Hermes Agent', href: 'hermes.html', hiddenByDefault: true },
    { tipo: 'pagina', key: 'eventos', id: 'nav-eventos', label: 'Controle de Eventos', href: 'eventos.html', hiddenByDefault: true },
    { tipo: 'pagina', key: 'conta', label: 'Minha Conta', href: 'conta.html' }
  ];

  /**
   * Gera o HTML dos itens da sidebar para #site-sidebar-list. Chamar antes
   * de CatAuth.aplicarPerfil() (que faz o toggle de visibilidade dos itens
   * com hiddenByDefault, usando os mesmos ids). opts.paginaAtual: 'usuarios'
   * | 'log' | 'conta' | null (index.html não tem página "atual" nessa
   * lista). opts.paginaBase: '' em index.html, 'index.html' nas utilitárias.
   */
  function montarSidebarItens(opts) {
    opts = opts || {};
    var paginaAtual = opts.paginaAtual || null;
    var paginaBase = opts.paginaBase || '';

    return SIDEBAR_ITEMS.map(function (item) {
      if (item.grupo) return '<div class="site-nav-label">' + item.grupo + '</div>';

      var idAttr = item.id ? ' id="' + item.id + '"' : '';

      if (item.tipo === 'ancora') {
        var classeAncora = 'site-nav-item' + (item.hiddenByDefault ? ' u-hidden' : '');
        return '<a' + idAttr + ' href="' + paginaBase + '#' + item.anchor + '" class="' + classeAncora + '">' + item.label + '</a>';
      }

      if (item.tipo === 'externo') {
        return '<a' + idAttr + ' href="' + item.href + '" target="cat-ferramenta" class="site-nav-item">' + item.label + ' ↗</a>';
      }

      // tipo === 'pagina'
      var ehAtual = item.key === paginaAtual;
      var classePagina = 'site-nav-item' + (ehAtual ? ' active' : '') + (item.hiddenByDefault ? ' u-hidden' : '');
      var targetAttr = ehAtual ? '' : ' target="cat-admin"';
      var rotulo = item.label + (ehAtual ? '' : ' ↗');
      return '<a' + idAttr + ' href="' + item.href + '"' + targetAttr + ' class="' + classePagina + '">' + rotulo + '</a>';
    }).join('');
  }

  // ===================== Menu lateral recolhível =====================
  // Usado por index.html/conta.html/usuarios.html/log.html -- só aparece no
  // mobile (ver style.css); no desktop o botão fica escondido e a lista
  // sempre visível, então este JS não interfere. Idêntico nas 4 páginas
  // antes de vir pra cá.
  function iniciarMenuLateral() {
    var toggleEl = document.getElementById('site-nav-toggle');
    var listEl = document.getElementById('site-sidebar-list');
    if (!toggleEl || !listEl) return;

    toggleEl.addEventListener('click', function () {
      var aberto = listEl.classList.toggle('open');
      toggleEl.setAttribute('aria-expanded', aberto ? 'true' : 'false');
      document.body.classList.toggle('menu-lateral-aberto', aberto);
    });
    listEl.addEventListener('click', function (e) {
      var item = e.target.closest('.site-nav-item');
      if (item) {
        var href = item.getAttribute('href') || '';
        if (href.charAt(0) === '#') {
          // Ancora interna (#atendimento etc.): recolher JA, antes do
          // navegador calcular a posicao de rolagem. Se recolher depois
          // (setTimeout), o navegador rola com o menu ainda aberto e so
          // depois o menu encolhe -- a pagina fica "deslocada" da secao
          // (bug real: clicar em Atendimento/Documentos/Termo no celular
          // abria fora do topo, desconfigurado). Como nao ha transicao
          // de altura nesse menu, o recolhimento e instantaneo, entao a
          // rolagem ja calcula certo.
          listEl.classList.remove('open');
          toggleEl.setAttribute('aria-expanded', 'false');
          document.body.classList.remove('menu-lateral-aberto');
        } else {
          // Link externo/outra pagina (target=cat-ferramenta/cat-admin, .html):
          // recolher na mesma tacada do toque faz o conteudo da pagina se
          // realinhar embaixo do dedo entre o touchstart e o touchend -- no
          // celular isso e frequentemente interpretado como um gesto de
          // rolagem, e o navegador CANCELA o clique do link (bug real:
          // "Mapa de OCI"/"Hermes Agent" no menu do celular so pulavam pra
          // secao Atendimento, sem abrir nada). Adiar o recolhimento pro
          // proximo tick deixa o navegador processar a navegacao primeiro,
          // com o layout ainda estavel.
          setTimeout(function () {
            listEl.classList.remove('open');
            toggleEl.setAttribute('aria-expanded', 'false');
            document.body.classList.remove('menu-lateral-aberto');
          }, 0);
        }
      }
    });
  }

  // ===================== Botão flutuante "voltar ao topo" =====================
  // Usado por index.html e pelas páginas utilitárias com tabela longa
  // (Usuários, LOG, Controle de Eventos) -- no celular, log.html com 100
  // registros por página vira 100 cards empilhados, e sem este botão não
  // havia como voltar ao topo a não ser rolando tudo de novo (I3 da
  // auditoria). Título/aria-label ficam no HTML de cada página (index.html
  // diz "Voltar ao menu"; as utilitárias dizem "Voltar ao topo") -- não
  // reaproveitados aqui de propósito, cada página mantém o próprio texto.
  //
  // Direto pro topo do documento: no desktop a sidebar é sticky (o menu
  // nunca sai da tela) e no mobile ela é o primeiro bloco da página, então
  // top:0 chega no menu nos dois casos (I1) -- medir a posição da sidebar
  // não funcionava: sticky grudada tem getBoundingClientRect().top === 0.
  // behavior:'auto' (sem animação) pra quem pediu menos movimento no sistema
  // (J4). Só fica visível depois de rolar (I2, ver .btn-float.top.visivel em
  // style.css) -- no topo da página o botão não tem função nenhuma.
  function iniciarBotaoTopo() {
    var btn = document.getElementById('btn-scroll-top');
    if (!btn) return;

    function atualizar() { btn.classList.toggle('visivel', window.scrollY > 400); }

    btn.addEventListener('click', function () {
      var semMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: 0, behavior: semMovimento ? 'auto' : 'smooth' });
    });
    window.addEventListener('scroll', atualizar, { passive: true });
    atualizar(); // estado inicial (recarga no meio da página)
  }

  return {
    APPS_SCRIPT_URL: APPS_SCRIPT_URL,
    PERFIL_LABEL: PERFIL_LABEL,
    RTI_URL: RTI_URL,
    TRIAGEM_URL: TRIAGEM_URL,
    show: show,
    hide: hide,
    toggle: toggle,
    escapeHtml: escapeHtml,
    normalizar: normalizar,
    api: api,
    saveSession: saveSession,
    clearSession: clearSession,
    loadSession: loadSession,
    getSession: getSession,
    requireSession: requireSession,
    iniciarMonitorInatividade: iniciarMonitorInatividade,
    iniciarMenuLateral: iniciarMenuLateral,
    iniciarBotaoTopo: iniciarBotaoTopo,
    aplicarPerfil: aplicarPerfil,
    montarSidebarItens: montarSidebarItens
  };
})();

// Registrar Service Worker para cache offline (PWA)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js', { scope: './' }).catch(function () {});
}

// Links com target="cat-ferramenta" (Mapa de OCI, Triagem) ou
// target="cat-admin" (Usuários, LOG, Minha Conta, Hermes, Controle de
// Eventos) sempre reabrem a MESMA aba/janela dentro do próprio grupo, em vez
// de criar uma nova a cada clique. O problema: em vários navegadores mobile,
// quando essa aba já existe e o usuário clica de novo a partir da aba
// principal, o navegador só atualiza o conteúdo dela em segundo plano sem
// trazer o foco -- o usuário fica na página principal sem perceber que a
// outra aba já entrou. window.open() + .focus() reforça esse foco
// explicitamente; em navegadores que bloqueiam troca de foco por script
// (ex.: Safari/iOS em alguns casos) o comportamento nativo do target ainda
// se aplica por baixo, então não piora nada -- só ajuda onde o navegador
// permite.
//
// I8: antes, os dois grupos usavam o MESMO nome de janela (cat-secundaria)
// -- abrir "Usuários" depois de "Mapa de OCI" reusava a aba do mapa e a
// substituía, fechando de fato o que o usuário tinha deixado aberto lá. O
// nome vem do próprio link (link.target) em vez de fixo, então cada grupo
// abre/reusa a sua própria aba.
document.addEventListener('click', function (e) {
  var link = e.target.closest && e.target.closest('a[target="cat-ferramenta"], a[target="cat-admin"]');
  if (!link || !link.href) return;
  // Ctrl/Cmd/Shift/Alt+clique e clique do meio são o jeito padrão do usuário
  // pedir "abre numa aba/janela separada" -- sem essa checagem, esses
  // cliques eram engolidos pelo preventDefault() e reusavam a mesma aba
  // nomeada, tornando impossível abrir Usuários e LOG lado a lado.
  if (e.defaultPrevented || e.button !== 0) return;
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  e.preventDefault();
  var win = window.open(link.href, link.target);
  if (win) { try { win.focus(); } catch (err) {} }
});

// "Voltar ao site principal" (botão flutuante ← e o link inline .util-back)
// nas páginas utilitárias abertas em nova aba (conta, usuários, LOG, Hermes,
// Eventos): esses links não têm target, então o clique navegava NESTA aba
// secundária para index.html -- a aba principal, que já tem o portal aberto,
// nunca saía do lugar, então o resultado era uma SEGUNDA cópia do portal
// nessa aba, ainda com o mesmo nome de janela (cat-secundaria): o próximo
// clique em "Usuários" a partir da aba principal ia PARA ESSA cópia,
// sobrescrevendo-a. O certo é fechar a aba e devolver o foco à principal.
// window.close() só funciona em aba aberta por script (via window.opener) --
// se a página foi aberta direto pela URL/favorito (sem opener), o close é
// ignorado e o href original assume, que é o comportamento certo nesse caso.
document.addEventListener('click', function (e) {
  var link = e.target.closest && e.target.closest('.btn-float.back, .util-back');
  if (!link) return;
  if (e.defaultPrevented || e.button !== 0) return;
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  if (!window.opener || window.opener.closed) return;
  e.preventDefault();
  try { window.opener.focus(); } catch (err) {}
  window.close();
});
