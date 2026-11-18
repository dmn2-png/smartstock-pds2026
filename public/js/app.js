// app.js — SmartStock: toda a lógica da tela (navegação, chamadas à API, formulários)
'use strict';

// ---------------------------------------------------------------------
// Sessão e utilidades
// ---------------------------------------------------------------------
const TOKEN = localStorage.getItem('smartstock_token');
let USUARIO = {};
let EH_GERENTE = false;
const ADMIN = ['funcionarios', 'cadastro', 'categorias']; // telas exclusivas do gerente

const $ = (seletor) => document.querySelector(seletor);

// Troca caracteres perigosos (<, >, &, aspas) para que um texto digitado nunca vire HTML.
function esc(texto) {
  return String(texto ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function fmtDataHora(iso) {
  return new Date(iso).toLocaleString('pt-BR');
}

// "2026-10-22" -> "22/10" (feito na mão, sem Date, para o dia não "andar" por causa do fuso)
function fmtPrazo(texto) {
  const [, mes, dia] = texto.split('-');
  return `${dia}/${mes}`;
}

function hojeLocal() {
  return new Date().toLocaleDateString('sv-SE'); // formato AAAA-MM-DD no fuso do navegador
}

function toast(mensagem, tipo = 'ok') {
  const el = document.createElement('div');
  el.className = `toast ${tipo}`;
  el.textContent = mensagem;
  $('#toasts').appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

function sair() {
  localStorage.removeItem('smartstock_token');
  localStorage.removeItem('smartstock_usuario');
  location.replace('login.html');
}

// Todas as chamadas ao servidor passam por aqui: já manda o token e trata o erro 401.
async function api(caminho, { metodo = 'GET', corpo } = {}) {
  const resp = await fetch('/api' + caminho, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + TOKEN },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  if (resp.status === 401) {
    sair();
    throw new Error('Sessão expirada. Entre novamente.');
  }
  const dados = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(dados.erro || 'Erro ao falar com o servidor.');
  return dados;
}

function vazio(titulo, texto) {
  return `<div class="vazio"><b>${esc(titulo)}</b>${esc(texto)}</div>`;
}

function mostrarErro(id, mensagem) {
  const caixa = $(id);
  caixa.textContent = mensagem;
  caixa.classList.add('show');
}
const limparErro = (id) => $(id).classList.remove('show');

// ---------------------------------------------------------------------
// Modais
// ---------------------------------------------------------------------
function abrir(id) {
  $(id).classList.add('show');
  $(id).querySelector('input:not([type=hidden]), select')?.focus();
}
function fechar(id) { $(id).classList.remove('show'); }

let acaoConfirmada = null;
function confirmar(titulo, texto, rotulo, fn) {
  $('#conf-titulo').textContent = titulo;
  $('#conf-texto').textContent = texto;
  $('#conf-ok').textContent = rotulo;
  acaoConfirmada = fn;
  abrir('#modal-confirmar');
}
$('#conf-ok').addEventListener('click', async () => {
  const fn = acaoConfirmada;
  acaoConfirmada = null;
  fechar('#modal-confirmar');
  try { await fn(); } catch (e) { toast(e.message, 'erro'); }
});

// Envolve o envio de um formulário: bloqueia o botão enquanto espera (evita clique duplo).
async function enviar(form, erroId, fn) {
  limparErro(erroId);
  const botoes = form.querySelectorAll('button[type=submit]');
  botoes.forEach((b) => (b.disabled = true));
  try { await fn(); } catch (e) { mostrarErro(erroId, e.message); } finally { botoes.forEach((b) => (b.disabled = false)); }
}

// ---------------------------------------------------------------------
// Navegação
// ---------------------------------------------------------------------
let viewAtual = 'inicio';

function irPara(nome) {
  if (!CARREGAR[nome] || (ADMIN.includes(nome) && !EH_GERENTE)) nome = 'inicio';
  viewAtual = nome;
  document.querySelectorAll('.view').forEach((s) => s.classList.toggle('hidden', s.id !== 'view-' + nome));
  document.querySelectorAll('[data-ir]').forEach((b) => {
    if (b.dataset.ir === nome) b.setAttribute('aria-current', 'page'); // destaque do item atual
    else b.removeAttribute('aria-current');
  });
  CARREGAR[nome]().catch((e) => toast(e.message, 'erro'));
}
const recarregar = () => irPara(viewAtual);

window.addEventListener('hashchange', () => irPara(location.hash.slice(1)));

// ---------------------------------------------------------------------
// INÍCIO
// ---------------------------------------------------------------------
function tabelaMov(movs, completo = false) {
  const linhas = movs.map((m) => {
    const tipo = m.tipo === 'entrada' ? '<span class="bd in">↓ ENTRADA</span>' : '<span class="bd out">↑ SAÍDA</span>';
    return `<tr><td class="num fraco">${fmtDataHora(m.data_hora)}</td><td><b>${esc(m.item_nome)}</b></td><td>${tipo}</td>
      <td class="num" style="text-align:right"><b>${m.quantidade}</b></td>${completo ? `<td>${esc(m.funcionario_nome)}</td>` : ''}
      <td class="fraco"><i>${esc(m.observacao || '—')}</i></td></tr>`;
  }).join('');
  return `<table class="tbl"><thead><tr><th>DATA / HORA</th><th>ITEM</th><th>TIPO</th><th style="text-align:right">QTD.</th>${completo ? '<th>RESPONSÁVEL</th>' : ''}<th>OBSERVAÇÃO</th></tr></thead><tbody>${linhas}</tbody></table>`;
}

async function inicio() {
  const [resumo, movs] = await Promise.all([api('/resumo'), api('/movimentacoes?minhas=true&limite=5')]);
  $('#st-hoje').textContent = resumo.movimentacoes_hoje;
  $('#st-falta').textContent = resumo.itens_em_falta;
  $('#st-total').textContent = resumo.unidades_total;
  $('#inicio-movs').innerHTML = movs.length
    ? tabelaMov(movs)
    : vazio('Você ainda não fez movimentações', 'Registre uma entrada ou saída na tela Movimentações.');
}

// ---------------------------------------------------------------------
// ESTOQUE — UC005
// ---------------------------------------------------------------------
let catsCache = [];

async function carregarCategorias() {
  catsCache = await api('/categorias');
  const opcoes = catsCache.map((c) => `<option value="${c.id}">${esc(c.nome)}</option>`).join('');
  [['#est-categoria', 'Todas'], ['#cad-categoria', 'Sem categoria'], ['#item-categoria', 'Sem categoria']].forEach(([id, primeira]) => {
    const sel = $(id);
    const valor = sel.value;
    sel.innerHTML = `<option value="">${primeira}</option>${opcoes}`;
    sel.value = valor;
  });
}

let itensEstoque = [];

async function tabelaEstoque() {
  const p = new URLSearchParams();
  const busca = $('#est-busca').value.trim();
  if (busca) p.set('busca', busca);
  if ($('#est-categoria').value) p.set('categoria_id', $('#est-categoria').value);
  p.set('ordem', $('#est-ordem').value);

  itensEstoque = await api('/itens?' + p);
  if (itensEstoque.length === 0) { // [UC005.FS001] Item não encontrado
    $('#est-tabela').innerHTML = busca || $('#est-categoria').value
      ? vazio('Nenhum item encontrado', 'Nenhum item corresponde à pesquisa. Tente outros termos.')
      : vazio('Estoque vazio', 'Peça a um gerente para cadastrar os primeiros itens.');
    return;
  }
  const gerente = (i) => `<button class="chip c-ed" data-acao="editar-item" data-id="${i.id}">Editar</button><button class="chip c-out" data-acao="apagar-item" data-id="${i.id}">Excluir</button>`;
  $('#est-tabela').innerHTML = `<table class="tbl"><thead><tr><th>ITEM</th><th>CATEGORIA</th><th style="text-align:right">QTD.</th><th>MÍNIMO</th><th>SITUAÇÃO</th><th style="text-align:center">AÇÕES</th></tr></thead><tbody>${
    itensEstoque.map((i) => `<tr><td><b>${esc(i.nome)}</b></td><td>${esc(i.categoria_nome || '—')}</td>
      <td class="num" style="text-align:right"><b>${i.quantidade}</b> <span class="fraco">${esc(i.unidade)}</span></td>
      <td class="num fraco">${i.quantidade_minima}</td>
      <td>${i.quantidade <= i.quantidade_minima ? '<span class="bd out">ABAIXO DO MÍN.</span>' : '<span class="bd in">OK</span>'}</td>
      <td class="acoes"><button class="chip c-in" data-acao="mov" data-tipo="entrada" data-item="${i.id}">+ Entrada</button><button class="chip c-out" data-acao="mov" data-tipo="saida" data-item="${i.id}">- Saída</button>${EH_GERENTE ? gerente(i) : ''}</td></tr>`).join('')}</tbody></table>`;
}

async function estoque() {
  await carregarCategorias();
  await tabelaEstoque();
}

let esperaBusca;
$('#est-busca').addEventListener('input', () => {
  clearTimeout(esperaBusca);
  esperaBusca = setTimeout(() => tabelaEstoque().catch((e) => toast(e.message, 'erro')), 300);
});
['#est-categoria', '#est-ordem'].forEach((id) => $(id).addEventListener('change', () => tabelaEstoque().catch((e) => toast(e.message, 'erro'))));

// ---------------------------------------------------------------------
// CHECKLISTS (de cada usuário)
// ---------------------------------------------------------------------
let checksCache = [];

async function checklists() {
  $('#ck-nome').textContent = USUARIO.nome || '';
  checksCache = await api('/checklists');
  const feitos = checksCache.filter((c) => c.concluido).length;
  $('#ck-contador').textContent = checksCache.length ? `${feitos} de ${checksCache.length} concluídos` : '';

  if (checksCache.length === 0) {
    $('#ck-lista').innerHTML = vazio('Nenhum item no seu checklist', 'Use o botão abaixo para criar o primeiro.');
    return;
  }
  const hoje = hojeLocal();
  $('#ck-lista').innerHTML = `<table class="tbl"><thead><tr><th></th><th>ITEM</th><th>PRAZO</th><th></th></tr></thead><tbody>${
    checksCache.map((c) => {
      const atrasado = c.prazo && !c.concluido && c.prazo < hoje;
      return `<tr>
        <td><input type="checkbox" data-check="${c.id}" ${c.concluido ? 'checked' : ''} aria-label="Concluir: ${esc(c.titulo)}"></td>
        <td class="${c.concluido ? 'feito' : 'pendente'}">${esc(c.titulo)}</td>
        <td class="prazo ${atrasado ? 'atrasado' : 'fraco'}">${c.prazo ? fmtPrazo(c.prazo) + (atrasado ? ' · atrasado' : '') : '—'}</td>
        <td class="acoes"><button class="btn-link neutro" data-acao="editar-check" data-id="${c.id}">Editar</button>
          <button class="btn-link" data-acao="apagar-check" data-id="${c.id}">Excluir</button></td></tr>`;
    }).join('')}</tbody></table>`;
}

document.addEventListener('change', async (e) => {
  if (!e.target.matches('[data-check]')) return;
  try {
    await api('/checklists/' + e.target.dataset.check, { metodo: 'PUT', corpo: { concluido: e.target.checked } });
  } catch (erro) {
    toast(erro.message, 'erro');
  }
  checklists().catch((erro) => toast(erro.message, 'erro'));
});

function abrirCheck(item) {
  $('#check-titulo').textContent = item ? 'Editar item do checklist' : 'Novo item do checklist';
  $('#check-id').value = item ? item.id : '';
  $('#check-texto').value = item ? item.titulo : '';
  $('#check-prazo').value = item?.prazo || '';
  limparErro('#check-erro');
  abrir('#modal-check');
}

$('#form-check').addEventListener('submit', (e) => {
  e.preventDefault();
  enviar(e.currentTarget, '#check-erro', async () => {
    const id = $('#check-id').value;
    const corpo = { titulo: $('#check-texto').value.trim(), prazo: $('#check-prazo').value || null };
    if (!corpo.titulo) throw new Error('Informe o que precisa ser feito.');
    await api(id ? '/checklists/' + id : '/checklists', { metodo: id ? 'PUT' : 'POST', corpo });
    fechar('#modal-check');
    toast(id ? 'Item atualizado.' : 'Item adicionado ao checklist.');
    await checklists();
  });
});

// ---------------------------------------------------------------------
// MOVIMENTAÇÕES — UC003, UC004, UC006
// ---------------------------------------------------------------------
async function movimentacoes() {
  const p = new URLSearchParams();
  if ($('#mov-tipo').value) p.set('tipo', $('#mov-tipo').value);
  if ($('#mov-inicio').value) p.set('dataInicio', $('#mov-inicio').value);
  if ($('#mov-fim').value) p.set('dataFim', $('#mov-fim').value);
  if ($('#mov-minhas').checked) p.set('minhas', 'true');

  const movs = await api('/movimentacoes?' + p);
  $('#mov-tabela').innerHTML = movs.length === 0 // [UC006.FS001] Nenhuma movimentação encontrada
    ? vazio('Nenhuma movimentação encontrada', 'Não há movimentações para os filtros escolhidos.')
    : tabelaMov(movs, true);
}
['#mov-tipo', '#mov-inicio', '#mov-fim', '#mov-minhas'].forEach((id) =>
  $(id).addEventListener('change', () => movimentacoes().catch((e) => toast(e.message, 'erro'))));

let itensMov = [];
let tipoMov = 'entrada';

async function abrirMov(tipo, itemId) {
  tipoMov = tipo;
  itensMov = await api('/itens?ordem=az');
  const lista = tipo === 'saida' ? itensMov.filter((i) => i.quantidade > 0) : itensMov; // na saída, só itens com estoque
  if (lista.length === 0) {
    toast(tipo === 'saida' ? 'Não há itens com estoque disponível.' : 'Não há itens cadastrados.', 'erro');
    return;
  }
  $('#mov-titulo').textContent = tipo === 'entrada' ? 'Registrar entrada' : 'Registrar saída';
  $('#mov-sub').textContent = tipo === 'entrada' ? 'Dá entrada de itens no estoque.' : 'Dá saída de itens do estoque.';
  $('#mov-item').innerHTML = lista.map((i) => `<option value="${i.id}">${esc(i.nome)}</option>`).join('');
  if (itemId) { // veio do botão da linha do Estoque: já deixa o item escolhido
    if (!lista.some((i) => i.id === Number(itemId))) { toast('Este item não tem estoque para saída.', 'erro'); return; }
    $('#mov-item').value = itemId;
  }
  $('#mov-qtd').value = '';
  $('#mov-obs').value = '';
  $('#mov-resp').textContent = tipo === 'saida' ? `Responsável pela retirada: ${USUARIO.nome}` : '';
  $('#mov-confirmar').className = tipo === 'entrada' ? 'btn btn-moss' : 'btn btn-rust';
  $('#mov-confirmar').textContent = tipo === 'entrada' ? '↓ Confirmar entrada' : '↑ Confirmar saída';
  atualizarDisponivel();
  limparErro('#mov-erro');
  abrir('#modal-mov');
}

function atualizarDisponivel() {
  const item = itensMov.find((i) => i.id === Number($('#mov-item').value));
  $('#mov-disp').textContent = item ? `Em estoque agora: ${item.quantidade} ${item.unidade}` : '';
  if (tipoMov === 'saida' && item) $('#mov-qtd').max = item.quantidade; else $('#mov-qtd').removeAttribute('max');
}
$('#mov-item').addEventListener('change', atualizarDisponivel);

$('#form-mov').addEventListener('submit', (e) => {
  e.preventDefault();
  enviar(e.currentTarget, '#mov-erro', async () => {
    const quantidade = Number($('#mov-qtd').value);
    // [UC003.FS001] Quantidade inválida
    if (!Number.isInteger(quantidade) || quantidade <= 0) throw new Error('Informe uma quantidade válida (inteiro maior que zero).');
    const resposta = await api('/movimentacoes/' + tipoMov, {
      metodo: 'POST',
      corpo: { item_id: Number($('#mov-item').value), quantidade, observacao: $('#mov-obs').value.trim() },
    });
    fechar('#modal-mov');
    toast(`${resposta.mensagem} Novo saldo: ${resposta.item.quantidade} ${resposta.item.unidade}.`);
    recarregar();
  });
});

// ---------------------------------------------------------------------
// USUÁRIO
// ---------------------------------------------------------------------
async function usuario() {
  const eu = await api('/auth/me');
  $('#usr-nome').textContent = eu.nome;
  $('#usr-email').textContent = eu.email;
  $('#usr-cargo').innerHTML = eu.cargo === 'gerente' ? '<span class="bd gerente">GERENTE</span>' : '<span class="bd func">FUNCIONÁRIO</span>';
}

$('#form-senha').addEventListener('submit', (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  enviar(form, '#senha-erro', async () => {
    const nova = $('#senha-nova').value;
    if (nova.length < 6) throw new Error('A nova senha deve ter ao menos 6 caracteres.');
    if (nova !== $('#senha-conf').value) throw new Error('A confirmação não é igual à nova senha.');
    await api('/auth/senha', { metodo: 'PUT', corpo: { senha_atual: $('#senha-atual').value, senha_nova: nova } });
    form.reset();
    toast('Senha alterada com sucesso.');
  });
});

// ---------------------------------------------------------------------
// FUNCIONÁRIOS — UC007, UC008 (gerente)
// ---------------------------------------------------------------------
let funcsCache = [];

async function funcionarios() {
  funcsCache = await api('/funcionarios');
  $('#func-tabela').innerHTML = `<table class="tbl"><thead><tr><th>NOME</th><th>E-MAIL</th><th>CARGO</th><th>SITUAÇÃO</th><th></th></tr></thead><tbody>${
    funcsCache.map((f) => `<tr style="${f.ativo ? '' : 'opacity:.55'}">
      <td><b>${esc(f.nome)}</b></td><td class="fraco">${esc(f.email)}</td>
      <td>${f.cargo === 'gerente' ? '<span class="bd gerente">GERENTE</span>' : '<span class="bd func">FUNCIONÁRIO</span>'}</td>
      <td>${f.ativo ? 'Ativo' : 'Inativo'}</td>
      <td class="acoes"><button class="btn-link neutro" data-acao="editar-func" data-id="${f.id}">Editar</button>${
        f.id === USUARIO.id ? '' : f.ativo
          ? `<button class="btn-link" data-acao="desativar-func" data-id="${f.id}">Desativar</button>`
          : `<button class="btn-link neutro" data-acao="reativar-func" data-id="${f.id}">Reativar</button>`}</td></tr>`).join('')}</tbody></table>`;
}

function abrirFunc(f) {
  $('#func-titulo').textContent = f ? 'Editar funcionário' : 'Novo funcionário';
  $('#func-id').value = f ? f.id : '';
  $('#func-nome').value = f ? f.nome : '';
  $('#func-email').value = f ? f.email : '';
  $('#func-cargo').value = f ? f.cargo : 'funcionario';
  $('#func-senha').value = '';
  $('#func-senha-lab').textContent = f ? 'NOVA SENHA (DEIXE EM BRANCO PARA MANTER)' : 'SENHA';
  limparErro('#func-erro');
  abrir('#modal-func');
}

$('#form-func').addEventListener('submit', (e) => {
  e.preventDefault();
  enviar(e.currentTarget, '#func-erro', async () => {
    const id = $('#func-id').value;
    const corpo = { nome: $('#func-nome').value.trim(), email: $('#func-email').value.trim(), cargo: $('#func-cargo').value };
    const senha = $('#func-senha').value;
    if (senha) corpo.senha = senha;
    // [UC007.FS001] / [UC008.FS001] Dados inválidos ou incompletos
    if (!corpo.nome || !corpo.email) throw new Error('Nome e e-mail são obrigatórios.');
    if (!id && senha.length < 6) throw new Error('A senha deve ter ao menos 6 caracteres.');
    await api(id ? '/funcionarios/' + id : '/funcionarios', { metodo: id ? 'PUT' : 'POST', corpo });
    fechar('#modal-func');
    toast(id ? 'Funcionário atualizado.' : 'Funcionário cadastrado.');
    await funcionarios();
  });
});

// ---------------------------------------------------------------------
// CADASTRO DE ITENS — UC002, UC008, UC009 (gerente)
// ---------------------------------------------------------------------
async function cadastro() {
  await carregarCategorias();
}

$('#form-cadastro').addEventListener('submit', (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  enviar(form, '#cad-erro', async () => {
    const corpo = {
      nome: $('#cad-nome').value.trim(),
      categoria_id: $('#cad-categoria').value || null,
      quantidade: Number($('#cad-qtd').value || 0),
      quantidade_minima: Number($('#cad-min').value || 0),
      unidade: $('#cad-un').value.trim() || 'un',
    };
    if (!corpo.nome) throw new Error('O nome do item é obrigatório.'); // [UC002.FS001]
    await api('/itens', { metodo: 'POST', corpo });
    form.reset();
    $('#cad-qtd').value = 0; $('#cad-min').value = 0; $('#cad-un').value = 'un';
    toast('Item cadastrado com sucesso.');
    await cadastro();
  });
});

function abrirItem(item) {
  $('#item-id').value = item.id;
  $('#item-nome').value = item.nome;
  $('#item-categoria').value = item.categoria_id || '';
  $('#item-min').value = item.quantidade_minima;
  $('#item-un').value = item.unidade;
  $('#item-desc').value = item.descricao || '';
  limparErro('#item-erro');
  abrir('#modal-item');
}

$('#form-item').addEventListener('submit', (e) => {
  e.preventDefault();
  enviar(e.currentTarget, '#item-erro', async () => {
    const corpo = {
      nome: $('#item-nome').value.trim(),
      categoria_id: $('#item-categoria').value || null,
      quantidade_minima: Number($('#item-min').value || 0),
      unidade: $('#item-un').value.trim() || 'un',
      descricao: $('#item-desc').value.trim() || null,
    };
    if (!corpo.nome) throw new Error('O nome do item não pode ficar vazio.'); // [UC008.FS001]
    await api('/itens/' + $('#item-id').value, { metodo: 'PUT', corpo });
    fechar('#modal-item');
    toast('Item atualizado com sucesso.');
    await tabelaEstoque();
  });
});

// ---------------------------------------------------------------------
// CATEGORIAS — RF03 (gerente)
// ---------------------------------------------------------------------
async function categorias() {
  await carregarCategorias();
  $('#cat-tabela').innerHTML = catsCache.length === 0
    ? vazio('Nenhuma categoria cadastrada', 'Crie categorias para organizar os itens.')
    : `<table class="tbl"><thead><tr><th>NOME</th><th>DESCRIÇÃO</th><th></th></tr></thead><tbody>${
      catsCache.map((c) => `<tr><td><b>${esc(c.nome)}</b></td><td class="fraco">${esc(c.descricao || '—')}</td>
        <td class="acoes"><button class="btn-link neutro" data-acao="editar-cat" data-id="${c.id}">Editar</button>
          <button class="btn-link" data-acao="apagar-cat" data-id="${c.id}">Excluir</button></td></tr>`).join('')}</tbody></table>`;
}

function abrirCat(c) {
  $('#cat-titulo').textContent = c ? 'Editar categoria' : 'Nova categoria';
  $('#cat-id').value = c ? c.id : '';
  $('#cat-nome').value = c ? c.nome : '';
  $('#cat-desc').value = c?.descricao || '';
  limparErro('#cat-erro');
  abrir('#modal-cat');
}

$('#form-cat').addEventListener('submit', (e) => {
  e.preventDefault();
  enviar(e.currentTarget, '#cat-erro', async () => {
    const id = $('#cat-id').value;
    const corpo = { nome: $('#cat-nome').value.trim(), descricao: $('#cat-desc').value.trim() || null };
    if (!corpo.nome) throw new Error('O nome da categoria é obrigatório.');
    await api(id ? '/categorias/' + id : '/categorias', { metodo: id ? 'PUT' : 'POST', corpo });
    fechar('#modal-cat');
    toast(id ? 'Categoria atualizada.' : 'Categoria cadastrada.');
    await categorias();
  });
});

// ---------------------------------------------------------------------
// Cliques da tela (um só "ouvinte" para todos os botões com data-acao)
// ---------------------------------------------------------------------
const ACOES = {
  sair,
  'novo-check': () => abrirCheck(null),
  'editar-check': (d) => abrirCheck(checksCache.find((c) => c.id === Number(d.id))),
  'apagar-check': (d) => confirmar('Excluir item', 'Deseja remover este item do seu checklist?', 'Excluir', async () => {
    await api('/checklists/' + d.id, { metodo: 'DELETE' });
    toast('Item removido do checklist.');
    await checklists();
  }),
  mov: (d) => abrirMov(d.tipo, d.item),
  'novo-item': () => { location.hash = 'cadastro'; },
  'novo-func': () => abrirFunc(null),
  'editar-func': (d) => abrirFunc(funcsCache.find((f) => f.id === Number(d.id))),
  'desativar-func': (d) => confirmar('Desativar funcionário', 'Ele perde o acesso, mas o histórico de movimentações é preservado.', 'Desativar', async () => {
    await api('/funcionarios/' + d.id, { metodo: 'DELETE' });
    toast('Funcionário desativado.');
    await funcionarios();
  }),
  'reativar-func': async (d) => {
    await api('/funcionarios/' + d.id, { metodo: 'PUT', corpo: { ativo: true } });
    toast('Funcionário reativado.');
    await funcionarios();
  },
  'editar-item': (d) => abrirItem(itensEstoque.find((i) => i.id === Number(d.id))),
  'apagar-item': (d) => confirmar('Excluir item', 'Deseja realmente excluir este item? O histórico de movimentações é preservado.', 'Excluir', async () => { // [UC009]
    await api('/itens/' + d.id, { metodo: 'DELETE' });
    toast('Item excluído com sucesso.');
    await tabelaEstoque();
  }),
  'nova-cat': () => abrirCat(null),
  'editar-cat': (d) => abrirCat(catsCache.find((c) => c.id === Number(d.id))),
  'apagar-cat': (d) => confirmar('Excluir categoria', 'Os itens dessa categoria ficarão sem categoria.', 'Excluir', async () => {
    await api('/categorias/' + d.id, { metodo: 'DELETE' });
    toast('Categoria excluída.');
    await categorias();
  }),
};

document.addEventListener('click', async (e) => {
  const nav = e.target.closest('[data-ir]');
  if (nav) {
    if (location.hash.slice(1) === nav.dataset.ir) irPara(nav.dataset.ir);
    else location.hash = nav.dataset.ir;
    return;
  }
  if (e.target.closest('[data-fechar]')) return e.target.closest('.fundo').classList.remove('show');
  if (e.target.classList.contains('fundo')) return e.target.classList.remove('show'); // clique fora do modal

  const botao = e.target.closest('[data-acao]');
  if (botao && ACOES[botao.dataset.acao]) {
    try { await ACOES[botao.dataset.acao](botao.dataset, botao); } catch (erro) { toast(erro.message, 'erro'); }
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') document.querySelectorAll('.fundo.show').forEach((m) => m.classList.remove('show'));
});

const CARREGAR = { inicio, estoque, checklists, movimentacoes, usuario, funcionarios, cadastro, categorias };

// ---------------------------------------------------------------------
// Início
// ---------------------------------------------------------------------
async function iniciar() {
  try {
    USUARIO = await api('/auth/me');
    EH_GERENTE = USUARIO.cargo === 'gerente';
    localStorage.setItem('smartstock_usuario', JSON.stringify(USUARIO));

    if (!EH_GERENTE) document.querySelectorAll('[data-admin]').forEach((el) => el.classList.add('hidden'));
    $('#eu-nome').textContent = USUARIO.nome || '';
    $('#eu-cargo').textContent = EH_GERENTE ? 'GERENTE' : 'FUNCIONÁRIO';
    irPara(location.hash.slice(1) || 'inicio');
  } catch (erro) {
    if (localStorage.getItem('smartstock_token')) toast(erro.message, 'erro');
  }
}

iniciar();
