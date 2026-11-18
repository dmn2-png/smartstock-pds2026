// routes/checklists.js — NOVO: checklist pessoal de cada funcionário
// Regra de ouro: TODA consulta filtra por "funcionario_id = quem está logado".
// Assim ninguém vê, altera ou apaga o checklist de outra pessoa (nem o gerente).
import { Router } from 'express';
import { pool } from '../db.js';
import { autenticar } from '../middleware/auth.js';
import { dataValida, inteiro } from '../utils.js';

const router = Router();
router.use(autenticar);

const CAMPOS = 'id, titulo, prazo, concluido, concluido_em, criado_em';

// Lista só os itens de quem está logado: pendentes primeiro, por prazo (sem prazo por último)
router.get('/', async (req, res) => {
  const resultado = await pool.query(
    `SELECT ${CAMPOS} FROM checklist_item
     WHERE funcionario_id = $1
     ORDER BY concluido ASC, prazo ASC NULLS LAST, id ASC`,
    [req.usuario.id]
  );
  res.json(resultado.rows);
});

// Novo item do checklist
router.post('/', async (req, res) => {
  const titulo = String(req.body.titulo || '').trim();
  const prazo = req.body.prazo || null;

  if (!titulo) return res.status(400).json({ erro: 'Informe o texto do item.' });
  if (titulo.length > 200) return res.status(400).json({ erro: 'O texto do item é muito longo (máximo 200 caracteres).' });
  if (prazo !== null && !dataValida(prazo)) return res.status(400).json({ erro: 'Prazo inválido.' });

  const criado = await pool.query(
    `INSERT INTO checklist_item (funcionario_id, titulo, prazo) VALUES ($1, $2, $3) RETURNING ${CAMPOS}`,
    [req.usuario.id, titulo, prazo]
  );
  res.status(201).json(criado.rows[0]);
});

// Alterar: texto, prazo e/ou marcar como concluído (só envie o que mudou)
router.put('/:id', async (req, res) => {
  const id = inteiro(req.params.id);
  if (id === null) return res.status(404).json({ erro: 'Item não encontrado.' });

  // "AND funcionario_id = ..." garante que o item é MESMO do usuário logado
  const atual = (
    await pool.query('SELECT * FROM checklist_item WHERE id = $1 AND funcionario_id = $2', [id, req.usuario.id])
  ).rows[0];
  if (!atual) return res.status(404).json({ erro: 'Item não encontrado.' });

  const { titulo, prazo, concluido } = req.body;
  if (titulo !== undefined && !String(titulo).trim()) return res.status(400).json({ erro: 'Informe o texto do item.' });
  if (titulo !== undefined && String(titulo).trim().length > 200) return res.status(400).json({ erro: 'O texto do item é muito longo.' });
  if (prazo && !dataValida(prazo)) return res.status(400).json({ erro: 'Prazo inválido.' });

  const novoTitulo = titulo !== undefined ? String(titulo).trim() : atual.titulo;
  const novoPrazo = prazo !== undefined ? (prazo || null) : atual.prazo;
  const novoConcluido = concluido !== undefined ? Boolean(concluido) : atual.concluido;

  const atualizado = await pool.query(
    `UPDATE checklist_item
     SET titulo = $1, prazo = $2::date, concluido = $3::boolean,
         concluido_em = CASE WHEN $3::boolean THEN COALESCE(concluido_em, now()) ELSE NULL END
     WHERE id = $4 AND funcionario_id = $5
     RETURNING ${CAMPOS}`,
    [novoTitulo, novoPrazo, novoConcluido, id, req.usuario.id]
  );
  res.json(atualizado.rows[0]);
});

router.delete('/:id', async (req, res) => {
  const id = inteiro(req.params.id);
  if (id === null) return res.status(404).json({ erro: 'Item não encontrado.' });

  const r = await pool.query('DELETE FROM checklist_item WHERE id = $1 AND funcionario_id = $2', [id, req.usuario.id]);
  if (r.rowCount === 0) return res.status(404).json({ erro: 'Item não encontrado.' });
  res.json({ mensagem: 'Item removido do checklist.' });
});

export default router;
