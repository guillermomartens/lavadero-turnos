const PAGES = {
  agenda: AgendaPage,
  servicios: ServiciosPage,
  sectores: SectoresPage,
  reportes: ReportesPage
};

let currentPage = 'agenda';

function showLogin(errorMsg) {
  $('#appShell').style.display = 'none';
  $('#loginScreen').style.display = 'flex';
  const errBox = $('#loginError');
  errBox.innerHTML = '';
  if (errorMsg) errBox.appendChild(el('div', { class: 'login-error' }, errorMsg));
}

function showApp() {
  $('#loginScreen').style.display = 'none';
  $('#appShell').style.display = 'flex';
  const user = getUser();
  $('#sidebarUserName').textContent = user ? user.nombre : '';
  navigateTo(currentPage);
}

function navigateTo(page) {
  currentPage = page;
  $$('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.page === page));
  PAGES[page].render();
}

$$('.nav-item').forEach(item => {
  item.addEventListener('click', () => navigateTo(item.dataset.page));
});

$('#btnLogin').addEventListener('click', doLogin);
$('#loginPassword').addEventListener('keydown', (e) => { if (e.key === 'Enter') doLogin(); });

async function doLogin() {
  const email = $('#loginEmail').value.trim();
  const password = $('#loginPassword').value;
  const btn = $('#btnLogin');
  btn.disabled = true; btn.textContent = 'Ingresando...';
  try {
    const data = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    setToken(data.token);
    setUser(data.user);
    showApp();
  } catch (e) {
    showLogin(e.message);
  } finally {
    btn.disabled = false; btn.textContent = 'Ingresar';
  }
}

$('#btnLogout').addEventListener('click', () => {
  clearToken();
  showLogin();
});

// ---------------- Init ----------------
(function init() {
  if (getToken()) {
    showApp();
  } else {
    showLogin();
  }
})();
