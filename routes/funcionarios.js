// routes/funcionarios.js — RF01 / UC007 / UC008 (somente gerente)
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../db.js';
import { autenticar, exigirGerente } from '../middleware/auth.js';
import { inteiro } from '../utils.js';

const router = Router();
router.use(autenticar, exigirGerente);

const CAMPOS = 'id, nome, email, cargo, ativo, criado_em';

router.get('/', async (req, res) => {
  const resultado = await pool.query(`SELECT ${CAMPOS} FROM funcionario ORDER BY ativo DESC, nome`);
  res.json(resultado.rows);
});

// UC007 — Cadastrar funcionário
router.post('/', async (req, res) => {
  const { nome, senha, cargo } = req.body;
  const email = String(req.body.email || '').trim().toLowerCase();

  // [UC007.FS001] Dados inválidos ou incompletos
  if (!nome || !nome.trim() || !email || !senha) {
    return res.status(400).json({ erro: 'Nome, e-mail e senha são obrigatórios.' });
  }
  if (senha.length < 6) return res.status(400).json({ erro: 'A senha deve ter ao menos 6 caracteres.' });
  if (cargo && !['funcionario', 'gerente'].includes(cargo)) {
    return res.status(400).json({ erro: 'Cargo inválido.' });
  }

  const existe = await pool.query('SELECT id FROM funcionario WHERE lower(email) = $1', [email]);
  if (existe.rows.length > 0) {
    return res.status(400).json({ erro: 'Já existe um funcionário com este e-mail.' });
  }

  const criado = await pool.query(
    `INSERT INTO funcionario (nome, email, senha_hash, cargo) VALUES ($1, $2, $3, $4) RETURNING ${CAMPOS}`,
    [nome.trim(), email, bcrypt.hashSync(senha, 10), cargo || 'funcionario']
  );
  res.status(201).json(criado.rows[0]);
});

// UC008 — Alterar funcionário (inclui reativar e trocar a senha)
router.put('/:id', async (req, res) => {
  const id = inteiro(req.params.id);
  if (id === null) return res.status(404).json({ erro: 'Funcionário não encontrado.' });

  const atual = (await pool.query('SELECT * FROM funcionario WHERE id = $1', [id])).rows[0];
  if (!atual) return res.status(404).json({ erro: 'Funcionário não encontrado.' });

  const { nome, cargo, ativo, senha } = req.body;
  const email = req.body.email !== undefined ? String(req.body.email).trim().toLowerCase() : atual.email;

  // [UC008.FS001] Dados inválidos
  if (!email) return res.status(400).json({ erro: 'O e-mail não pode ficar vazio.' });
  if (nome !== undefined && !nome.trim()) return res.status(400).json({ erro: 'O nome não pode ficar vazio.' });
  if (cargo && !['funcionario', 'gerente'].includes(cargo)) return res.status(400).json({ erro: 'Cargo inválido.' });
  if (senha && senha.length < 6) return res.status(400).json({ erro: 'A senha deve ter ao menos 6 caracteres.' });

  // Evita o gerente se "trancar para fora" do sistema
  if (id === req.usuario.id && (cargo === 'funcionario' || ativo === false || ativo === 0)) {
    return res.status(400).json({ erro: 'Você não pode rebaixar nem desativar o seu próprio usuário.' });
  }

  const outro = await pool.query('SELECT id FROM funcionario WHERE lower(email) = $1 AND id != $2', [email, id]);
  if (outro.rows.length > 0) return res.status(400).json({ erro: 'Este e-mail já está em uso por outro funcionário.' });

  const atualizado = await pool.query(
    `UPDATE funcionario SET nome = $1, email = $2, cargo = $3, ativo = $4, senha_hash = $5
     WHERE id = $6 RETURNING ${CAMPOS}`,
    [
      nome !== undefined ? nome.trim() : atual.nome,
      email,
      cargo ?? atual.cargo,
      ativo === undefined ? atual.ativo : (ativo ? 1 : 0),
      senha ? bcrypt.hashSync(senha, 10) : atual.senha_hash,
      id,
    ]
  );
  res.json(atualizado.rows[0]);
});

// Excluir funcionário (RF01) — exclusão lógica: preserva o histórico de movimentações
router.delete('/:id', async (req, res) => {
  const id = inteiro(req.params.id);
  if (id === null) return res.status(404).json({ erro: 'Funcionário não encontrado.' });
  if (id === req.usuario.id) return res.status(400).json({ erro: 'Você não pode excluir o seu próprio usuário.' });

  const r = await pool.query('UPDATE funcionario SET ativo = 0 WHERE id = $1', [id]);
  if (r.rowCount === 0) return res.status(404).json({ erro: 'Funcionário não encontrado.' });
  res.json({ mensagem: 'Funcionário desativado com sucesso.' });
});

export default router;
