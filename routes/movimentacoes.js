// routes/movimentacoes.js — RF05 (entrada), RF06 (saída), RF08 (histórico) / UC003, UC004, UC006
import { Router } from 'express';
import { pool, transacao } from '../db.js';
import { autenticar } from '../middleware/auth.js';
import { FUSO, dataValida, inteiro } from '../utils.js';

const router = Router();
router.use(autenticar);

// Valida o que veio no corpo do pedido. Devolve { item_id, qtd } ou uma mensagem de erro.
function lerPedido(body) {
  const item_id = inteiro(body.item_id);
  const qtd = inteiro(body.quantidade);
  if (item_id === null || qtd === null || qtd <= 0) {
    return { erro: 'Informe um item e uma quantidade válida (inteiro maior que zero).' };
  }
  return { item_id, qtd, observacao: body.observacao ? String(body.observacao).trim() || null : null };
}

// UC003 — Registrar entrada
router.post('/entrada', async (req, res) => {
  const pedido = lerPedido(req.body);
  if (pedido.erro) return res.status(400).json({ erro: pedido.erro }); // [UC003.FS001] Quantidade inválida

  const item = (await pool.query('SELECT id FROM item WHERE id = $1 AND ativo = 1', [pedido.item_id])).rows[0];
  if (!item) return res.status(404).json({ erro: 'Item não encontrado.' });

  // Os dois comandos usam o MESMO "client": ou gravam os dois, ou nenhum.
  const itemAtualizado = await transacao(async (client) => {
    await client.query(
      `INSERT INTO movimentacao (item_id, funcionario_id, tipo, quantidade, observacao)
       VALUES ($1, $2, 'entrada', $3, $4)`,
      [pedido.item_id, req.usuario.id, pedido.qtd, pedido.observacao]
    );
    const r = await client.query(
      'UPDATE item SET quantidade = quantidade + $1 WHERE id = $2 RETURNING *',
      [pedido.qtd, pedido.item_id]
    );
    return r.rows[0];
  });

  res.status(201).json({ mensagem: 'Entrada registrada com sucesso.', item: itemAtualizado });
});

// UC004 — Registrar saída (o responsável é quem está logado)
router.post('/saida', async (req, res) => {
  const pedido = lerPedido(req.body);
  if (pedido.erro) return res.status(400).json({ erro: pedido.erro });

  const item = (await pool.query('SELECT * FROM item WHERE id = $1 AND ativo = 1', [pedido.item_id])).rows[0];
  if (!item) return res.status(404).json({ erro: 'Item não encontrado.' });

  // [UC004.FS001] Quantidade maior que o estoque disponível
  if (pedido.qtd > item.quantidade) {
    return res.status(400).json({
      erro: `Quantidade disponível insuficiente. Estoque atual: ${item.quantidade} ${item.unidade}.`,
    });
  }

  const itemAtualizado = await transacao(async (client) => {
    // "AND quantidade >= $1" protege se duas pessoas retirarem ao mesmo tempo:
    // se o estoque acabou no meio do caminho, nenhuma linha é alterada.
    const r = await client.query(
      'UPDATE item SET quantidade = quantidade - $1 WHERE id = $2 AND quantidade >= $1 RETURNING *',
      [pedido.qtd, pedido.item_id]
    );
    if (r.rowCount === 0) return null;
    await client.query(
      `INSERT INTO movimentacao (item_id, funcionario_id, tipo, quantidade, observacao)
       VALUES ($1, $2, 'saida', $3, $4)`,
      [pedido.item_id, req.usuario.id, pedido.qtd, pedido.observacao]
    );
    return r.rows[0];
  });

  if (!itemAtualizado) return res.status(400).json({ erro: 'Quantidade disponível insuficiente.' });
  res.status(201).json({ mensagem: 'Saída registrada com sucesso.', item: itemAtualizado });
});

// UC006 — Histórico. Filtros: item_id, funcionario_id, tipo, dataInicio, dataFim, minhas, limite
router.get('/', async (req, res) => {
  const { item_id, funcionario_id, tipo, dataInicio, dataFim, minhas, limite } = req.query;
  const params = [];
  const add = (valor) => { params.push(valor); return `$${params.length}`; };

  let sql = `
    SELECT m.*, i.nome AS item_nome, i.unidade, f.nome AS funcionario_nome
    FROM movimentacao m
    JOIN item i ON i.id = m.item_id
    JOIN funcionario f ON f.id = m.funcionario_id
    WHERE 1 = 1`;

  if (item_id) {
    if (inteiro(item_id) === null) return res.status(400).json({ erro: 'Item inválido.' });
    sql += ` AND m.item_id = ${add(inteiro(item_id))}`;
  }
  if (funcionario_id) {
    if (inteiro(funcionario_id) === null) return res.status(400).json({ erro: 'Funcionário inválido.' });
    sql += ` AND m.funcionario_id = ${add(inteiro(funcionario_id))}`;
  }
  if (minhas === 'true') sql += ` AND m.funcionario_id = ${add(req.usuario.id)}`; // "feitas por você"
  if (tipo) {
    if (!['entrada', 'saida'].includes(tipo)) return res.status(400).json({ erro: 'Tipo inválido.' });
    sql += ` AND m.tipo = ${add(tipo)}`;
  }
  // As datas são comparadas no fuso do Brasil (o banco guarda em UTC)
  if (dataInicio) {
    if (!dataValida(dataInicio)) return res.status(400).json({ erro: 'Data inicial inválida.' });
    sql += ` AND (m.data_hora AT TIME ZONE ${add(FUSO)})::date >= ${add(dataInicio)}::date`;
  }
  if (dataFim) {
    if (!dataValida(dataFim)) return res.status(400).json({ erro: 'Data final inválida.' });
    sql += ` AND (m.data_hora AT TIME ZONE ${add(FUSO)})::date <= ${add(dataFim)}::date`;
  }

  const lim = Math.min(Math.max(inteiro(limite) || 200, 1), 500);
  sql += ` ORDER BY m.data_hora DESC, m.id DESC LIMIT ${add(lim)}`;

  const resultado = await pool.query(sql, params);
  res.json(resultado.rows); // [UC006.FS001] lista vazia = "nenhuma movimentação" (a tela mostra a mensagem)
});

export default router;
