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
  function saveSession(s) {
    session = s;
    localStorage.setItem(SESSION_KEY, JSON.stringify(s));
  }
  function clearSession() {
    session = null;
    localStorage.removeItem(SESSION_KEY);
  }
  function loadSession() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); }
    catch (e) { return null; }
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
    iniciarMonitorInatividade: iniciarMonitorInatividade
  };
})();

// Registrar Service Worker para cache offline (PWA)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js', { scope: './' }).catch(function () {});
}

// Links com target="cat-secundaria" (Mapa de OCI, Triagem, Minha Conta,
// Usuários, LOG, Hermes) sempre reabrem a MESMA aba/janela em vez de criar
// uma nova a cada clique. O problema: em vários navegadores mobile, quando
// essa aba já existe e o usuário clica de novo a partir da aba principal, o
// navegador só atualiza o conteúdo dela em segundo plano sem trazer o foco
// -- o usuário fica na página principal sem perceber que a outra aba já
// entrou. window.open() + .focus() reforça esse foco explicitamente; em
// navegadores que bloqueiam troca de foco por script (ex.: Safari/iOS em
// alguns casos) o comportamento nativo do target ainda se aplica por baixo,
// então não piora nada -- só ajuda onde o navegador permite.
document.addEventListener('click', function (e) {
  var link = e.target.closest && e.target.closest('a[target="cat-secundaria"]');
  if (!link || !link.href) return;
  // Ctrl/Cmd/Shift/Alt+clique e clique do meio são o jeito padrão do usuário
  // pedir "abre numa aba/janela separada" -- sem essa checagem, esses
  // cliques eram engolidos pelo preventDefault() e reusavam a mesma aba
  // nomeada, tornando impossível abrir Usuários e LOG lado a lado.
  if (e.defaultPrevented || e.button !== 0) return;
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  e.preventDefault();
  var win = window.open(link.href, 'cat-secundaria');
  if (win) { try { win.focus(); } catch (err) {} }
});
