'use strict';

/**
 * Compartilhado por index.html, conta.html, usuarios.html e log.html.
 * Guarda a configuração do backend e a sessão de login (sessionStorage),
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
  var RTI_URL = isLocalhost ? 'http://localhost:5501/' : 'https://aquinogr89.github.io/rti-catsertao/';
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

  function api(payload) {
    return fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    }).then(function (res) { return res.json(); });
  }

  function saveSession(s) {
    session = s;
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
  }
  function clearSession() {
    session = null;
    sessionStorage.removeItem(SESSION_KEY);
  }
  function loadSession() {
    try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null'); }
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
      return Promise.reject({ code: 'network_error' });
    });
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
    api: api,
    saveSession: saveSession,
    clearSession: clearSession,
    loadSession: loadSession,
    getSession: getSession,
    requireSession: requireSession
  };
})();
