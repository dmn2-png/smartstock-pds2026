// app.js — SmartStock: lógica do painel (UC002 a UC009)

// ---------------------------------------------------------------------
// Sessão
// ---------------------------------------------------------------------
const token = localStorage.getItem('smartstock_token');
const usuario = JSON.parse(localStorage.getItem('smartstock_usuario') || 'null');

if (!token || !usuario) {
  window.location.href = 'login.html';
}

const ehGerente = usuario?.cargo === 'gerente';

// ---------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------
async function api(caminho, opcoes = {}) {
  const resp = await fetch(`/api${caminho}`, {
    ...opcoes,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(opcoes.headers || {}),
    },
  });

  if (resp.status === 401) {
    localStorage.removeItem('smartstock_token');
    localStorage.removeItem('smartstock_usuario');
    window.location.href = 'login.html';
    throw new Error('Sessão expirada');
  }

  const dados = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(dados.erro || 'Erro ao comunicar com o servidor.');
  return dados;
}

function toast(mensagem, tipo = 'success') {
  const el = document.createElement('div');
  el.className = `toast ${tipo}`;
  el.textContent = mensagem;
  document.getElementById('toast-region').appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

function mostrarErro(idCaixa, mensagem) {
  const box = document.getElementById(idCaixa);
  box.textContent = mensagem;
  box.classList.add('show');
}
function limparErro(idCaixa) {
  document.getElementById(idCaixa).classList.remove('show');
}

function escapar(texto) {
  const div = document.createElement('div');
  div.textContent = texto ?? '';
  return div.innerHTML;
}

function formatarDataHora(iso) {
  // O banco grava em UTC ("YYYY-MM-DD HH:MM:SS")
  const d = new Date(iso.replace(' ', 'T') + 'Z');
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function vazio(titulo, texto) {
  return `<div class="empty-state"><div class="mark">${escapar(titulo)}</div><div>${escapar(texto)}</div></div>`;
}

function abrirModal(id) { document.getElementById(id).classList.add('show'); }
function fecharModal(id) { document.getElementById(id).classList.remove('show'); }

document.querySelectorAll('[data-close-modal]').forEach((btn) => {
  btn.addEventListener('click', () => fecharModal(btn.dataset.closeModal));
});
document.querySelectorAll('.modal-backdrop').forEach((bd) => {
  bd.addEventListener('click', (e) => { if (e.target === bd) bd.classList.remove('show'); });
});

// ---------------------------------------------------------------------
// Cabeçalho / navegação
// ---------------------------------------------------------------------
document.getElementById('chip-nome').textContent = usuario.nome;
document.getElementById('chip-cargo').textContent = ehGerente ? 'GERENTE' : 'FUNCIONÁRIO';
document.getElementById('saida-responsavel').textContent = usuario.nome;

// Funcionários é área exclusiva do gerente (RF01)
if (!ehGerente) {
  document.getElementById('nav-funcionarios').classList.add('hidden');
  document.getElementById('btn-novo-item').classList.add('hidden');
  document.getElementById('btn-nova-categoria').classList.add('hidden');
}

document.getElementById('btn-logout').addEventListener('click', () => {
  localStorage.removeItem('smartstock_token');
  localStorage.removeItem('smartstock_usuario');
  window.location.href = 'login.html';
});

const carregadores = {
  painel: carregarPainel,
  estoque: carregarEstoque,
  entrada: carregarSelectsItens,
  saida: carregarSelectsItens,
  historico: carregarHistorico,
  categorias: carregarCategorias,
  funcionarios: carregarFuncionarios,
};

function irPara(view) {
  document.querySelectorAll('.view').forEach((s) => s.classList.add('hidden'));
  document.getElementById(`view-${view}`).classList.remove('hidden');

  document.querySelectorAll('nav.main-nav button').forEach((b) => {
    b.classList.toggle('active', b.dataset.view === view);
  });

  carregadores[view]?.();
}

document.querySelectorAll('[data-view]').forEach((btn) => {
  btn.addEventListener('click', () => irPara(btn.dataset.view));
});

// ---------------------------------------------------------------------
// Estado compartilhado
// ---------------------------------------------------------------------
let cacheItens = [];
let cacheCategorias = [];

async function carregarCategoriasCache() {
  cacheCategorias = await api('/categorias');
  const selects = [
    document.getElementById('item-categoria'),
    document.getElementById('estoque-filtro-categoria'),
  ];
  selects.forEach((sel) => {
    const valorAtual = sel.value;
    const primeira = sel.id === 'item-categoria' ? 'Sem categoria' : 'Todas as categorias';
    sel.innerHTML = `<option value="">${primeira}</option>` +
      cacheCategorias.map((c) => `<option value="${c.id}">${escapar(c.nome)}</option>`).join('');
    sel.value = valorAtual;
  });
}

// ---------------------------------------------------------------------
// PAINEL
// ---------------------------------------------------------------------
async function carregarPainel() {
  try {
    const [itens, movimentacoes] = await Promise.all([api('/itens'), api('/movimentacoes')]);
    cacheItens = itens;

    const totalUnidades = itens.reduce((s, i) => s + i.quantidade, 0);
    const abaixoMinimo = itens.filter((i) => i.quantidade <= i.quantidade_minima).length;

    const hoje = new Date().toISOString().slice(0, 10);
    const movHoje = movimentacoes.filter((m) => m.data_hora.slice(0, 10) === hoje).length;

    document.getElementById('stat-total-unidades').textContent = totalUnidades.toLocaleString('pt-BR');
    document.getElementById('stat-abaixo-minimo').textContent = abaixoMinimo;
    document.getElementById('stat-mov-hoje').textContent = movHoje;

    document.getElementById('painel-ultimas-mov').innerHTML =
      movimentacoes.length === 0
        ? vazio('Nenhuma movimentação registrada', 'As entradas e saídas aparecerão aqui.')
        : tabelaMovimentacoes(movimentacoes.slice(0, 8));
  } catch (err) {
    toast(err.message, 'error');
  }
}

// ---------------------------------------------------------------------
// ESTOQUE — UC005
// ---------------------------------------------------------------------
async function carregarEstoque() {
  try {
    await carregarCategoriasCache();

    const busca = document.getElementById('estoque-busca').value.trim();
    const categoriaId = document.getElementById('estoque-filtro-categoria').value;

    const params = new URLSearchParams();
    if (busca) params.set('busca', busca);
    if (categoriaId) params.set('categoria_id', categoriaId);

    const itens = await api(`/itens?${params}`);
    cacheItens = itens;

    // [UC005.FS001] Item não encontrado
    if (itens.length === 0) {
      document.getElementById('estoque-tabela').innerHTML = busca || categoriaId
        ? vazio('Nenhum item encontrado', 'Nenhum item corresponde à pesquisa. Tente outros termos.')
        : vazio('Estoque vazio', 'Cadastre o primeiro item para começar.');
      return;
    }

    document.getElementById('estoque-tabela').innerHTML = `
      <table class="manifest">
        <thead>
          <tr>
            <th>ITEM</th><th>CATEGORIA</th><th>QTD.</th><th>MÍNIMO</th><th>SITUAÇÃO</th>
            ${ehGerente ? '<th style="text-align:right;">AÇÕES</th>' : ''}
          </tr>
        </thead>
        <tbody>
          ${itens.map((i) => `
            <tr>
              <td><b>${escapar(i.nome)}</b>${i.descricao ? `<div style="font-size:12px;color:var(--ink-soft);">${escapar(i.descricao)}</div>` : ''}</td>
              <td>${escapar(i.categoria_nome || '—')}</td>
              <td class="num">${i.quantidade} ${escapar(i.unidade)}</td>
              <td class="num">${i.quantidade_minima}</td>
              <td>${i.quantidade <= i.quantidade_minima
                    ? '<span class="badge badge-alerta">REPOR</span>'
                    : '<span class="badge badge-ok">OK</span>'}</td>
              ${ehGerente ? `<td style="text-align:right;white-space:nowrap;">
                  <button class="btn btn-ghost btn-sm" onclick="editarItem(${i.id})">Editar</button>
                  <button class="btn-danger-text" onclick="confirmarExclusaoItem(${i.id}, '${escapar(i.nome).replace(/'/g, "\\'")}')">Excluir</button>
                </td>` : ''}
            </tr>`).join('')}
        </tbody>
      </table>`;
  } catch (err) {
    toast(err.message, 'error');
  }
}

let debounceBusca;
document.getElementById('estoque-busca').addEventListener('input', () => {
  clearTimeout(debounceBusca);
  debounceBusca = setTimeout(carregarEstoque, 300);
});
document.getElementById('estoque-filtro-categoria').addEventListener('change', carregarEstoque);

// -- UC002 / UC008: cadastrar e alterar item --------------------------
document.getElementById('btn-novo-item').addEventListener('click', async () => {
  await carregarCategoriasCache();
  document.getElementById('modal-item-titulo').textContent = 'Novo item';
  document.getElementById('form-item').reset();
  document.getElementById('item-id').value = '';
  document.getElementById('item-quantidade').parentElement.style.display = '';
  limparErro('item-error');
  abrirModal('modal-item');
});

window.editarItem = async (id) => {
  await carregarCategoriasCache();
  const item = cacheItens.find((i) => i.id === id);
  if (!item) return;

  document.getElementById('modal-item-titulo').textContent = 'Editar item';
  document.getElementById('item-id').value = item.id;
  document.getElementById('item-nome').value = item.nome;
  document.getElementById('item-categoria').value = item.categoria_id || '';
  document.getElementById('item-unidade').value = item.unidade;
  document.getElementById('item-qtd-min').value = item.quantidade_minima;
  document.getElementById('item-descricao').value = item.descricao || '';

  // A quantidade só muda por entrada/saída — não é editável diretamente.
  document.getElementById('item-quantidade').parentElement.style.display = 'none';

  limparErro('item-error');
  abrirModal('modal-item');
};

document.getElementById('form-item').addEventListener('submit', async (e) => {
  e.preventDefault();
  limparErro('item-error');

  const id = document.getElementById('item-id').value;
  const corpo = {
    nome: document.getElementById('item-nome').value.trim(),
    categoria_id: document.getElementById('item-categoria').value || null,
    unidade: document.getElementById('item-unidade').value.trim() || 'un',
    quantidade_minima: Number(document.getElementById('item-qtd-min').value || 0),
    descricao: document.getElementById('item-descricao').value.trim() || null,
  };

  // [UC002.FS001] Dados inválidos ou incompletos
  if (!corpo.nome) return mostrarErro('item-error', 'O nome do item é obrigatório.');

  if (!id) corpo.quantidade = Number(document.getElementById('item-quantidade').value || 0);

  try {
    await api(id ? `/itens/${id}` : '/itens', {
      method: id ? 'PUT' : 'POST',
      body: JSON.stringify(corpo),
    });
    fecharModal('modal-item');
    toast(id ? 'Item atualizado com sucesso.' : 'Item cadastrado com sucesso.');
    carregarEstoque();
  } catch (err) {
    mostrarErro('item-error', err.message);
  }
});

// -- UC009: excluir item (com confirmação) ----------------------------
let acaoConfirmacao = null;

window.confirmarExclusaoItem = (id, nome) => {
  document.getElementById('modal-confirmar-titulo').textContent = 'Excluir item';
  document.getElementById('modal-confirmar-texto').textContent =
    `Deseja realmente excluir "${nome}"? O histórico de movimentações será preservado.`;
  acaoConfirmacao = async () => {
    await api(`/itens/${id}`, { method: 'DELETE' });
    toast('Item excluído com sucesso.');
    carregarEstoque();
  };
  abrirModal('modal-confirmar');
};

document.getElementById('btn-confirmar-exclusao').addEventListener('click', async () => {
  if (!acaoConfirmacao) return;
  try {
    await acaoConfirmacao();
    fecharModal('modal-confirmar');
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    acaoConfirmacao = null;
  }
});

// ---------------------------------------------------------------------
// ENTRADA / SAÍDA — UC003 e UC004
// ---------------------------------------------------------------------
async function carregarSelectsItens() {
  try {
    const itens = await api('/itens');
    cacheItens = itens;

    const selEntrada = document.getElementById('entrada-item');
    const selSaida = document.getElementById('saida-item');

    if (itens.length === 0) {
      const aviso = '<option value="">Nenhum item cadastrado</option>';
      selEntrada.innerHTML = aviso;
      selSaida.innerHTML = aviso;
      return;
    }

    selEntrada.innerHTML = '<option value="">Selecione um item…</option>' +
      itens.map((i) => `<option value="${i.id}">${escapar(i.nome)} — ${i.quantidade} ${escapar(i.unidade)}</option>`).join('');

    // Na saída, o sistema apresenta os itens disponíveis (fluxo principal, passo 2)
    const disponiveis = itens.filter((i) => i.quantidade > 0);
    selSaida.innerHTML = disponiveis.length === 0
      ? '<option value="">Nenhum item disponível em estoque</option>'
      : '<option value="">Selecione um item…</option>' +
        disponiveis.map((i) => `<option value="${i.id}" data-qtd="${i.quantidade}">${escapar(i.nome)} — ${i.quantidade} ${escapar(i.unidade)}</option>`).join('');
  } catch (err) {
    toast(err.message, 'error');
  }
}

document.getElementById('saida-item').addEventListener('change', (e) => {
  const item = cacheItens.find((i) => i.id === Number(e.target.value));
  const wrap = document.getElementById('saida-disponivel-wrap');
  if (item) {
    document.getElementById('saida-disponivel').textContent = `${item.quantidade} ${item.unidade}`;
    document.getElementById('saida-quantidade').max = item.quantidade;
    wrap.style.display = '';
  } else {
    wrap.style.display = 'none';
  }
});

// UC003 — Registrar entrada
document.getElementById('form-entrada').addEventListener('submit', async (e) => {
  e.preventDefault();
  limparErro('entrada-error');

  const item_id = document.getElementById('entrada-item').value;
  const quantidade = Number(document.getElementById('entrada-quantidade').value);

  // [UC003.FS001] Quantidade inválida
  if (!item_id) return mostrarErro('entrada-error', 'Selecione um item.');
  if (!Number.isInteger(quantidade) || quantidade <= 0) {
    return mostrarErro('entrada-error', 'Informe uma quantidade válida (número inteiro maior que zero).');
  }

  try {
    const r = await api('/movimentacoes/entrada', {
      method: 'POST',
      body: JSON.stringify({ item_id: Number(item_id), quantidade, observacao: document.getElementById('entrada-obs').value.trim() }),
    });
    toast(`Entrada registrada. Novo saldo: ${r.item.quantidade} ${r.item.unidade}.`);
    document.getElementById('form-entrada').reset();
    carregarSelectsItens();
  } catch (err) {
    mostrarErro('entrada-error', err.message);
  }
});

// UC004 — Registrar saída
document.getElementById('form-saida').addEventListener('submit', async (e) => {
  e.preventDefault();
  limparErro('saida-error');

  const item_id = document.getElementById('saida-item').value;
  const quantidade = Number(document.getElementById('saida-quantidade').value);

  if (!item_id) return mostrarErro('saida-error', 'Selecione um item.');
  if (!Number.isInteger(quantidade) || quantidade <= 0) {
    return mostrarErro('saida-error', 'Informe uma quantidade válida (número inteiro maior que zero).');
  }

  // [UC004.FS001] Quantidade maior que o estoque disponível (validado também no servidor)
  const item = cacheItens.find((i) => i.id === Number(item_id));
  if (item && quantidade > item.quantidade) {
    return mostrarErro('saida-error', `Quantidade disponível insuficiente. Estoque atual: ${item.quantidade} ${item.unidade}.`);
  }

  try {
    const r = await api('/movimentacoes/saida', {
      method: 'POST',
      body: JSON.stringify({ item_id: Number(item_id), quantidade, observacao: document.getElementById('saida-obs').value.trim() }),
    });
    toast(`Saída registrada. Novo saldo: ${r.item.quantidade} ${r.item.unidade}.`);
    document.getElementById('form-saida').reset();
    document.getElementById('saida-disponivel-wrap').style.display = 'none';
    carregarSelectsItens();
  } catch (err) {
    mostrarErro('saida-error', err.message);
  }
});

// ---------------------------------------------------------------------
// HISTÓRICO — UC006
// ---------------------------------------------------------------------
function tabelaMovimentacoes(movimentacoes) {
  return `
    <table class="manifest">
      <thead>
        <tr><th>DATA / HORA</th><th>TIPO</th><th>ITEM</th><th>QTD.</th><th>RESPONSÁVEL</th><th>OBSERVAÇÃO</th></tr>
      </thead>
      <tbody>
        ${movimentacoes.map((m) => `
          <tr>
            <td class="num">${formatarDataHora(m.data_hora)}</td>
            <td><span class="badge badge-${m.tipo}">${m.tipo === 'entrada' ? '↓ ENTRADA' : '↑ SAÍDA'}</span></td>
            <td>${escapar(m.item_nome)}</td>
            <td class="num">${m.quantidade} ${escapar(m.unidade)}</td>
            <td>${escapar(m.funcionario_nome)}</td>
            <td style="color:var(--ink-soft);">${escapar(m.observacao || '—')}</td>
          </tr>`).join('')}
      </tbody>
    </table>`;
}

async function carregarHistorico() {
  try {
    const params = new URLSearchParams();
    const tipo = document.getElementById('historico-tipo').value;
    const inicio = document.getElementById('historico-inicio').value;
    const fim = document.getElementById('historico-fim').value;
    if (tipo) params.set('tipo', tipo);
    if (inicio) params.set('dataInicio', inicio);
    if (fim) params.set('dataFim', fim);

    const movimentacoes = await api(`/movimentacoes?${params}`);

    // [UC006.FS001] Nenhuma movimentação encontrada
    document.getElementById('historico-tabela').innerHTML = movimentacoes.length === 0
      ? vazio('Nenhuma movimentação encontrada', 'Não há movimentações registradas para os filtros selecionados.')
      : tabelaMovimentacoes(movimentacoes);
  } catch (err) {
    toast(err.message, 'error');
  }
}

document.getElementById('btn-historico-filtrar').addEventListener('click', carregarHistorico);
document.getElementById('historico-tipo').addEventListener('change', carregarHistorico);

// ---------------------------------------------------------------------
// CATEGORIAS — RF03
// ---------------------------------------------------------------------
async function carregarCategorias() {
  try {
    await carregarCategoriasCache();

    document.getElementById('categorias-tabela').innerHTML = cacheCategorias.length === 0
      ? vazio('Nenhuma categoria cadastrada', 'Crie categorias para organizar os itens do almoxarifado.')
      : `<table class="manifest">
          <thead><tr><th>NOME</th><th>DESCRIÇÃO</th>${ehGerente ? '<th style="text-align:right;">AÇÕES</th>' : ''}</tr></thead>
          <tbody>
            ${cacheCategorias.map((c) => `
              <tr>
                <td><b>${escapar(c.nome)}</b></td>
                <td style="color:var(--ink-soft);">${escapar(c.descricao || '—')}</td>
                ${ehGerente ? `<td style="text-align:right;white-space:nowrap;">
                    <button class="btn btn-ghost btn-sm" onclick="editarCategoria(${c.id})">Editar</button>
                    <button class="btn-danger-text" onclick="confirmarExclusaoCategoria(${c.id}, '${escapar(c.nome).replace(/'/g, "\\'")}')">Excluir</button>
                  </td>` : ''}
              </tr>`).join('')}
          </tbody>
        </table>`;
  } catch (err) {
    toast(err.message, 'error');
  }
}

document.getElementById('btn-nova-categoria').addEventListener('click', () => {
  document.getElementById('modal-categoria-titulo').textContent = 'Nova categoria';
  document.getElementById('form-categoria').reset();
  document.getElementById('categoria-id').value = '';
  limparErro('categoria-error');
  abrirModal('modal-categoria');
});

window.editarCategoria = (id) => {
  const c = cacheCategorias.find((x) => x.id === id);
  if (!c) return;
  document.getElementById('modal-categoria-titulo').textContent = 'Editar categoria';
  document.getElementById('categoria-id').value = c.id;
  document.getElementById('categoria-nome').value = c.nome;
  document.getElementById('categoria-descricao').value = c.descricao || '';
  limparErro('categoria-error');
  abrirModal('modal-categoria');
};

document.getElementById('form-categoria').addEventListener('submit', async (e) => {
  e.preventDefault();
  limparErro('categoria-error');

  const id = document.getElementById('categoria-id').value;
  const nome = document.getElementById('categoria-nome').value.trim();
  if (!nome) return mostrarErro('categoria-error', 'O nome da categoria é obrigatório.');

  try {
    await api(id ? `/categorias/${id}` : '/categorias', {
      method: id ? 'PUT' : 'POST',
      body: JSON.stringify({ nome, descricao: document.getElementById('categoria-descricao').value.trim() || null }),
    });
    fecharModal('modal-categoria');
    toast(id ? 'Categoria atualizada.' : 'Categoria cadastrada.');
    carregarCategorias();
  } catch (err) {
    mostrarErro('categoria-error', err.message);
  }
});

window.confirmarExclusaoCategoria = (id, nome) => {
  document.getElementById('modal-confirmar-titulo').textContent = 'Excluir categoria';
  document.getElementById('modal-confirmar-texto').textContent =
    `Deseja excluir a categoria "${nome}"? Os itens dela ficarão sem categoria.`;
  acaoConfirmacao = async () => {
    await api(`/categorias/${id}`, { method: 'DELETE' });
    toast('Categoria excluída.');
    carregarCategorias();
  };
  abrirModal('modal-confirmar');
};

// ---------------------------------------------------------------------
// FUNCIONÁRIOS — UC007 / UC008 (somente gerente)
// ---------------------------------------------------------------------
let cacheFuncionarios = [];

async function carregarFuncionarios() {
  if (!ehGerente) return;
  try {
    cacheFuncionarios = await api('/funcionarios');

    document.getElementById('funcionarios-tabela').innerHTML = cacheFuncionarios.length === 0
      ? vazio('Nenhum funcionário cadastrado', 'Cadastre funcionários para dar acesso ao sistema.')
      : `<table class="manifest">
          <thead><tr><th>NOME</th><th>E-MAIL</th><th>CARGO</th><th>SITUAÇÃO</th><th style="text-align:right;">AÇÕES</th></tr></thead>
          <tbody>
            ${cacheFuncionarios.map((f) => `
              <tr style="${f.ativo ? '' : 'opacity:0.5;'}">
                <td><b>${escapar(f.nome)}</b></td>
                <td style="color:var(--ink-soft);">${escapar(f.email)}</td>
                <td><span class="badge badge-${f.cargo}">${f.cargo === 'gerente' ? 'GERENTE' : 'FUNCIONÁRIO'}</span></td>
                <td>${f.ativo ? 'Ativo' : 'Inativo'}</td>
                <td style="text-align:right;white-space:nowrap;">
                  <button class="btn btn-ghost btn-sm" onclick="editarFuncionario(${f.id})">Editar</button>
                  ${f.ativo && f.id !== usuario.id
                      ? `<button class="btn-danger-text" onclick="confirmarExclusaoFuncionario(${f.id}, '${escapar(f.nome).replace(/'/g, "\\'")}')">Desativar</button>`
                      : ''}
                </td>
              </tr>`).join('')}
          </tbody>
        </table>`;
  } catch (err) {
    toast(err.message, 'error');
  }
}

document.getElementById('btn-novo-funcionario').addEventListener('click', () => {
  document.getElementById('modal-funcionario-titulo').textContent = 'Novo funcionário';
  document.getElementById('form-funcionario').reset();
  document.getElementById('funcionario-id').value = '';
  document.getElementById('funcionario-senha-label').textContent = 'Senha';
  document.getElementById('funcionario-senha').required = true;
  limparErro('funcionario-error');
  abrirModal('modal-funcionario');
});

window.editarFuncionario = (id) => {
  const f = cacheFuncionarios.find((x) => x.id === id);
  if (!f) return;
  document.getElementById('modal-funcionario-titulo').textContent = 'Editar funcionário';
  document.getElementById('funcionario-id').value = f.id;
  document.getElementById('funcionario-nome').value = f.nome;
  document.getElementById('funcionario-email').value = f.email;
  document.getElementById('funcionario-cargo').value = f.cargo;
  document.getElementById('funcionario-senha').value = '';
  document.getElementById('funcionario-senha-label').textContent = 'Nova senha (deixe em branco para manter)';
  document.getElementById('funcionario-senha').required = false;
  limparErro('funcionario-error');
  abrirModal('modal-funcionario');
};

document.getElementById('form-funcionario').addEventListener('submit', async (e) => {
  e.preventDefault();
  limparErro('funcionario-error');

  const id = document.getElementById('funcionario-id').value;
  const nome = document.getElementById('funcionario-nome').value.trim();
  const email = document.getElementById('funcionario-email').value.trim();
  const senha = document.getElementById('funcionario-senha').value;
  const cargo = document.getElementById('funcionario-cargo').value;

  // [UC007.FS001] / [UC008.FS001] Dados inválidos ou incompletos
  if (!nome || !email) return mostrarErro('funcionario-error', 'Nome e e-mail são obrigatórios.');
  if (!id && senha.length < 6) return mostrarErro('funcionario-error', 'A senha deve ter ao menos 6 caracteres.');
  if (id && senha && senha.length < 6) return mostrarErro('funcionario-error', 'A nova senha deve ter ao menos 6 caracteres.');

  const corpo = { nome, email, cargo };
  if (senha) corpo.senha = senha;

  try {
    await api(id ? `/funcionarios/${id}` : '/funcionarios', {
      method: id ? 'PUT' : 'POST',
      body: JSON.stringify(corpo),
    });
    fecharModal('modal-funcionario');
    toast(id ? 'Funcionário atualizado.' : 'Funcionário cadastrado.');
    carregarFuncionarios();
  } catch (err) {
    mostrarErro('funcionario-error', err.message);
  }
});

window.confirmarExclusaoFuncionario = (id, nome) => {
  document.getElementById('modal-confirmar-titulo').textContent = 'Desativar funcionário';
  document.getElementById('modal-confirmar-texto').textContent =
    `Deseja desativar o acesso de "${nome}"? O histórico de movimentações dele será preservado.`;
  acaoConfirmacao = async () => {
    await api(`/funcionarios/${id}`, { method: 'DELETE' });
    toast('Funcionário desativado.');
    carregarFuncionarios();
  };
  abrirModal('modal-confirmar');
};

// ---------------------------------------------------------------------
// Início
// ---------------------------------------------------------------------
irPara('painel');
