// seed.js — Cria o primeiro usuário gerente e algumas categorias básicas
// Rode com: npm run seed
import bcrypt from 'bcryptjs';
import { pool } from './db.js';
async function seed() {
  try {
const email = 'gerente@smartstock.com';
const senha = 'admin123';

const resultado = await pool.query('SELECT id FROM funcionario WHERE email = $1', [email]);
const existente = resultado.rows[0]

if (!existente) {
  const hash = bcrypt.hashSync(senha, 10);
  await pool.query(
    'INSERT INTO funcionario (nome, email, senha_hash, cargo) VALUES ($1, $2, $3, $4)', ['Administrador', email, hash, 'gerente']);
  console.log('✔ Usuário gerente criado:');
  console.log(`  E-mail: ${email}`);
  console.log(`  Senha:  ${senha}`);
} else {
  console.log('Usuário gerente já existe, nada a fazer.');
}

const categorias = ['Material de Escritório', 'Limpeza', 'Ferramentas', 'Informática', 'Uniformes'];

for (const c of categorias) {
  await pool.query('INSERT INTO categoria (nome) VALUES ($1) ON CONFLICT (nome) DO NOTHING', [c])
}
  console.log('✔ Categorias padrão garantidas.');
} catch (erro) {
  console.error('Erro no seed:', erro);
} finally {
  await pool.end()
}
}

seed();