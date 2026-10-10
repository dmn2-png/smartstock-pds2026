// routes/movimentacoes.js — RF05 (registrar entrada), RF06 (registrar saída), RF08 (histórico)
// UC003 (Registrar entrada), UC004 (Registrar saída), UC006 (Consultar histórico)
import { Router } from 'express';
import { db, transacao } from '../db.js';
import { autenticar } from '../middleware/auth.js';

const router = Router();
router.use(autenticar);

// UC003 — Registrar entrada de item
router.post('/entrada', (req, res) => {
  const { item_id, quantidade, observacao } = req.body;
  const qtd = Number(quantidade);

  // [UC003.FS001] Quantidade inválida
  if (!item_id || !Number.isInteger(qtd) || qtd <= 0) {
    return res.status(400).json({ erro: 'Informe um item e uma quantidade válida (maior que zero).' });
  }

  const item = db.prepare('SELECT * FROM item WHERE id = ? AND ativo = 1').get(item_id);
  if (!item) return res.status(404).json({ erro: 'Item não encontrado.' });

  transacao(() => {
    db.prepare(
      'INSERT INTO movimentacao (item_id, funcionario_id, tipo, quantidade, observacao) VALUES (?, ?, ?, ?, ?)'
    ).run(item_id, req.usuario.id, 'entrada', qtd, observacao || null);
    db.prepare('UPDATE item SET quantidade = quantidade + ? WHERE id = ?').run(qtd, item_id);
  });

  const itemAtualizado = db.prepare('SELECT * FROM item WHERE id = ?').get(item_id);
  res.status(201).json({ mensagem: 'Entrada registrada com sucesso.', item: itemAtualizado });
});

// UC004 — Registrar saída de item
router.post('/saida', (req, res) => {
  const { item_id, quantidade, observacao } = req.body;
  const qtd = Number(quantidade);

  if (!item_id || !Number.isInteger(qtd) || qtd <= 0) {
    return res.status(400).json({ erro: 'Informe um item e uma quantidade válida (maior que zero).' });
  }

  const item = db.prepare('SELECT * FROM item WHERE id = ? AND ativo = 1').get(item_id);
  if (!item) return res.status(404).json({ erro: 'Item não encontrado.' });

  // [UC004.FS001] Quantidade maior que o estoque disponível
  if (qtd > item.quantidade) {
    return res.status(400).json({
      erro: `Quantidade disponível insuficiente. Estoque atual: ${item.quantidade} ${item.unidade}.`,
    });
  }

  // O responsável pela retirada é o próprio usuário autenticado (fluxo principal, passo 5)
  transacao(() => {
    db.prepare(
      'INSERT INTO movimentacao (item_id, funcionario_id, tipo, quantidade, observacao) VALUES (?, ?, ?, ?, ?)'
    ).run(item_id, req.usuario.id, 'saida', qtd, observacao || null);
    db.prepare('UPDATE item SET quantidade = quantidade - ? WHERE id = ?').run(qtd, item_id);
  });

  const itemAtualizado = db.prepare('SELECT * FROM item WHERE id = ?').get(item_id);
  res.status(201).json({ mensagem: 'Saída registrada com sucesso.', item: itemAtualizado });
});

// UC006 — Consultar histórico de movimentações [UC006.FS001]
router.get('/', (req, res) => {
  const { item_id, funcionario_id, tipo, dataInicio, dataFim } = req.query;

  let sql = `
    SELECT m.*, i.nome AS item_nome, i.unidade, f.nome AS funcionario_nome
    FROM movimentacao m
    JOIN item i ON i.id = m.item_id
    JOIN funcionario f ON f.id = m.funcionario_id
    WHERE 1 = 1
  `;
  const params = [];

  if (item_id) { sql += ' AND m.item_id = ?'; params.push(item_id); }
  if (funcionario_id) { sql += ' AND m.funcionario_id = ?'; params.push(funcionario_id); }
  if (tipo) { sql += ' AND m.tipo = ?'; params.push(tipo); }
  if (dataInicio) { sql += ' AND date(m.data_hora) >= date(?)'; params.push(dataInicio); }
  if (dataFim) { sql += ' AND date(m.data_hora) <= date(?)'; params.push(dataFim); }

  sql += ' ORDER BY m.data_hora DESC';

  const movimentacoes = db.prepare(sql).all(...params);
  // [UC006.FS001] Nenhuma movimentação encontrada -> lista vazia (200), front-end trata a mensagem.
  res.json(movimentacoes);
});

export default router;
