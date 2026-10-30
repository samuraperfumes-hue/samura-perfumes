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

export const VOLUMES = [25, 50, 60];

// Cadastra (sem duplicar) os itens base e uma essência por fragrância do catálogo.
export async function sincronizar(cx) {
  const itens = [
    ['Fixador', 'fixador', 'ml'], ['Veículo', 'veiculo', 'ml'],
    ['Rótulo', 'rotulo', 'un'], ['Sacola personalizada', 'sacola', 'un'],
  ];
  for (const v of VOLUMES) {
    itens.push(['Vidro ' + v + ' ml', 'vidro', 'un']);
  }
  itens.push(['Válvula', 'valvula', 'un']);
  const fr = await cx.query("select distinct f.nome from fragrancias f join apresentacoes a on a.fragrancia_id = f.id where a.ativa and a.tipo = 'Perfume' order by f.nome");
  fr.rows.forEach((r) => itens.push(['Essência ' + r.nome, 'essencia', 'ml']));
  // A válvula é padrão para todos os volumes: remove as por volume criadas antes, se ainda sem compras.
  await cx.query("delete from insumos where nome in ('Válvula 25 ml', 'Válvula 50 ml', 'Válvula 60 ml') and not exists (select 1 from compras_insumos c where c.insumo_id = insumos.id)");
  let novos = 0;
  for (const [nome, cat, un] of itens) {
    const r = await cx.query('insert into insumos (nome, categoria, unidade) values ($1, $2, $3) on conflict (nome) do nothing', [nome, cat, un]);
    novos += r.rowCount;
  }
  return novos;
}
