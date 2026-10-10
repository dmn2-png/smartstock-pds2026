# SmartStock — Sistema de Gerenciamento de Almoxarifados

**Versão base (SQLite, roda 100% no seu computador).**
Esta é a versão ANTES da migração para Neon + Vercel.

## Requisitos

- **Node.js 22 ou superior** (https://nodejs.org). Confira com `node --version`.
- Não precisa instalar banco de dados: o SQLite já vem dentro do Node 22.

## Como executar

Abra o terminal **dentro da pasta do projeto** (onde está o `package.json`):

```bash
npm install     # instala as dependências (só na primeira vez)
npm run seed    # cria o gerente inicial e as categorias (só na primeira vez)
npm start       # sobe o servidor
```

Abra no navegador: **http://localhost:3000**

| E-mail                 | Senha    | Cargo   |
|------------------------|----------|---------|
| gerente@smartstock.com | admin123 | Gerente |

Para parar o servidor: `Ctrl + C`.

> O Node mostra o aviso "SQLite is an experimental feature". É normal e não é erro.

## Estrutura

```
smartstock/
├── package.json
├── server.js            # ponto de entrada (Express)
├── db.js                # abre o SQLite, cria as tabelas, função de transação
├── seed.js              # cria o gerente inicial
├── data/                # aqui nasce o arquivo smartstock.db
├── middleware/auth.js   # JWT + checagem de cargo
├── routes/              # auth, funcionarios, categorias, itens, movimentacoes
└── public/              # front-end (HTML/CSS/JS puro)
```

## Fluxo da aplicação

1. `login.html` envia e-mail e senha para `POST /api/auth/login`.
2. O servidor confere a senha (bcrypt) e devolve um token JWT.
3. O navegador guarda o token e o envia no cabeçalho `Authorization` em toda requisição.
4. `middleware/auth.js` valida o token (e o cargo, nas rotas de gerente).
5. A rota consulta o SQLite (`db.js`) e responde em JSON.

## Endpoints da API

| Método | Rota | Quem acessa |
|---|---|---|
| POST | `/api/auth/login` | todos |
| GET | `/api/auth/me` | logado |
| GET/POST/PUT/DELETE | `/api/funcionarios` | gerente |
| GET | `/api/categorias` | logado |
| POST/PUT/DELETE | `/api/categorias` | gerente |
| GET | `/api/itens`, `/api/itens/:id` | logado |
| POST/PUT/DELETE | `/api/itens` | gerente |
| POST | `/api/movimentacoes/entrada` | logado |
| POST | `/api/movimentacoes/saida` | logado |
| GET | `/api/movimentacoes` (filtros: item_id, funcionario_id, tipo, dataInicio, dataFim) | logado |

## Requisitos do relatório

RF01–RF08 e RNF01–RNF04 implementados. Os fluxos alternativos dos casos de uso
aparecem comentados no código (ex.: `[UC004.FS001]`).

## Subir para o GitHub

O arquivo `.gitignore` já impede o envio de `node_modules`, `.env` e do banco local.
Veja a conversa com o passo a passo (`git init`, `git add .`, `git commit`, `git push`).
