// Implementa RNF01 (uso de banco de dados) e o modelo de dados descrito
// // na seção 4 do relatório: Funcionário, Item, Categoria, Movimentação.
import 'dotenv/config';
import pg from 'pg';
const { Pool } = pg;

export const pool = new Pool({ connectionString: process.env.DATABASE_URL});

// ---------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------

// ---------------------------------------------------------------------
// Transações
// Garante que movimentação + atualização de saldo sejam gravadas juntas
// (ou nenhuma delas, em caso de erro).
// ---------------------------------------------------------------------
export async function transacao(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');          // começar
    const resultado = await fn(client);
    await client.query('COMMIT');          // confirmar
    return resultado;
  } catch (erro) {
    await client.query('ROLLBACK');          // desfazer
    throw erro;
  } finally {
    client.release();                       // devolver o guichê
  }
}

