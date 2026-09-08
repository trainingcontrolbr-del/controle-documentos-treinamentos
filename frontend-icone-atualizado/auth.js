/**
 * AUTENTICAÇÃO - Google Identity Services
 * Gerencia o botão de login e guarda o idToken em memória (não usa
 * localStorage/sessionStorage para manter tudo simples e seguro).
 */
var idTokenAtual = null;
var usuarioLogado = null;

function iniciarLogin(aoLogar) {
  if (!window.google || !google.accounts) {
    console.error('Google Identity Services não carregou.');
    return;
  }
  google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: function (response) {
      idTokenAtual = response.credential;
      usuarioLogado = parseJwt(response.credential);
      if (aoLogar) aoLogar(usuarioLogado);
    }
  });
  google.accounts.id.renderButton(document.getElementById('g_id_signin'), { theme: 'outline', size: 'large', text: 'signin_with' });
  google.accounts.id.prompt();
}

function parseJwt(token) {
  try {
    var base64Url = token.split('.')[1];
    var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    var jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) { return null; }
}

function logout() {
  idTokenAtual = null;
  usuarioLogado = null;
  if (window.google && google.accounts) google.accounts.id.disableAutoSelect();
  location.reload();
}
