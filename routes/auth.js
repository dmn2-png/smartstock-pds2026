// routes/auth.js — UC001: Fazer login, dados do usuário e troca de senha
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../db.js';
import { gerarToken, autenticar } from '../middleware/auth.js';

const router = Router();

router.post('/login', async (req, res) => {
  const { email, senha } = req.body;
  if (!email || !senha) {
    return res.status(400).json({ erro: 'Informe usuário e senha.' });
  }

  // O 2º argumento do pool.query é SEMPRE uma lista: [valor1, valor2, ...]
  const resultado = await pool.query(
    'SELECT * FROM funcionario WHERE lower(email) = $1',
    [String(email).trim().toLowerCase()]
  );
  const funcionario = resultado.rows[0]; // rows[0] = primeira "ficha" (undefined se não achou)

  // [UC001.FS001] Login e/ou senha incorretos (mesma mensagem para os dois: não revela qual errou)
  if (!funcionario || !funcionario.ativo || !bcrypt.compareSync(senha, funcionario.senha_hash)) {
    return res.status(401).json({ erro: 'Usuário ou senha inválidos.' });
  }

  res.json({
    token: gerarToken(funcionario),
    usuario: { id: funcionario.id, nome: funcionario.nome, cargo: funcionario.cargo, email: funcionario.email },
  });
});

// Dados de quem está logado (o id vem do token, preenchido pelo middleware "autenticar")
router.get('/me', autenticar, async (req, res) => {
  const resultado = await pool.query(
    'SELECT id, nome, email, cargo, criado_em FROM funcionario WHERE id = $1',
    [req.usuario.id]
  );
  if (resultado.rows.length === 0) return res.status(404).json({ erro: 'Usuário não encontrado.' });
  res.json(resultado.rows[0]);
});

// Tela "Usuário": o próprio funcionário troca a sua senha
router.put('/senha', autenticar, async (req, res) => {
  const { senha_atual, senha_nova } = req.body;
  if (!senha_atual || !senha_nova) {
    return res.status(400).json({ erro: 'Informe a senha atual e a nova senha.' });
  }
  if (senha_nova.length < 6) {
    return res.status(400).json({ erro: 'A nova senha deve ter ao menos 6 caracteres.' });
  }

  const resultado = await pool.query('SELECT senha_hash FROM funcionario WHERE id = $1', [req.usuario.id]);
  const funcionario = resultado.rows[0];
  if (!funcionario || !bcrypt.compareSync(senha_atual, funcionario.senha_hash)) {
    return res.status(400).json({ erro: 'A senha atual está incorreta.' });
  }

  await pool.query('UPDATE funcionario SET senha_hash = $1 WHERE id = $2', [
    bcrypt.hashSync(senha_nova, 10),
    req.usuario.id,
  ]);
  res.json({ mensagem: 'Senha alterada com sucesso.' });
});

export default router;
