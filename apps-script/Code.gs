/**
 * Backend do painel "Termo de Compromisso" do site CAT Sertão.
 *
 * Configuração antes de publicar:
 * 1) Se a resposta do formulário n8n cair em outra aba (não a primeira), preencha SHEET_NAME
 *    com o nome exato dela. Deixe em branco para usar sempre a primeira aba da planilha.
 * 2) Defina a senha em: Configurações do projeto (ícone de engrenagem) > Propriedades do script
 *    > adicionar propriedade "TERMO_PASSWORD" com o valor da senha. Nunca coloque a senha aqui no código.
 * 3) Implantar > Nova implantação > Tipo: App da Web > Executar como: Eu > Quem pode acessar: Qualquer pessoa.
 * 4) Copie a URL terminada em /exec e cole em TERMO_API_URL no index.html do site.
 */

var SHEET_ID = '1A4IRvGccm9qdg8uwPdsEBO1VnGjXqld4fcY0TEMFhPI';
var SHEET_NAME = '';
var SESSION_HOURS = 4;
var MAX_ATTEMPTS = 5;
var LOCKOUT_MINUTES = 15;

function doPost(e) {
  var body = JSON.parse((e.postData && e.postData.contents) || '{}');
  var action = body.action;

  if (action === 'login') return respond(handleLogin(body.password));
  if (action === 'list') return respond(handleList(body.token));
  if (action === 'logout') return respond(handleLogout(body.token));
  return respond({ ok: false, error: 'Ação inválida.' });
}

function handleLogin(password) {
  var cache = CacheService.getScriptCache();
  var attempts = Number(cache.get('login_attempts') || 0);

  if (attempts >= MAX_ATTEMPTS) {
    return { ok: false, error: 'Muitas tentativas incorretas. Tente novamente em alguns minutos.' };
  }

  var expected = PropertiesService.getScriptProperties().getProperty('TERMO_PASSWORD');
  if (!expected || password !== expected) {
    cache.put('login_attempts', String(attempts + 1), LOCKOUT_MINUTES * 60);
    return { ok: false, error: 'Senha incorreta.' };
  }

  cache.remove('login_attempts');
  var token = Utilities.getUuid();
  cache.put('session_' + token, '1', SESSION_HOURS * 3600);
  return { ok: true, token: token, rows: readSheet() };
}

function handleList(token) {
  if (!isValidSession(token)) {
    return { ok: false, error: 'Sessão expirada. Faça login novamente.' };
  }
  return { ok: true, rows: readSheet() };
}

function handleLogout(token) {
  if (token) CacheService.getScriptCache().remove('session_' + token);
  return { ok: true };
}

function isValidSession(token) {
  if (!token) return false;
  return !!CacheService.getScriptCache().get('session_' + token);
}

function readSheet() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = SHEET_NAME ? ss.getSheetByName(SHEET_NAME) : ss.getSheets()[0];
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];

  var headers = values[0].map(String);
  return values.slice(1)
    .filter(function (row) { return row.some(function (cell) { return cell !== '' && cell !== null; }); })
    .map(function (row) {
      var record = {};
      headers.forEach(function (h, i) { record[h] = formatCell(row[i]); });
      return record;
    });
}

function formatCell(value) {
  if (Object.prototype.toString.call(value) === '[object Date]') {
    return Utilities.formatDate(value, 'GMT-3', 'dd/MM/yyyy HH:mm');
  }
  return value;
}

function respond(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
