// middleware/auth.js — Verificação de integridade/autenticidade via JWT (RNF04)
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'smartstock_dev_secret_troque_em_producao';
const JWT_EXPIRES_IN = '8h';

export function gerarToken(funcionario) {
  return jwt.sign(
    { id: funcionario.id, nome: funcionario.nome, cargo: funcionario.cargo },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

// UC001 (fluxo principal, passo 4): "O sistema verifica as informações"
// Aqui, valida o token JWT enviado no header Authorization.
export function autenticar(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ erro: 'Token não fornecido. Faça login novamente.' });
  }
  const token = header.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.usuario = payload; // { id, nome, cargo }
    next();
  } catch (err) {
    return res.status(401).json({ erro: 'Token inválido ou expirado. Faça login novamente.' });
  }
}

// Restringe rotas ao papel de Gerente (ex.: RF01 cadastrar/alterar/excluir funcionários)
export function exigirGerente(req, res, next) {
  if (req.usuario?.cargo !== 'gerente') {
    return res.status(403).json({ erro: 'Acesso restrito a gerentes.' });
  }
  next();
}
