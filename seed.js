// seed.js — Cria o primeiro usuário gerente e algumas categorias básicas
// Rode com: npm run seed
import bcrypt from 'bcryptjs';
import { db } from './db.js';

const email = 'gerente@smartstock.com';
const senha = 'admin123';

const existente = db.prepare('SELECT id FROM funcionario WHERE email = ?').get(email);

if (!existente) {
  const hash = bcrypt.hashSync(senha, 10);
  db.prepare(
    'INSERT INTO funcionario (nome, email, senha_hash, cargo) VALUES (?, ?, ?, ?)'
  ).run('Administrador', email, hash, 'gerente');
  console.log('✔ Usuário gerente criado:');
  console.log(`  E-mail: ${email}`);
  console.log(`  Senha:  ${senha}`);
} else {
  console.log('ℹ Usuário gerente já existe, nada a fazer.');
}

const categorias = ['Material de Escritório', 'Limpeza', 'Ferramentas', 'Informática', 'Uniformes'];
const insertCat = db.prepare('INSERT OR IGNORE INTO categoria (nome) VALUES (?)');
for (const c of categorias) insertCat.run(c);
console.log('✔ Categorias padrão garantidas.');
