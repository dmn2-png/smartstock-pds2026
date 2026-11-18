// routes/resumo.js — números dos 3 cards da tela Início
import { Router } from 'express';
import { pool } from '../db.js';
import { autenticar } from '../middleware/auth.js';
import { FUSO } from '../utils.js';

const router = Router();
router.use(autenticar);

router.get('/', async (req, res) => {
  // COUNT(*) volta como texto no Postgres; "::int" converte para número
  const [hoje, emFalta, total, unidades] = await Promise.all([
    pool.query(
      `SELECT COUNT(*)::int AS n FROM movimentacao
       WHERE (data_hora AT TIME ZONE $1)::date = (now() AT TIME ZONE $1)::date`,
      [FUSO]
    ),
    pool.query('SELECT COUNT(*)::int AS n FROM item WHERE ativo = 1 AND quantidade <= quantidade_minima'),
    pool.query('SELECT COUNT(*)::int AS n FROM item WHERE ativo = 1'),
    pool.query('SELECT COALESCE(SUM(quantidade), 0)::int AS n FROM item WHERE ativo = 1'),
  ]);

  res.json({
    movimentacoes_hoje: hoje.rows[0].n,
    itens_em_falta: emFalta.rows[0].n,
    itens_total: total.rows[0].n,
    unidades_total: unidades.rows[0].n,
  });
});

export default router;
