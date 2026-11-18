// db.js — conexão com o PostgreSQL (Neon)
// Aqui só existem 3 coisas: ler o .env, criar o "pool" de conexões e a função "transacao".
import 'dotenv/config';
import pg from 'pg';

const { Pool, types } = pg;

// Colunas do tipo DATE (ex.: prazo do checklist) voltam como texto "2026-10-22".
// Sem isso o JavaScript converteria para Date e o dia poderia "andar" por causa do fuso horário.
types.setTypeParser(1082, (valor) => valor);

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL não encontrada. Crie o arquivo .env (veja o .env.example).');
}

// Pool = grupo de conexões já abertas. Cada consulta "empresta" uma e devolve.
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5, // poucas conexões: na Vercel cada função abre as suas
});

// O Neon fecha conexões paradas. Sem este "ouvinte", esse aviso derrubaria o servidor.
pool.on('error', (erro) => console.error('Conexão ociosa do banco foi encerrada:', erro.message));

// Transação = várias gravações que acontecem JUNTAS ou nenhuma.
// Todas as consultas precisam usar o MESMO "client" (o mesmo guichê), por isso o pool.connect().
export async function transacao(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const resultado = await fn(client);
    await client.query('COMMIT');
    return resultado;
  } catch (erro) {
    await client.query('ROLLBACK');
    throw erro;
  } finally {
    client.release();
  }
}
