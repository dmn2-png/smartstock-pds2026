// routes/categorias.js — RF03: Cadastrar e organizar categorias
import { Router } from 'express';
import { pool } from '../db.js';
import { autenticar, exigirGerente } from '../middleware/auth.js';

const router = Router();
router.use(autenticar);

router.get('/', async (req, res) => {
  try {
  const resultado = await pool.query('SELECT * FROM categoria ORDER BY nome');
  res.json(resultado.rows)
  } catch (erro) {
  res.status(500).json({erro: "Erro ao procurar categorias."})
  }
});

router.post('/', exigirGerente, async (req, res) => {
  try {
  const { nome, descricao } = req.body;
  
  if (!nome || !nome.trim()) {
    return res.status(400).json({ erro: 'O nome da categoria é obrigatório.' });
  }
  
  const resultado = await pool.query('SELECT id FROM categoria WHERE nome = $1', [nome.trim()]);
  const existe = resultado.rows[0];
  if (existe) return res.status(400).json({ erro: 'Já existe uma categoria com este nome.' });
  const novoRegistro = await pool.query(
    `INSERT INTO categoria (nome, descricao) VALUES ($1, $2) RETURNING *`, [nome.trim(), descricao || null]
  )
  res.status(201).json(novoRegistro.rows[0])
} catch (erro) {
  res.status(500).json({erro: `Erro ao criar categoria.`})
  }});

router.put('/:id', exigirGerente, async (req, res) => {
  const { id } = req.params;
  const { nome, descricao } = req.body;
  const categoria = await pool.query('SELECT * FROM categoria WHERE id = $1', [id]);
  if (categoria.rows.length === 0) return res.status(404).json({ erro: 'Categoria não encontrada.' });
  if (!nome || !nome.trim()) return res.status(400).json({ erro: 'O nome da categoria é obrigatório.' });

  const atualizado = await pool.query('UPDATE categoria SET nome = $1, descricao = $2 WHERE id = $3 RETURNING *', 
    [nome.trim(), descricao || null, id]);
  res.json(atualizado.rows[0]);
});

router.delete('/:id', exigirGerente, async (req, res) => {
  const { id } = req.params;
  const categoria = await pool.query('SELECT * FROM categoria WHERE id = $1', [id]);
  if (categoria.rows.length === 0) return res.status(404).json({ erro: 'Categoria não encontrada.' });

  await pool.query('UPDATE item SET categoria_id = NULL WHERE categoria_id = $1', [id]);
  await pool.query('DELETE FROM categoria WHERE id = $1', [id]);
  res.json({ mensagem: 'Categoria excluída com sucesso.' });
});

export default router;
