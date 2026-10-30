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
  await cx.query(`create table if not exists equivalencias (
    chave text primary key,
    origem text not null,
    nome_real text not null,
    criado_em timestamptz not null default now()
  )`);
  if (Number((await cx.query('select count(*) from equivalencias')).rows[0].count) === 0) {
    for (const [loja, real] of EQUIV_INICIAL) {
      await cx.query('insert into equivalencias (chave, origem, nome_real) values ($1, $2, $3) on conflict (chave) do nothing', [chaveEq(loja), loja, real]);
    }
  }
}

// Chave de comparação: sem acentos, sem tamanhos, sem palavras genéricas, palavras em ordem alfabética.
export function chaveEq(texto, semGold) {
  const t = String(texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/\((?:m|f|u)\)/g, ' ').replace(/\(?\d+(?:[.,]\d+)?\s*(?:ml|g)\)?/g, ' ');
  const fora = ['arabe', 'essencia', 'perfumaria', 'fina', 'importado', 'importada', 'ml', 'g', 'de', 'da', 'do'];
  if (semGold) fora.push('gold');
  const tk = t.split(/[^a-z0-9]+/).filter((x) => x && !fora.includes(x));
  return [...new Set(tk)].sort().join(' ');
}

// Nome da loja do fornecedor -> fragrância real (planilha "LISTAGEM DE FRAGRANCIAS").
export const EQUIV_INICIAL = [
  ['Vida Bela Elixir', 'La Vie Est Belle Elixir'], ['Gold Wine', 'Malbec Gold'],
  ['Arabe Morning Valentine', 'Sabah Al Ward Valentine'], ['Extaordinary Rose', 'La Vie Est Belle Rose'],
  ['Moulin Rouge', 'Scandal'], ['Private Man Black', '212 VIP Black'], ['Sauvage', 'Sauvage'],
  ['Arabe Vin Brun', 'Khamrah Qahwa'], ['Etude Alure', 'Allure Chanel'], ['Bad Man Blue', 'Bad Boy Cobalt'],
  ['Arabe Oud Glory', "Bade'e Al Oud For Glory"], ['Girl Blush', 'Good Girl Blush'],
  ['Arabe Mermaid Elixir', 'Yara Elixir'], ['Lady Gold', 'Lady Million'], ['Arabe Desert Elixir', 'Asad Elixir'],
  ['Arabe Rouge 540', 'Baccarat Rouge 540'], ['Bleu Top', 'Bleu de Chanel'], ['Private Rose', '212 VIP Rose'],
  ['Apolo', 'Invictus'],
];

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
