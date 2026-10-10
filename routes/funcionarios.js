// routes/funcionarios.js — RF01: Cadastrar, alterar e excluir funcionários
// UC007 (Cadastrar funcionário), UC008 (Alterar informações) — restrito a Gerente
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db.js';
import { autenticar, exigirGerente } from '../middleware/auth.js';

const router = Router();
router.use(autenticar, exigirGerente);

// Listar funcionários
router.get('/', (req, res) => {
  const lista = db.prepare('SELECT id, nome, email, cargo, ativo, criado_em FROM funcionario ORDER BY nome').all();
  res.json(lista);
});

// UC007 — Cadastrar funcionário
router.post('/', (req, res) => {
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

  const existe = db.prepare('SELECT id FROM funcionario WHERE email = ?').get(email);
  if (existe) {
    return res.status(400).json({ erro: 'Já existe um funcionário com este e-mail.' });
  }

  const hash = bcrypt.hashSync(senha, 10);
  const info = db
    .prepare('INSERT INTO funcionario (nome, email, senha_hash, cargo) VALUES (?, ?, ?, ?)')
    .run(nome, email, hash, cargo || 'funcionario');

  const criado = db.prepare('SELECT id, nome, email, cargo, ativo FROM funcionario WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(criado);
});

// UC008 — Alterar informações do funcionário
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { nome, email, cargo, ativo, senha } = req.body;

  const funcionario = db.prepare('SELECT * FROM funcionario WHERE id = ?').get(id);
  if (!funcionario) return res.status(404).json({ erro: 'Funcionário não encontrado.' });

  // [UC008.FS001] Dados inválidos
  if (email) {
    const outro = db.prepare('SELECT id FROM funcionario WHERE email = ? AND id != ?').get(email, id);
    if (outro) return res.status(400).json({ erro: 'Este e-mail já está em uso por outro funcionário.' });
  }
  if (cargo && !['funcionario', 'gerente'].includes(cargo)) {
    return res.status(400).json({ erro: 'Cargo inválido.' });
  }

  const novoHash = senha ? bcrypt.hashSync(senha, 10) : funcionario.senha_hash;

  db.prepare(
    'UPDATE funcionario SET nome = ?, email = ?, cargo = ?, ativo = ?, senha_hash = ? WHERE id = ?'
  ).run(
    nome ?? funcionario.nome,
    email ?? funcionario.email,
    cargo ?? funcionario.cargo,
    ativo === undefined ? funcionario.ativo : (ativo ? 1 : 0),
    novoHash,
    id
  );

  const atualizado = db.prepare('SELECT id, nome, email, cargo, ativo FROM funcionario WHERE id = ?').get(id);
  res.json(atualizado);
});

// Excluir funcionário (RF01) — exclusão lógica para preservar o histórico de movimentações
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const funcionario = db.prepare('SELECT * FROM funcionario WHERE id = ?').get(id);
  if (!funcionario) return res.status(404).json({ erro: 'Funcionário não encontrado.' });

  if (Number(id) === req.usuario.id) {
    return res.status(400).json({ erro: 'Você não pode excluir seu próprio usuário.' });
  }

  db.prepare('UPDATE funcionario SET ativo = 0 WHERE id = ?').run(id);
  res.json({ mensagem: 'Funcionário desativado com sucesso.' });
});

export default router;
