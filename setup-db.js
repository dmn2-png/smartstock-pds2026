// setup-db.js — cria as tabelas no banco lendo o schema.sql
// Rode com: npm run db:setup
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

try {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(sql);
  console.log('✔ Tabelas criadas/atualizadas com sucesso.');
} catch (erro) {
  console.error('Erro ao criar as tabelas:', erro.message);
  process.exitCode = 1;
} finally {
  await pool.end(); // sem isso o terminal fica "travado"
}
