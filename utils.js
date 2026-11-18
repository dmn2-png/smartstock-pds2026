// utils.js — pequenas funções usadas por várias rotas

// Fuso usado para "hoje" e para os filtros de data (o servidor da Vercel/Neon trabalha em UTC).
export const FUSO = 'America/Sao_Paulo';

// Confere se o texto é uma data no formato AAAA-MM-DD e se ela existe de verdade.
export function dataValida(texto) {
  if (typeof texto !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(texto)) return false;
  const d = new Date(texto + 'T00:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === texto;
}

// Converte "12" ou 12 em número inteiro; devolve null se não for inteiro.
export function inteiro(valor) {
  const n = Number(valor);
  return Number.isInteger(n) ? n : null;
}
