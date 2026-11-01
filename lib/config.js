export const PADRAO_CFG = { whatsapp: '5521964147761', pix: '21 964147761' };

// Configurações gerais editáveis (WhatsApp de contato e chave Pix).
export async function lerConfigGeral(cx) {
  await cx.query('create table if not exists config_geral (chave text primary key, valor text not null)');
  const r = await cx.query('select chave, valor from config_geral');
  const c = { ...PADRAO_CFG };
  r.rows.forEach((x) => { if (x.valor) c[x.chave] = x.valor; });
  return c;
}
