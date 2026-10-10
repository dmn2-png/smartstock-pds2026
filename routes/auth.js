// routes/auth.js — UC001: Fazer login
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db.js';
import { gerarToken, autenticar } from '../middleware/auth.js';

const router = Router();

router.post('/login', (req, res) => {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({ erro: 'Informe e-mail e senha.' });
  }

  const funcionario = db.prepare('SELECT * FROM funcionario WHERE email = ?').get(email);

  // [UC001.FS001] Login e/ou senha incorretos
  if (!funcionario || !funcionario.ativo) {
    return res.status(401).json({ erro: 'Usuário ou senha inválidos.' });
  }
  const senhaOk = bcrypt.compareSync(senha, funcionario.senha_hash);
  if (!senhaOk) {
    return res.status(401).json({ erro: 'Usuário ou senha inválidos.' });
  }

  const token = gerarToken(funcionario);
  res.json({
    token,
    usuario: { id: funcionario.id, nome: funcionario.nome, cargo: funcionario.cargo, email: funcionario.email },
  });
});

// Retorna dados do usuário autenticado (útil para o front-end restaurar a sessão)
router.get('/me', autenticar, (req, res) => {
  const funcionario = db.prepare('SELECT id, nome, email, cargo FROM funcionario WHERE id = ?').get(req.usuario.id);
  if (!funcionario) return res.status(404).json({ erro: 'Usuário não encontrado.' });
  res.json(funcionario);
});

export default router;
