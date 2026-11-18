// login.js — UC001: Fazer login
async function validarSessaoExistente() {
  const token = localStorage.getItem('smartstock_token');
  if (!token) return;

  try {
    const resp = await fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (resp.ok) {
      const usuario = await resp.json();
      localStorage.setItem('smartstock_usuario', JSON.stringify(usuario));
      location.replace('index.html');
      return;
    }
    if (resp.status !== 401) {
      erro.textContent = 'Não foi possível validar sua sessão. Tente novamente.';
      erro.classList.add('show');
      return;
    }
  } catch {
    erro.textContent = 'Não foi possível validar sua sessão. Faça login para continuar.';
    erro.classList.add('show');
    return;
  }

  localStorage.removeItem('smartstock_token');
  localStorage.removeItem('smartstock_usuario');
}

const form = document.getElementById('form-login');
const erro = document.getElementById('erro');
const campoSenha = document.getElementById('senha');
const botao = document.getElementById('btn-entrar');

validarSessaoExistente();

// Olho: mostra/esconde a senha
document.getElementById('ver-senha').addEventListener('click', (e) => {
  const mostrando = campoSenha.type === 'text';
  campoSenha.type = mostrando ? 'password' : 'text';
  e.currentTarget.setAttribute('aria-label', mostrando ? 'Mostrar senha' : 'Ocultar senha');
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  erro.classList.remove('show');

  const email = document.getElementById('email').value.trim();
  const senha = campoSenha.value;
  if (!email || !senha) {
    erro.textContent = 'Informe usuário e senha.';
    erro.classList.add('show');
    return;
  }

  botao.disabled = true;
  botao.textContent = 'Entrando...';
  try {
    const resp = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha }),
    });
    const dados = await resp.json().catch(() => ({}));

    if (!resp.ok) {
      // [UC001.FS001] Login e/ou senha incorretos: limpa a senha e mostra o erro
      erro.textContent = dados.erro || 'Não foi possível entrar. Tente novamente.';
      erro.classList.add('show');
      campoSenha.value = '';
      campoSenha.focus();
      return;
    }
    localStorage.setItem('smartstock_token', dados.token);
    localStorage.setItem('smartstock_usuario', JSON.stringify(dados.usuario));
    location.replace('index.html');
  } catch {
    erro.textContent = 'Falha de conexão com o servidor. Tente novamente.';
    erro.classList.add('show');
  } finally {
    botao.disabled = false;
    botao.textContent = 'Entrar';
  }
});
