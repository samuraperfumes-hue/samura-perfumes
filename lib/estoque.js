export async function garantir(cx) {
  await cx.query(`create table if not exists movimentos_estoque (
    id serial primary key,
    local_id int not null references usuarios(id),
    apresentacao_id int not null references apresentacoes(id),
    quantidade int not null,
    tipo text not null,
    venda_item_id int references venda_itens(id),
    obs text,
    criado_por int references usuarios(id),
    criado_em timestamptz not null default now()
  )`);
  await cx.query('create index if not exists mov_estoque_idx on movimentos_estoque (local_id, apresentacao_id)');
}

export async function saldo(cx, local, apr) {
  const r = await cx.query('select coalesce(sum(quantidade), 0)::int as s from movimentos_estoque where local_id = $1 and apresentacao_id = $2', [local, apr]);
  return r.rows[0].s;
}
