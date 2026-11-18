// server.js — SmartStock: Sistema de Gerenciamento de Almoxarifados
import 'dotenv/config'; // tem que ser a PRIMEIRA linha: carrega o .env antes de tudo
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth.js';
import funcionariosRoutes from './routes/funcionarios.js';
import categoriasRoutes from './routes/categorias.js';
import itensRoutes from './routes/itens.js';
import movimentacoesRoutes from './routes/movimentacoes.js';
import checklistsRoutes from './routes/checklists.js';
import resumoRoutes from './routes/resumo.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors());
app.use(express.json());

// Local: o Express serve a pasta public/. Na Vercel ela é servida pela própria Vercel.
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', authRoutes);
app.use('/api/funcionarios', funcionariosRoutes);
app.use('/api/categorias', categoriasRoutes);
app.use('/api/itens', itensRoutes);
app.use('/api/movimentacoes', movimentacoesRoutes);
app.use('/api/checklists', checklistsRoutes);
app.use('/api/resumo', resumoRoutes);
app.use('/api/checklists', checklistsRoutes)

app.get('/api/health', (req, res) => res.json({ status: 'ok', sistema: 'SmartStock' }));

// Qualquer outra rota /api/... que não existe
app.use('/api', (req, res) => res.status(404).json({ erro: 'Rota não encontrada.' }));

// Tratamento de erros: o erro REAL aparece no terminal (ou em "Logs" na Vercel)
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ erro: 'JSON inválido no corpo da requisição.' });
  }
  console.error(err);
  res.status(500).json({ erro: 'Erro interno do servidor.' });
});

// A Vercel usa o "app" exportado. Só ligamos a porta quando rodamos no nosso PC.
export default app;

if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`\n🏬 SmartStock rodando em http://localhost:${PORT}\n`));
}
