// seed.js — cria o primeiro gerente e as categorias padrão
// Rode com: npm run seed   (depois de npm run db:setup)
import bcrypt from 'bcryptjs';
import { pool } from './db.js';

const email = 'gerente@smartstock.com';
const senha = 'admin123';

try {
  const existente = await pool.query('SELECT id FROM funcionario WHERE email = $1', [email]);

  if (existente.rows.length === 0) {
    const hash = bcrypt.hashSync(senha, 10);
    await pool.query(
      'INSERT INTO funcionario (nome, email, senha_hash, cargo) VALUES ($1, $2, $3, $4)',
      ['Administrador', email, hash, 'gerente']
    );
    console.log('✔ Gerente criado:');
    console.log(`  E-mail: ${email}`);
    console.log(`  Senha:  ${senha}   (troque na tela "Usuário" depois do primeiro acesso!)`);
  } else {
    console.log('ℹ O gerente já existe, nada a fazer.');
  }

  const categorias = ['Material de Escritório', 'Limpeza', 'Ferramentas', 'Informática', 'Uniformes'];
  for (const nome of categorias) {
    await pool.query('INSERT INTO categoria (nome) VALUES ($1) ON CONFLICT (nome) DO NOTHING', [nome]);
  }
  // Esta mensagem fica DENTRO do try: só aparece se tudo deu certo.
  console.log('✔ Categorias padrão garantidas.');
} catch (erro) {
  console.error('Erro no seed:', erro.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
