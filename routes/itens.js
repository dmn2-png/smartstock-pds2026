// routes/itens.js — RF02 (cadastrar/alterar/excluir itens), RF07 (consultar estoque)
// UC002 (Cadastrar item), UC005 (Consultar estoque), UC008 (Alterar), UC009 (Excluir)
import { Router } from 'express';
import { pool } from '../db.js';
import { autenticar, exigirGerente } from '../middleware/auth.js';

const router = Router();
router.use(autenticar);

// UC005 — Consultar estoque (com busca opcional por nome/categoria) [UC005.FS001]
router.get('/', async (req, res) => {
  try {
  const { busca, categoria_id, apenasAbaixoDoMinimo } = req.query;

  let sql = `
    SELECT i.*, c.nome AS categoria_nome
    FROM item i
    LEFT JOIN categoria c ON c.id = i.categoria_id
    WHERE i.ativo = 1
  `;
  const params = [];

  if (busca) {
    params.push(`%${busca}%`);
    sql += ' AND (i.nome ILIKE $' + params.length + ' OR c.nome ILIKE $' + params.length + ')';
    
  }
  if (categoria_id) {
    params.push(categoria_id);
    sql += ' AND i.categoria_id = $' + params.length;

  }
  sql += ' ORDER BY i.nome';

  const resultado = await pool.query(sql, params)
  let itens = resultado.rows

  if (apenasAbaixoDoMinimo === 'true') {
    itens = itens.filter((i) => i.quantidade <= i.quantidade_minima);
  }

  // [UC005.FS001] Item não encontrado -> lista vazia é uma resposta válida (200),
  // o front-end exibe a mensagem apropriada.
  res.json(itens);
} catch (erro) {
  res.status(500).json({erro: "Erro ao consultar estoque."})
}
});

router.get('/:id', async (req, res) => {
  const resultado = await pool.query ('SELECT i.*, c.nome AS categoria_nome FROM item i LEFT JOIN categoria c ON c.id = i.categoria_id WHERE i.id = $1', [req.params.id])
  const item = resultado.rows[0]
  if (!item) return res.status(404).json({ erro: 'Item não encontrado.' });
  res.json(item);
});

// UC002 — Cadastrar item
router.post('/', exigirGerente, async (req, res) => {
  try {
  const { nome, descricao, categoria_id, quantidade, quantidade_minima, unidade } = req.body;

  // [UC002.FS001] Dados inválidos ou incompletos
  if (!nome || !nome.trim()) {
    return res.status(400).json({ erro: 'O nome do item é obrigatório.' });
  }
  const qtdInicial = Number(quantidade ?? 0);
  if (Number.isNaN(qtdInicial) || qtdInicial < 0) {
    return res.status(400).json({ erro: 'Quantidade inicial inválida.' });
  }

  const info = await pool.query(
      `INSERT INTO item (nome, descricao, categoria_id, quantidade, quantidade_minima, unidade)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`, 
      [nome.trim(),
      descricao || null,
      categoria_id || null,
      qtdInicial,
      Number(quantidade_minima ?? 0),
      unidade || 'un']
    );
    res.status(201).json(info.rows[0])
  } catch (erro) {
    res.status(500).json({erro: "Erro ao cadastrar item."})
  }
});

// UC008 — Alterar informações do item
router.put('/:id', exigirGerente, async (req, res) => {
  try {
  const { id } = req.params;
  const resultado = await pool.query('SELECT * FROM item WHERE id = $1', [id]);
  const item = resultado.rows[0];
  if (!item) return res.status(404).json({ erro: 'Item não encontrado.' });

  const { nome, descricao, categoria_id, quantidade_minima, unidade } = req.body;

  // [UC008.FS001] Dados inválidos
  if (nome !== undefined && !nome.trim()) {
    return res.status(400).json({ erro: 'O nome do item não pode ficar vazio.' });
  }
  const queryUpdate = await pool.query(
    `UPDATE item SET nome = $1, descricao = $2, categoria_id = $3, quantidade_minima = $4, unidade = $5 WHERE id = $6 RETURNING *`
  )
const valores = [nome !== undefined ? nome.trim() : item.nome,
    descricao !== undefined ? descricao : item.descricao,
    categoria_id !== undefined ? categoria_id : item.categoria_id,
    quantidade_minima !== undefined ? Number(quantidade_minima) : item.quantidade_minima,
    unidade !== undefined ? unidade : item.unidade,
    id]
  ;
  const resultado2 = await pool.query(queryUpdate, valores)
  const itemAtualizado = resultado2.rows[0]
  return res.json(itemAtualizado)
} catch (erro) {
  res.status(500).json({erro: "Erro ao atualizar item."})
}
});

// UC009 — Excluir item (a confirmação [UC009.FS001] é responsabilidade do front-end;
// aqui é feita exclusão lógica para preservar o histórico de movimentações)
router.delete('/:id', exigirGerente, async (req, res) => {
  try {
  const { id } = req.params;
  const resultado = await pool.query('SELECT * FROM item WHERE id = $1', [id]);
  const item = resultado.rows[0]
  if (!item) return res.status(404).json({ erro: 'Item não encontrado.' });
  await pool.query('UPDATE item SET ativo = 0 WHERE id = $1', [id]);
  res.json({ mensagem: 'Item excluído com sucesso.' });
  } catch (erro) {
    res.status(500).json({erro: "Erro ao deletar item."})
  }
});

export default router;