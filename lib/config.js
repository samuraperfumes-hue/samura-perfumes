export const PADRAO_CFG = { whatsapp: '5521964147761', pix: '21 964147761', pausa_cobranca: '7', pausa_resgate: '7', cobranca_atraso: '0', resgate_dias: '60' };

// Prazos dos avisos (em dias), editáveis em Configurações.
export const PRAZOS = ['pausa_cobranca', 'pausa_resgate', 'cobranca_atraso', 'resgate_dias'];
export const dias = (v, padrao) => { const n = parseInt(v, 10); return Number.isFinite(n) && n >= 0 && n <= 365 ? n : padrao; };

// Configurações gerais editáveis (WhatsApp de contato, chave Pix e prazos dos avisos).
export async function lerConfigGeral(cx) {
  await cx.query('create table if not exists config_geral (chave text primary key, valor text not null)');
  const r = await cx.query('select chave, valor from config_geral');
  const c = { ...PADRAO_CFG };
  r.rows.forEach((x) => { if (x.valor) c[x.chave] = x.valor; });
  return c;
}
