// middleware/auth.js — verificação do token JWT (RNF04) e do cargo
import 'dotenv/config';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET não encontrada. Defina no .env (e nas variáveis da Vercel).');
}

export function gerarToken(funcionario) {
  return jwt.sign(
    { id: funcionario.id, nome: funcionario.nome, cargo: funcionario.cargo },
    JWT_SECRET,
    { expiresIn: '8h' }
  );
}

// Roda ANTES das rotas protegidas: confere se o token enviado é válido.
export function autenticar(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ erro: 'Token não fornecido. Faça login novamente.' });
  }
  try {
    req.usuario = jwt.verify(header.split(' ')[1], JWT_SECRET); // { id, nome, cargo }
    next();
  } catch {
    return res.status(401).json({ erro: 'Token inválido ou expirado. Faça login novamente.' });
  }
}

// Rotas exclusivas do gerente (parte "exclusiva administrador" do menu)
export function exigirGerente(req, res, next) {
  if (req.usuario?.cargo !== 'gerente') {
    return res.status(403).json({ erro: 'Acesso restrito a gerentes.' });
  }
  next();
}
