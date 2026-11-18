// routes/itens.js — RF02 (itens) e RF07 (consultar estoque) / UC002, UC005, UC008, UC009
import { Router } from 'express';
import { pool } from '../db.js';
import { autenticar, exigirGerente } from '../middleware/auth.js';
import { inteiro } from '../utils.js';

const router = Router();
router.use(autenticar);

// O valor de "ordem" vem do navegador. Por segurança NUNCA vai direto para o SQL:
// só escolhemos entre estas opções prontas.
const ORDENS = {
  az: 'i.nome ASC',
  za: 'i.nome DESC',
  mais: 'i.quantidade DESC, i.nome ASC',
  menos: 'i.quantidade ASC, i.nome ASC',
};

// UC005 — Consultar estoque (busca, categoria e ordem) [UC005.FS001: lista vazia é resposta válida]
router.get('/', async (req, res) => {
  const { busca, categoria_id, ordem, abaixo_minimo } = req.query;
  const params = [];

  let sql = `
    SELECT i.*, c.nome AS categoria_nome
    FROM item i
    LEFT JOIN categoria c ON c.id = i.categoria_id
    WHERE i.ativo = 1`;

  if (busca && busca.trim()) {
    params.push(`%${busca.trim()}%`);
    // o mesmo $n pode aparecer duas vezes; ILIKE ignora maiúscula/minúscula
    sql += ` AND (i.nome ILIKE $${params.length} OR c.nome ILIKE $${params.length})`;
  }
  if (categoria_id) {
    const cid = inteiro(categoria_id);
    if (cid === null) return res.status(400).json({ erro: 'Categoria inválida.' });
    params.push(cid);
    sql += ` AND i.categoria_id = $${params.length}`;
  }
  if (abaixo_minimo === 'true') sql += ' AND i.quantidade <= i.quantidade_minima';

  sql += ` ORDER BY ${ORDENS[ordem] || ORDENS.az}`;

  const resultado = await pool.query(sql, params);
  res.json(resultado.rows);
});

router.get('/:id', async (req, res) => {
  const id = inteiro(req.params.id);
  if (id === null) return res.status(404).json({ erro: 'Item não encontrado.' });
  const resultado = await pool.query(
    'SELECT i.*, c.nome AS categoria_nome FROM item i LEFT JOIN categoria c ON c.id = i.categoria_id WHERE i.id = $1',
    [id]
  );
  if (resultado.rows.length === 0) return res.status(404).json({ erro: 'Item não encontrado.' });
  res.json(resultado.rows[0]);
});

async function categoriaExiste(id) {
  if (id === null || id === undefined || id === '') return true; // sem categoria é permitido
  const r = await pool.query('SELECT 1 FROM categoria WHERE id = $1', [id]);
  return r.rows.length > 0;
}

// UC002 — Cadastrar item (tela "Cadastro de itens")
router.post('/', exigirGerente, async (req, res) => {
  const { nome, descricao, categoria_id, unidade } = req.body;
  const quantidade = inteiro(req.body.quantidade ?? 0);
  const minima = inteiro(req.body.quantidade_minima ?? 0);

  // [UC002.FS001] Dados inválidos ou incompletos
  if (!nome || !nome.trim()) return res.status(400).json({ erro: 'O nome do item é obrigatório.' });
  if (quantidade === null || quantidade < 0) return res.status(400).json({ erro: 'Quantidade inicial inválida.' });
  if (minima === null || minima < 0) return res.status(400).json({ erro: 'Quantidade mínima inválida.' });
  if (!(await categoriaExiste(categoria_id))) return res.status(400).json({ erro: 'Categoria não encontrada.' });

  const criado = await pool.query(
    `INSERT INTO item (nome, descricao, categoria_id, quantidade, quantidade_minima, unidade)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [nome.trim(), descricao || null, categoria_id || null, quantidade, minima, (unidade || 'un').trim() || 'un']
  );
  res.status(201).json(criado.rows[0]);
});

// UC008 — Alterar item (a quantidade só muda por entrada/saída)
router.put('/:id', exigirGerente, async (req, res) => {
  const id = inteiro(req.params.id);
  if (id === null) return res.status(404).json({ erro: 'Item não encontrado.' });

  const atual = (await pool.query('SELECT * FROM item WHERE id = $1 AND ativo = 1', [id])).rows[0];
  if (!atual) return res.status(404).json({ erro: 'Item não encontrado.' });

  const { nome, descricao, categoria_id, unidade } = req.body;
  const minima = req.body.quantidade_minima === undefined ? atual.quantidade_minima : inteiro(req.body.quantidade_minima);

  // [UC008.FS001] Dados inválidos
  if (nome !== undefined && !nome.trim()) return res.status(400).json({ erro: 'O nome do item não pode ficar vazio.' });
  if (minima === null || minima < 0) return res.status(400).json({ erro: 'Quantidade mínima inválida.' });
  if (!(await categoriaExiste(categoria_id))) return res.status(400).json({ erro: 'Categoria não encontrada.' });

  const atualizado = await pool.query(
    `UPDATE item SET nome = $1, descricao = $2, categoria_id = $3, quantidade_minima = $4, unidade = $5
     WHERE id = $6 RETURNING *`,
    [
      nome !== undefined ? nome.trim() : atual.nome,
      descricao !== undefined ? (descricao || null) : atual.descricao,
      categoria_id !== undefined ? (categoria_id || null) : atual.categoria_id,
      minima,
      unidade !== undefined ? (unidade.trim() || 'un') : atual.unidade,
      id,
    ]
  );
  res.json(atualizado.rows[0]);
});

// UC009 — Excluir item (a confirmação é feita na tela). Exclusão lógica: o histórico continua intacto.
router.delete('/:id', exigirGerente, async (req, res) => {
  const id = inteiro(req.params.id);
  if (id === null) return res.status(404).json({ erro: 'Item não encontrado.' });
  const r = await pool.query('UPDATE item SET ativo = 0 WHERE id = $1 AND ativo = 1', [id]);
  if (r.rowCount === 0) return res.status(404).json({ erro: 'Item não encontrado.' });
  res.json({ mensagem: 'Item excluído com sucesso.' });
});

export default router;
