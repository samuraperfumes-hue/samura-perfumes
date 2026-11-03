// Estorno de comissão: quando uma venda com comissão já paga é cancelada,
// o valor pago fica pendente e é descontado automaticamente no próximo acerto do vendedor.
let pronto = false;
export async function garantirEstornos(cx) {
  if (pronto) return;
  await cx.query(`
    create table if not exists estornos_comissao (
      id serial primary key,
      venda_id int not null unique,
      vendedor_id int not null,
      valor numeric(12,2) not null,
      acerto_id int,
      criado_em timestamptz not null default now()
    );
  `);
  pronto = true;
}

// Total de estornos ainda não descontados de um vendedor.
export async function estornoPendente(cx, vendedorId) {
  await garantirEstornos(cx);
  const r = await cx.query('select coalesce(sum(valor), 0) as s from estornos_comissao where vendedor_id = $1 and acerto_id is null', [vendedorId]);
  return Math.round(Number(r.rows[0].s) * 100) / 100;
}
