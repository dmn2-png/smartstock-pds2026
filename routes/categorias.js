// routes/categorias.js — RF03: Cadastrar e organizar categorias
import { Router } from 'express';
import { db } from '../db.js';
import { autenticar, exigirGerente } from '../middleware/auth.js';

const router = Router();
router.use(autenticar);

router.get('/', (req, res) => {
  const lista = db.prepare('SELECT * FROM categoria ORDER BY nome').all();
  res.json(lista);
});

router.post('/', exigirGerente, (req, res) => {
  const { nome, descricao } = req.body;
  if (!nome || !nome.trim()) {
    return res.status(400).json({ erro: 'O nome da categoria é obrigatório.' });
  }
  const existe = db.prepare('SELECT id FROM categoria WHERE nome = ?').get(nome);
  if (existe) return res.status(400).json({ erro: 'Já existe uma categoria com este nome.' });

  const info = db.prepare('INSERT INTO categoria (nome, descricao) VALUES (?, ?)').run(nome.trim(), descricao || null);
  res.status(201).json(db.prepare('SELECT * FROM categoria WHERE id = ?').get(info.lastInsertRowid));
});

router.put('/:id', exigirGerente, (req, res) => {
  const { id } = req.params;
  const { nome, descricao } = req.body;
  const categoria = db.prepare('SELECT * FROM categoria WHERE id = ?').get(id);
  if (!categoria) return res.status(404).json({ erro: 'Categoria não encontrada.' });
  if (!nome || !nome.trim()) return res.status(400).json({ erro: 'O nome da categoria é obrigatório.' });

  db.prepare('UPDATE categoria SET nome = ?, descricao = ? WHERE id = ?').run(nome.trim(), descricao || null, id);
  res.json(db.prepare('SELECT * FROM categoria WHERE id = ?').get(id));
});

router.delete('/:id', exigirGerente, (req, res) => {
  const { id } = req.params;
  const categoria = db.prepare('SELECT * FROM categoria WHERE id = ?').get(id);
  if (!categoria) return res.status(404).json({ erro: 'Categoria não encontrada.' });

  db.prepare('UPDATE item SET categoria_id = NULL WHERE categoria_id = ?').run(id);
  db.prepare('DELETE FROM categoria WHERE id = ?').run(id);
  res.json({ mensagem: 'Categoria excluída com sucesso.' });
});

export default router;
