export async function proximoCodigo(cx) {
  const r = await cx.query(`select coalesce(max(substring(codigo from 5)::int), 0) + 1 as n from vendas where codigo ~ '^VND-[0-9]+$'`);
  return 'VND-' + String(r.rows[0].n).padStart(4, '0');
}
