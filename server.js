// server.js — SmartStock: Sistema de Gerenciamento de Almoxarifados
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth.js';
import funcionariosRoutes from './routes/funcionarios.js';
import categoriasRoutes from './routes/categorias.js';
import itensRoutes from './routes/itens.js';
import movimentacoesRoutes from './routes/movimentacoes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Rotas da API (RF01 a RF08)
app.use('/api/auth', authRoutes);
app.use('/api/funcionarios', funcionariosRoutes);
app.use('/api/categorias', categoriasRoutes);
app.use('/api/itens', itensRoutes);
app.use('/api/movimentacoes', movimentacoesRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok', sistema: 'SmartStock' }));

// Tratamento de erros genérico
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ erro: 'Erro interno do servidor.' });
});

app.listen(PORT, () => {
  console.log(`\n🏬 SmartStock rodando em http://localhost:${PORT}`);
  console.log('   Execute "npm run seed" na primeira vez para criar o usuário gerente.\n');
});
