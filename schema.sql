-- schema.sql — tabelas do SmartStock no PostgreSQL (Neon)
-- Pode rodar quantas vezes quiser: "IF NOT EXISTS" não recria o que já existe.
-- Rode com:  npm run db:setup   (ou cole este arquivo no SQL Editor do Neon)

CREATE TABLE IF NOT EXISTS funcionario (
  id          SERIAL PRIMARY KEY,
  nome        TEXT NOT NULL,
  email       TEXT NOT NULL UNIQUE,
  senha_hash  TEXT NOT NULL,
  cargo       TEXT NOT NULL DEFAULT 'funcionario' CHECK (cargo IN ('funcionario', 'gerente')),
  ativo       INTEGER NOT NULL DEFAULT 1,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS categoria (
  id         SERIAL PRIMARY KEY,
  nome       TEXT NOT NULL UNIQUE,
  descricao  TEXT
);

CREATE TABLE IF NOT EXISTS item (
  id                 SERIAL PRIMARY KEY,
  nome               TEXT NOT NULL,
  descricao          TEXT,
  categoria_id       INTEGER REFERENCES categoria(id) ON DELETE SET NULL,
  quantidade         INTEGER NOT NULL DEFAULT 0 CHECK (quantidade >= 0),
  quantidade_minima  INTEGER NOT NULL DEFAULT 0,
  unidade            TEXT NOT NULL DEFAULT 'un',
  ativo              INTEGER NOT NULL DEFAULT 1,
  criado_em          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS movimentacao (
  id              SERIAL PRIMARY KEY,
  item_id         INTEGER NOT NULL REFERENCES item(id),
  funcionario_id  INTEGER NOT NULL REFERENCES funcionario(id),
  tipo            TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  quantidade      INTEGER NOT NULL CHECK (quantidade > 0),
  observacao      TEXT,
  data_hora       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- NOVO: checklist de cada funcionário (cada linha pertence a UM funcionário)
CREATE TABLE IF NOT EXISTS checklist_item (
  id              SERIAL PRIMARY KEY,
  funcionario_id  INTEGER NOT NULL REFERENCES funcionario(id) ON DELETE CASCADE,
  titulo          TEXT NOT NULL,
  prazo           DATE,
  concluido       BOOLEAN NOT NULL DEFAULT false,
  concluido_em    TIMESTAMPTZ,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_item_categoria     ON item(categoria_id);
CREATE INDEX IF NOT EXISTS idx_mov_item           ON movimentacao(item_id);
CREATE INDEX IF NOT EXISTS idx_mov_funcionario    ON movimentacao(funcionario_id);
CREATE INDEX IF NOT EXISTS idx_mov_data           ON movimentacao(data_hora);
CREATE INDEX IF NOT EXISTS idx_checklist_func     ON checklist_item(funcionario_id);
