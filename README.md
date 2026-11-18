# SmartStock v2 — Almoxarifado (Node + Express + Postgres/Neon, pronto para a Vercel)

## Rodar no seu PC
```bash
npm install
cp .env.example .env     # (Windows: copie o arquivo e renomeie) e preencha DATABASE_URL e JWT_SECRET
npm run db:setup         # cria/atualiza as tabelas (inclui checklist_item). Pode rodar de novo sem medo.
npm run seed             # cria o gerente: gerente@smartstock.com / admin123  (troque na tela "Usuário")
npm start                # http://localhost:3000
```

## Publicar (GitHub + Vercel)
1. `git add . && git commit -m "SmartStock v2" && git push` (o `.env` NÃO sobe: está no `.gitignore`).
2. Vercel → Add New → Project → escolha o repositório.
3. Em *Environment Variables* crie `DATABASE_URL` (**sem aspas**) e `JWT_SECRET`. Deploy.
4. Tabelas novas? Rode `npm run db:setup` no seu PC com o `.env` apontando para o Neon (a Vercel usa o mesmo banco).

## Estrutura
- `server.js` (exporta o app p/ Vercel) · `db.js` (pool + transação) · `schema.sql` · `seed.js` · `setup-db.js`
- `routes/`: auth, funcionarios, categorias, itens, movimentacoes, **checklists**, resumo
- `public/`: login.html, index.html, css/style.css, js/app.js

## Checklists por usuário (novo)
Tabela `checklist_item` (`funcionario_id` → dono). Toda rota de `routes/checklists.js` filtra por
`funcionario_id = req.usuario.id` (vem do token): ninguém lê/edita/apaga o checklist de outro, nem o gerente.
`GET/POST /api/checklists` · `PUT/DELETE /api/checklists/:id`
