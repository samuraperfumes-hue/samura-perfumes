// Colunas extras de clientes: origem do contato, indicação e convite enviado.
let pronto = false;
export async function garantirClientes(cx) {
  if (pronto) return;
  await cx.query('alter table clientes add column if not exists origem text, add column if not exists indicado_por text, add column if not exists indicado_tel text, add column if not exists indicado_em timestamptz, add column if not exists convite_em timestamptz');
  pronto = true;
}

export const ORIGENS = ['Indicação', 'Instagram', 'WhatsApp', 'Conhecido', 'Trabalho', 'Evento', 'Outro'];
export const origemOk = (o) => (ORIGENS.includes(String(o || '')) ? String(o) : null);
