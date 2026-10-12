// routes/funcionarios.js — RF01: Cadastrar, alterar e excluir funcionários
// UC007 (Cadastrar funcionário), UC008 (Alterar informações) — restrito a Gerente
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../db.js';
import { autenticar, exigirGerente } from '../middleware/auth.js';

const router = Router();
router.use(autenticar, exigirGerente);

// Listar funcionários
router.get('/', async (req, res) => {
  try {
  const resultado = await pool.query('SELECT id, nome, email, cargo, ativo, criado_em FROM funcionario ORDER BY nome');
  const lista = resultado.rows
  res.json(lista);
} catch (erro) {
  res.status(500).json({ erro: "Erro ao listar funcionários." })
}
});

// UC007 — Cadastrar funcionário
router.post('/', async (req, res) => {
  try {
  const { nome, email, senha, cargo } = req.body;

  // [UC007.FS001] Dados inválidos ou incompletos
  if (!nome || !email || !senha) {
    return res.status(400).json({ erro: 'Nome, e-mail e senha são obrigatórios.' });
  }
  if (senha.length < 6) {
    return res.status(400).json({ erro: 'A senha deve ter ao menos 6 caracteres.' });
  }
  if (cargo && !['funcionario', 'gerente'].includes(cargo)) {
    return res.status(400).json({ erro: 'Cargo inválido.' });
  }

  const existe = await pool.query('SELECT id FROM funcionario WHERE email = $1', [email]);
  if (existe.rows.length > 0) {
    return res.status(400).json({ erro: 'Já existe um funcionário com este e-mail.' });
  }

  const hash = bcrypt.hashSync(senha, 10);
  const novo = await pool.query('INSERT INTO funcionario (nome, email, senha_hash, cargo) VALUES ($1, $2, $3, $4) RETURNING id, nome, email, cargo, ativo', [nome, email, hash, cargo || 'funcionario']);
  res.status(201).json(novo.rows[0]); 
      } catch (erro) {
        res.status(500).json({erro: "Erro ao cadastrar funcionário."})
  }
});

// UC008 — Alterar informações do funcionário
router.put('/:id', async (req, res) => {
  try {
  const { id } = req.params;
  const { nome, email, cargo, ativo, senha } = req.body;

  const resultado = await pool.query('SELECT * FROM funcionario WHERE id = $1', [id]);
  const funcionario = resultado.rows[0];
  if (!funcionario) return res.status(404).json({ erro: 'Funcionário não encontrado.' });

  // [UC008.FS001] Dados inválidos
  if (email) {
    const outro = await pool.query('SELECT id FROM funcionario WHERE email = $1 AND id != $2', [email, id]);
    if (outro.rows.length > 0) return res.status(400).json({ erro: 'Este e-mail já está em uso por outro funcionário.' });
  }
  if (cargo && !['funcionario', 'gerente'].includes(cargo)) {
    return res.status(400).json({ erro: 'Cargo inválido.' });
  }

  const novoHash = senha ? bcrypt.hashSync(senha, 10) : funcionario.senha_hash;
  const atualizado = await pool.query(
    'UPDATE funcionario SET nome = $1, email = $2, cargo = $3, ativo = $4, senha_hash = $5 WHERE id = $6 RETURNING id, nome, email, cargo, ativo',
    [nome ?? funcionario.nome,
    email ?? funcionario.email,
    cargo ?? funcionario.cargo,
    ativo === undefined ? funcionario.ativo : (ativo ? 1 : 0),
    novoHash,
    id 
  ]
);
   res.json(atualizado.rows[0])
   } catch (erro) {
      res.status(500).json({erro: "Erro ao atualizar informações do usuário."})
  }
    
});

// Excluir funcionário (RF01) — exclusão lógica para preservar o histórico de movimentações
router.delete('/:id', async (req, res) => {
  try {
  const { id } = req.params;
  const resultado = await pool.query('SELECT * FROM funcionario WHERE id = $1', [id]);
  const funcionario = resultado.rows[0]
  if (!funcionario) return res.status(404).json({ erro: 'Funcionário não encontrado.' });

  if (Number(id) === req.usuario.id) {
    return res.status(400).json({ erro: 'Você não pode excluir seu próprio usuário.' });
  }

  await pool.query('UPDATE funcionario SET ativo = 0 WHERE id = $1', [id]);
  res.json({ mensagem: 'Funcionário desativado com sucesso.' });
} catch (erro) {
  res.status(500).json({erro: "Erro ao desativar funcionario"}) }
});

export default router;
