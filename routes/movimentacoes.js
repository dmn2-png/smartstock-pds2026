// routes/movimentacoes.js — RF05 (registrar entrada), RF06 (registrar saída), RF08 (histórico)
// UC003 (Registrar entrada), UC004 (Registrar saída), UC006 (Consultar histórico)
import { Router } from 'express';
import { pool, transacao } from '../db.js';
import { autenticar } from '../middleware/auth.js';

const router = Router();
router.use(autenticar);

// UC003 — Registrar entrada de item
router.post('/entrada', async (req, res) => {
  try {
  const { item_id, quantidade, observacao } = req.body;
  const qtd = Number(quantidade);

  // [UC003.FS001] Quantidade inválida
  if (!item_id || !Number.isInteger(qtd) || qtd <= 0) {
    return res.status(400).json({ erro: 'Informe um item e uma quantidade válida (maior que zero).' });
  }

  const resultado = await pool.query('SELECT * FROM item WHERE id = $1 AND ativo = 1', [item_id]);
  const item = resultado.rows[0];
  if (!item) return res.status(404).json({ erro: 'Item não encontrado.' });

  await transacao(async (client) => {
    await client.query(
      'INSERT INTO movimentacao (item_id, funcionario_id, tipo, quantidade, observacao) VALUES ($1, $2, $3, $4, $5)', 
      [item_id, req.usuario.id, 'entrada', qtd, observacao || null]);
    await client.query('UPDATE item SET quantidade = quantidade + $1 WHERE id = $2', [qtd, item_id]);
  });

  const result = await pool.query('SELECT * FROM item WHERE id = $1', [item_id]);
  const itemAtualizado = result.rows[0];
  res.status(201).json({ mensagem: 'Entrada registrada com sucesso.', item: itemAtualizado });
} catch (erro) {
  res.status(500).json({erro: 'Erro ao registrar entrada.'})
}
  
});

// UC004 — Registrar saída de item
router.post('/saida', async (req, res) => {
  try {
  const { item_id, quantidade, observacao } = req.body;
  const qtd = Number(quantidade);

  if (!item_id || !Number.isInteger(qtd) || qtd <= 0) {
    return res.status(400).json({ erro: 'Informe um item e uma quantidade válida (maior que zero).' });
  }

  const resultado = await pool.query('SELECT * FROM item WHERE id = $1 AND ativo = 1', [item_id]);
  const item = resultado.rows[0]
  if (!item) return res.status(404).json({ erro: 'Item não encontrado.' });

  // [UC004.FS001] Quantidade maior que o estoque disponível
  if (qtd > item.quantidade) {
    return res.status(400).json({
      erro: `Quantidade disponível insuficiente. Estoque atual: ${item.quantidade} ${item.unidade}.`,
    });
  }

  // O responsável pela retirada é o próprio usuário autenticado (fluxo principal, passo 5)
  await transacao(async (client) => {
    await client.query(
      'INSERT INTO movimentacao (item_id, funcionario_id, tipo, quantidade, observacao) VALUES ($1, $2, $3, $4, $5)',
      [item_id, req.usuario.id, 'saida', qtd, observacao || null]
    );
    await client.query('UPDATE item SET quantidade = quantidade - $1 WHERE id = $2', [qtd, item_id]);
  });

  const itemAtualizado = await pool.query('SELECT * FROM item WHERE id = $1', [item_id]);
  res.status(201).json({ mensagem: 'Saída registrada com sucesso.', item: itemAtualizado.rows[0] });
} catch (erro) {
  res.status(500).json({ erro: 'Erro ao registrar saída.' });
}
});

// UC006 — Consultar histórico de movimentações [UC006.FS001]
router.get('/', async (req, res) => {
  try {
    const { item_id, funcionario_id, tipo, dataInicio, dataFim } = req.query;

    let sql = `
      SELECT 
        m.*, 
        i.nome AS item_nome, 
        i.unidade, 
        f.nome AS funcionario_nome
      FROM movimentacao m
      LEFT JOIN item i ON i.id = m.item_id
      LEFT JOIN funcionario f ON f.id = m.funcionario_id
      WHERE 1 = 1
    `;
    const params = [];

    if (item_id) {
      params.push(item_id);
      sql += ` AND m.item_id = $${params.length}`;
    }

    if (funcionario_id) {
      params.push(funcionario_id);
      sql += ` AND m.funcionario_id = $${params.length}`;
    }

    if (tipo) {
      params.push(tipo);
      sql += ` AND m.tipo = $${params.length}`;
    }

    if (dataInicio) {
      params.push(dataInicio);
      sql += ` AND m.criado_em::date >= $${params.length}::date`;
    }

    if (dataFim) {
      params.push(dataFim);
      sql += ` AND m.criado_em::date <= $${params.length}::date`;
    }

    sql += ' ORDER BY m.criado_em DESC';

    const movimentacoes = await pool.query(sql, params);
    
    return res.json(movimentacoes.rows);
  } catch (erro) {
    console.error('Erro na consulta de movimentações:', erro);
    return res.status(500).json({ erro: 'Erro ao consultar histórico de movimentações' });
  }
});

export default router;
