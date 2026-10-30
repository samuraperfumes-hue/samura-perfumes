export const CATEGORIAS = [
  ['essencia', 'Essência'], ['fixador', 'Fixador'], ['veiculo', 'Veículo'],
  ['vidro', 'Vidro'], ['valvula', 'Válvula'], ['rotulo', 'Rótulo'],
  ['sacola', 'Sacola'], ['outro', 'Outro'],
];

export async function garantir(cx) {
  await cx.query(`create table if not exists insumos (
    id serial primary key,
    nome text not null unique,
    categoria text not null default 'outro',
    unidade text not null default 'un',
    ativo boolean not null default true,
    criado_em timestamptz not null default now()
  )`);
  await cx.query(`create table if not exists compras_insumos (
    id serial primary key,
    insumo_id int not null references insumos(id),
    data date not null default current_date,
    quantidade numeric(14,3) not null check (quantidade > 0),
    valor_total numeric(12,2) not null check (valor_total >= 0),
    fornecedor text,
    obs text,
    criado_por int references usuarios(id),
    criado_em timestamptz not null default now()
  )`);
  await cx.query('create index if not exists compras_insumo_idx on compras_insumos (insumo_id, data)');
}
