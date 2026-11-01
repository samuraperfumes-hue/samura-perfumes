import { garantir as garantirCustos } from './custos';

export async function garantir(cx) {
  await garantirCustos(cx);
  await cx.query(`create table if not exists receitas (
    id serial primary key,
    fragrancia_id int not null references fragrancias(id) on delete cascade,
    insumo_id int not null references insumos(id),
    pct numeric(6,3) not null check (pct > 0 and pct <= 100),
    unique (fragrancia_id, insumo_id)
  )`);
  await cx.query('alter table receitas add column if not exists ml numeric(10,3)');
  await cx.query(`create table if not exists config_custos (
    chave text primary key,
    valor text not null
  )`);
}

export const PADRAO = { valvula_separada: '0', rotulo_padrao: '1', sacola_padrao: '3' };

export async function lerConfig(cx) {
  const r = await cx.query('select chave, valor from config_custos');
  const c = { ...PADRAO };
  r.rows.forEach((x) => { c[x.chave] = x.valor; });
  return { valvula_separada: c.valvula_separada === '1', rotulo_padrao: Number(c.rotulo_padrao), sacola_padrao: Number(c.sacola_padrao) };
}

const mlDe = (txt) => { const m = String(txt || '').match(/(\d+(?:[.,]\d+)?)/); return m ? Number(m[1].replace(',', '.')) : null; };
const temNumero = (nome, n) => new RegExp('(^|\\D)' + n + '(\\D|$)').test(nome);
const r2 = (v) => Math.round(v * 100) / 100;

// Calcula receita, custo por frasco e margem de cada fragrância (apresentações do tipo Perfume).
export async function calcular(cx) {
  await garantir(cx);
  const cfg = await lerConfig(cx);
  const ins = (await cx.query(`select i.id, i.nome, i.categoria, i.unidade,
      case when coalesce(sum(c.quantidade), 0) > 0 then (sum(c.valor_total) / sum(c.quantidade))::float end as custo
    from insumos i left join compras_insumos c on c.insumo_id = i.id where i.ativo group by i.id order by i.nome`)).rows;
  const porId = new Map(ins.map((i) => [i.id, i]));
  const veiculo = ins.find((i) => i.categoria === 'veiculo');
  const valvula = ins.find((i) => i.categoria === 'valvula');
  const rotulo = ins.find((i) => i.categoria === 'rotulo');
  const sacola = ins.find((i) => i.categoria === 'sacola');
  const frs = (await cx.query('select id, nome from fragrancias order by nome')).rows;
  const recs = (await cx.query('select fragrancia_id, insumo_id, pct::float as pct, ml::float as ml from receitas order by id')).rows;
  const aprs = (await cx.query("select id, fragrancia_id, tipo, volume, preco::float as preco from apresentacoes where ativa and tipo = 'Perfume' order by volume")).rows;

  const fragrancias = frs.map((f) => {
    const itens = recs.filter((r) => r.fragrancia_id === f.id).map((r) => ({ insumo_id: r.insumo_id, pct: r.pct, ml: r.ml, nome: porId.get(r.insumo_id)?.nome || '?', categoria: porId.get(r.insumo_id)?.categoria, custo: porId.get(r.insumo_id)?.custo ?? null }));
    const soma = itens.reduce((t, x) => t + x.pct, 0);
    const pctVeiculo = itens.length ? Math.max(0, 100 - soma) : 0;
    const apresentacoes = aprs.filter((a) => a.fragrancia_id === f.id).map((a) => {
      const ml = mlDe(a.volume);
      const falta = [];
      if (!itens.length) falta.push('receita');
      let liquido = 0;
      itens.forEach((x) => { if (x.custo == null) falta.push('compra de ' + x.nome); else liquido += ml * (x.pct / 100) * x.custo; });
      if (pctVeiculo > 0.01) { if (!veiculo || veiculo.custo == null) falta.push('compra de Veículo'); else liquido += ml * (pctVeiculo / 100) * veiculo.custo; }
      const vidroIns = ins.find((i) => i.categoria === 'vidro' && ml && temNumero(i.nome, ml));
      let vidro = vidroIns?.custo;
      if (vidro == null) { falta.push('compra de Vidro ' + ml + ' ml'); vidro = 0; }
      let val = 0;
      if (cfg.valvula_separada) { if (valvula?.custo == null) falta.push('compra de Válvula'); else val = valvula.custo; }
      const rot = rotulo?.custo ?? cfg.rotulo_padrao;
      const sac = sacola?.custo ?? cfg.sacola_padrao;
      const total = liquido + vidro + val + rot + sac;
      const completo = falta.length === 0;
      return { id: a.id, volume: a.volume, ml, preco: a.preco, custo: { liquido: r2(liquido), vidro: r2(vidro), valvula: r2(val), rotulo: r2(rot), sacola: r2(sac), total: r2(total) }, lucro: r2(a.preco - total), margem: a.preco > 0 ? r2(((a.preco - total) / a.preco) * 100) : null, completo, falta };
    });
    return { id: f.id, nome: f.nome, itens, pct_veiculo: pctVeiculo > 0.01 ? Math.round(pctVeiculo * 1000) / 1000 : 0, total_ml: itens.reduce((t, x) => t + (x.ml || 0), 0), apresentacoes };
  }).filter((f) => f.apresentacoes.length || f.itens.length);

  const vendedores = (await cx.query("select id, nome, comissao_tipo, comissao_valor::float as comissao_valor from usuarios where ativo order by nome")).rows;

  return {
    config: cfg,
    vendedores,
    fragrancias,
    insumos: ins.filter((i) => ['essencia', 'fixador', 'veiculo'].includes(i.categoria)).map((i) => ({ id: i.id, nome: i.nome, categoria: i.categoria, custo: i.custo })),
  };
}
