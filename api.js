/**
 * CLIENTE DA API - substitui o antigo google.script.run
 * Uso: api('getDocumentos').then(function(res){ ... })
 *      api('salvarDocumento', {id:'', nome:'...'}).then(...)
 *
 * IMPORTANTE: content-type 'text/plain' é proposital — evita que o
 * navegador dispare uma requisição de preflight (OPTIONS), que o
 * Apps Script Web App não sabe responder.
 */
function api(action, payload) {
  return fetch(BACKEND_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: action, payload: payload || {}, idToken: idTokenAtual })
  })
    .then(function (r) { return r.json(); })
    .then(function (res) {
      if (res && res.erroAuth) { logout(); throw new Error('Sessão expirada, faça login novamente.'); }
      return res;
    });
}
