// db.js — Camada de acesso ao banco de dados (SQLite)
// Implementa RNF01 (uso de banco de dados) e o modelo de dados descrito
// na seção 4 do relatório: Funcionário, Item, Categoria, Movimentação.

import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, 'smartstock.db');
export const db = new DatabaseSync(dbPath);

// Ativa integridade referencial (chaves estrangeiras)
db.exec('PRAGMA foreign_keys = ON;');

// ---------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------
db.exec(`
CREATE TABLE IF NOT EXISTS funcionario (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  nome          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  senha_hash    TEXT NOT NULL,
  cargo         TEXT NOT NULL CHECK (cargo IN ('funcionario', 'gerente')) DEFAULT 'funcionario',
  ativo         INTEGER NOT NULL DEFAULT 1,
  criado_em     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS categoria (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  nome          TEXT NOT NULL UNIQUE,
  descricao     TEXT
);

CREATE TABLE IF NOT EXISTS item (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  nome              TEXT NOT NULL,
  descricao         TEXT,
  categoria_id      INTEGER REFERENCES categoria(id) ON DELETE SET NULL,
  quantidade        INTEGER NOT NULL DEFAULT 0 CHECK (quantidade >= 0),
  quantidade_minima INTEGER NOT NULL DEFAULT 0,
  unidade           TEXT NOT NULL DEFAULT 'un',
  ativo             INTEGER NOT NULL DEFAULT 1,
  criado_em         TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS movimentacao (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id        INTEGER NOT NULL REFERENCES item(id),
  funcionario_id INTEGER NOT NULL REFERENCES funcionario(id),
  tipo           TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  quantidade     INTEGER NOT NULL CHECK (quantidade > 0),
  observacao     TEXT,
  data_hora      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_item_categoria ON item(categoria_id);
CREATE INDEX IF NOT EXISTS idx_mov_item ON movimentacao(item_id);
CREATE INDEX IF NOT EXISTS idx_mov_funcionario ON movimentacao(funcionario_id);
CREATE INDEX IF NOT EXISTS idx_mov_data ON movimentacao(data_hora);
`);

// ---------------------------------------------------------------------
// Transações
// Garante que movimentação + atualização de saldo sejam gravadas juntas
// (ou nenhuma delas, em caso de erro).
// ---------------------------------------------------------------------
export function transacao(fn) {
  db.exec('BEGIN');
  try {
    const resultado = fn();
    db.exec('COMMIT');
    return resultado;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

export default db;
