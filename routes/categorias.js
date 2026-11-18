// routes/categorias.js — RF03: cadastrar e organizar categorias
import { Router } from 'express';
import { pool } from '../db.js';
import { autenticar, exigirGerente } from '../middleware/auth.js';
import { inteiro } from '../utils.js';

const router = Router();
router.use(autenticar);

router.get('/', async (req, res) => {
  const resultado = await pool.query('SELECT * FROM categoria ORDER BY nome');
  res.json(resultado.rows);
});

router.post('/', exigirGerente, async (req, res) => {
  const nome = String(req.body.nome || '').trim();
  const { descricao } = req.body;
  if (!nome) return res.status(400).json({ erro: 'O nome da categoria é obrigatório.' });

  const existe = await pool.query('SELECT id FROM categoria WHERE lower(nome) = lower($1)', [nome]);
  if (existe.rows.length > 0) return res.status(400).json({ erro: 'Já existe uma categoria com este nome.' });

  // RETURNING * devolve a linha criada no próprio INSERT (no Postgres não existe "lastInsertRowid")
  const criada = await pool.query(
    'INSERT INTO categoria (nome, descricao) VALUES ($1, $2) RETURNING *',
    [nome, descricao || null]
  );
  res.status(201).json(criada.rows[0]);
});

router.put('/:id', exigirGerente, async (req, res) => {
  const id = inteiro(req.params.id);
  const nome = String(req.body.nome || '').trim();
  const { descricao } = req.body;
  if (id === null) return res.status(404).json({ erro: 'Categoria não encontrada.' });
  if (!nome) return res.status(400).json({ erro: 'O nome da categoria é obrigatório.' });

  const outra = await pool.query('SELECT id FROM categoria WHERE lower(nome) = lower($1) AND id != $2', [nome, id]);
  if (outra.rows.length > 0) return res.status(400).json({ erro: 'Já existe uma categoria com este nome.' });

  const atualizada = await pool.query(
    'UPDATE categoria SET nome = $1, descricao = $2 WHERE id = $3 RETURNING *',
    [nome, descricao || null, id]
  );
  if (atualizada.rows.length === 0) return res.status(404).json({ erro: 'Categoria não encontrada.' });
  res.json(atualizada.rows[0]);
});

router.delete('/:id', exigirGerente, async (req, res) => {
  const id = inteiro(req.params.id);
  if (id === null) return res.status(404).json({ erro: 'Categoria não encontrada.' });

  const r = await pool.query('DELETE FROM categoria WHERE id = $1', [id]); // itens ficam sem categoria (ON DELETE SET NULL)
  if (r.rowCount === 0) return res.status(404).json({ erro: 'Categoria não encontrada.' });
  res.json({ mensagem: 'Categoria excluída com sucesso.' });
});

export default router;
