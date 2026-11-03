// Colunas e tabelas extras de clientes: origem do contato, indicação, convite,
// descontos (créditos) e registro de mensagens enviadas pelo WhatsApp.
let pronto = false;
export async function garantirClientes(cx) {
  if (pronto) return;
  await cx.query(`
    alter table clientes add column if not exists origem text, add column if not exists indicado_por text, add column if not exists indicado_tel text, add column if not exists indicado_em timestamptz, add column if not exists convite_em timestamptz;
    create table if not exists creditos (
      id serial primary key,
      cliente_id int not null references clientes(id) on delete cascade,
      tipo text not null,
      pct numeric(5,2) not null,
      origem_cliente_id int references clientes(id) on delete set null,
      validade date,
      usado_venda_id int,
      usado_em timestamptz,
      criado_em timestamptz not null default now()
    );
    create unique index if not exists creditos_boas_vindas on creditos (cliente_id) where tipo = 'boas_vindas';
    create unique index if not exists creditos_indicacao on creditos (origem_cliente_id) where tipo = 'indicacao';
    create table if not exists mensagens_enviadas (
      id serial primary key,
      cliente_id int not null references clientes(id) on delete cascade,
      tipo text not null,
      venda_id int,
      enviado_em timestamptz not null default now(),
      enviado_por int
    );
    create index if not exists mensagens_cli on mensagens_enviadas (cliente_id, tipo, enviado_em);
  `);
  pronto = true;
}

export const ORIGENS = ['Indicação', 'Instagram', 'WhatsApp', 'Conhecido', 'Trabalho', 'Evento', 'Outro'];
export const origemOk = (o) => (ORIGENS.includes(String(o || '')) ? String(o) : null);
export const PCT_BOAS_VINDAS = 5;
export const PCT_INDICACAO = 10;
export const DIAS_VALIDADE = 90;
export const TIPOS_MSG = ['cobranca', 'posvenda', 'resgate', 'convite', 'indique', 'desconto'];

// Gera os descontos que ainda não existem:
// 5% de boas-vindas para quem chegou por indicação;
// 10% para quem indicou (achado pelo WhatsApp), quando o indicado faz a primeira compra.
export async function gerarCreditos(cx) {
  await garantirClientes(cx);
  await cx.query(`insert into creditos (cliente_id, tipo, pct) select c.id, 'boas_vindas', $1 from clientes c where c.origem = 'Indicação' on conflict do nothing`, [PCT_BOAS_VINDAS]);
  await cx.query(`
    insert into creditos (cliente_id, tipo, pct, origem_cliente_id, validade)
    select r.id, 'indicacao', $1, c.id, (select min(v.data_venda) from vendas v where v.cliente_id = c.id and not v.cancelada) + $2::int
    from clientes c
    join lateral (
      select x.id from clientes x
      where x.id <> c.id
        and length(regexp_replace(coalesce(x.telefone, ''), '[^0-9]', '', 'g')) >= 10
        and right(regexp_replace(coalesce(x.telefone, ''), '[^0-9]', '', 'g'), 11) = right(regexp_replace(c.indicado_tel, '[^0-9]', '', 'g'), 11)
      order by x.id limit 1
    ) r on true
    where c.origem = 'Indicação'
      and length(regexp_replace(coalesce(c.indicado_tel, ''), '[^0-9]', '', 'g')) >= 10
      and exists (select 1 from vendas v where v.cliente_id = c.id and not v.cancelada)
    on conflict do nothing`, [PCT_INDICACAO, DIAS_VALIDADE]);
}

// Condição SQL de desconto disponível (alias k = creditos).
export const DISPONIVEL = `k.usado_venda_id is null and (k.validade is null or k.validade >= current_date) and (k.tipo <> 'boas_vindas' or not exists (select 1 from vendas vv where vv.cliente_id = k.cliente_id and not vv.cancelada))`;
