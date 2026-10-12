// login.js — UC001: Fazer login

// Se já existe uma sessão válida, vai direto para o painel.
if (localStorage.getItem('smartstock_token')) {
  window.location.href = 'index.html';
}

const form = document.getElementById('login-form');
const errorBox = document.getElementById('login-error');
const btn = document.getElementById('login-btn');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorBox.classList.remove('show');

  const email = document.getElementById('email').value.trim();
  const senha = document.getElementById('senha').value;

  btn.disabled = true;
  btn.textContent = 'Entrando...';

  try {
    const resp = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha }),
    });
    const data = await resp.json();

    if (!resp.ok) {
      // [UC001.FS001] Login e/ou senha incorretos
      errorBox.textContent = data.erro || 'Não foi possível entrar. Tente novamente.';
      errorBox.classList.add('show');
      document.getElementById('senha').value = '';
      document.getElementById('senha').focus();
      return;
    }

    localStorage.setItem('smartstock_token', data.token);
    localStorage.setItem('smartstock_usuario', JSON.stringify(data.usuario));
    window.location.href = 'index.html';
  } catch (err) {
    errorBox.textContent = 'Falha de conexão com o servidor. Tente novamente.';
    errorBox.classList.add('show');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Entrar';
  }
});
