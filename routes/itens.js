// routes/itens.js — RF02 (cadastrar/alterar/excluir itens), RF07 (consultar estoque)
// UC002 (Cadastrar item), UC005 (Consultar estoque), UC008 (Alterar), UC009 (Excluir)
import { Router } from 'express';
import { db } from '../db.js';
import { autenticar, exigirGerente } from '../middleware/auth.js';

const router = Router();
router.use(autenticar);

// UC005 — Consultar estoque (com busca opcional por nome/categoria) [UC005.FS001]
router.get('/', (req, res) => {
  const { busca, categoria_id, apenasAbaixoDoMinimo } = req.query;

  let sql = `
    SELECT i.*, c.nome AS categoria_nome
    FROM item i
    LEFT JOIN categoria c ON c.id = i.categoria_id
    WHERE i.ativo = 1
  `;
  const params = [];

  if (busca) {
    sql += ' AND (i.nome LIKE ? OR c.nome LIKE ?)';
    params.push(`%${busca}%`, `%${busca}%`);
  }
  if (categoria_id) {
    sql += ' AND i.categoria_id = ?';
    params.push(categoria_id);
  }
  sql += ' ORDER BY i.nome';

  let itens = db.prepare(sql).all(...params);

  if (apenasAbaixoDoMinimo === 'true') {
    itens = itens.filter((i) => i.quantidade <= i.quantidade_minima);
  }

  // [UC005.FS001] Item não encontrado -> lista vazia é uma resposta válida (200),
  // o front-end exibe a mensagem apropriada.
  res.json(itens);
});

router.get('/:id', (req, res) => {
  const item = db
    .prepare('SELECT i.*, c.nome AS categoria_nome FROM item i LEFT JOIN categoria c ON c.id = i.categoria_id WHERE i.id = ?')
    .get(req.params.id);
  if (!item) return res.status(404).json({ erro: 'Item não encontrado.' });
  res.json(item);
});

// UC002 — Cadastrar item
router.post('/', exigirGerente, (req, res) => {
  const { nome, descricao, categoria_id, quantidade, quantidade_minima, unidade } = req.body;

  // [UC002.FS001] Dados inválidos ou incompletos
  if (!nome || !nome.trim()) {
    return res.status(400).json({ erro: 'O nome do item é obrigatório.' });
  }
  const qtdInicial = Number(quantidade ?? 0);
  if (Number.isNaN(qtdInicial) || qtdInicial < 0) {
    return res.status(400).json({ erro: 'Quantidade inicial inválida.' });
  }

  const info = db
    .prepare(
      `INSERT INTO item (nome, descricao, categoria_id, quantidade, quantidade_minima, unidade)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      nome.trim(),
      descricao || null,
      categoria_id || null,
      qtdInicial,
      Number(quantidade_minima ?? 0),
      unidade || 'un'
    );

  res.status(201).json(db.prepare('SELECT * FROM item WHERE id = ?').get(info.lastInsertRowid));
});

// UC008 — Alterar informações do item
router.put('/:id', exigirGerente, (req, res) => {
  const { id } = req.params;
  const item = db.prepare('SELECT * FROM item WHERE id = ?').get(id);
  if (!item) return res.status(404).json({ erro: 'Item não encontrado.' });

  const { nome, descricao, categoria_id, quantidade_minima, unidade } = req.body;

  // [UC008.FS001] Dados inválidos
  if (nome !== undefined && !nome.trim()) {
    return res.status(400).json({ erro: 'O nome do item não pode ficar vazio.' });
  }

  db.prepare(
    `UPDATE item SET nome = ?, descricao = ?, categoria_id = ?, quantidade_minima = ?, unidade = ? WHERE id = ?`
  ).run(
    nome !== undefined ? nome.trim() : item.nome,
    descricao !== undefined ? descricao : item.descricao,
    categoria_id !== undefined ? categoria_id : item.categoria_id,
    quantidade_minima !== undefined ? Number(quantidade_minima) : item.quantidade_minima,
    unidade !== undefined ? unidade : item.unidade,
    id
  );

  res.json(db.prepare('SELECT * FROM item WHERE id = ?').get(id));
});

// UC009 — Excluir item (a confirmação [UC009.FS001] é responsabilidade do front-end;
// aqui é feita exclusão lógica para preservar o histórico de movimentações)
router.delete('/:id', exigirGerente, (req, res) => {
  const { id } = req.params;
  const item = db.prepare('SELECT * FROM item WHERE id = ?').get(id);
  if (!item) return res.status(404).json({ erro: 'Item não encontrado.' });

  db.prepare('UPDATE item SET ativo = 0 WHERE id = ?').run(id);
  res.json({ mensagem: 'Item excluído com sucesso.' });
});

export default router;
