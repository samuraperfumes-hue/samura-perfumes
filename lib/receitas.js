import { garantir as garantirCustos } from './custos';

export async function garantir(cx) {
  await garantirCustos(cx);
  await cx.query(`create table if not exists config_custos (
    chave text primary key,
    valor text not null
  )`);
}

export const PADRAO = {
  valvula_separada: '0', rotulo_padrao: '1', sacola_padrao: '3',
  partes_essencia: '1', partes_veiculo: '2', fixador_pct: '2', comissao_pct: '20', essencia_ref: 'media',
};

export async function lerConfig(cx) {
  const r = await cx.query('select chave, valor from config_custos');
  const c = { ...PADRAO };
  r.rows.forEach((x) => { c[x.chave] = x.valor; });
  return {
    valvula_separada: c.valvula_separada === '1',
    rotulo_padrao: Number(c.rotulo_padrao),
    sacola_padrao: Number(c.sacola_padrao),
    partes_essencia: Number(c.partes_essencia),
    partes_veiculo: Number(c.partes_veiculo),
    fixador_pct: Number(c.fixador_pct),
    comissao_pct: Number(c.comissao_pct),
    essencia_ref: c.essencia_ref,
  };
}

const mlDe = (txt) => { const m = String(txt || '').match(/(\d+(?:[.,]\d+)?)/); return m ? Number(m[1].replace(',', '.')) : null; };
const temNumero = (nome, n) => new RegExp('(^|\\D)' + n + '(\\D|$)').test(nome);
const r2 = (v) => Math.round(v * 100) / 100;
const moda = (xs) => {
  const c = new Map();
  xs.forEach((x) => c.set(x, (c.get(x) || 0) + 1));
  return [...c.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0][0];
};

// Custo por frasco usando UMA receita padrão (partes de essência e veículo + % de fixador).
export async function calcularPadrao(cx) {
  await garantir(cx);
  const cfg = await lerConfig(cx);
  const ins = (await cx.query(`select i.id, i.nome, i.categoria,
      coalesce(sum(c.quantidade), 0)::float as qtd, coalesce(sum(c.valor_total), 0)::float as gasto
    from insumos i left join compras_insumos c on c.insumo_id = i.id where i.ativo group by i.id order by i.nome`)).rows;
  const custoDe = (i) => (i && i.qtd > 0 ? i.gasto / i.qtd : null);
  const grupo = (cat) => {
    const xs = ins.filter((i) => i.categoria === cat && i.qtd > 0);
    const q = xs.reduce((t, i) => t + i.qtd, 0);
    return q > 0 ? xs.reduce((t, i) => t + i.gasto, 0) / q : null;
  };
  const falta = [];
  const essencias = ins.filter((i) => i.categoria === 'essencia');
  const refEss = cfg.essencia_ref !== 'media' ? essencias.find((i) => String(i.id) === String(cfg.essencia_ref)) : null;
  const custoEss = refEss ? custoDe(refEss) : grupo('essencia');
  const custoVei = grupo('veiculo');
  const custoFix = grupo('fixador');

  const fix = Math.min(Math.max(cfg.fixador_pct, 0), 100) / 100;
  const pe = Math.max(cfg.partes_essencia, 0);
  const pv = Math.max(cfg.partes_veiculo, 0);
  const soma = pe + pv || 1;
  const pctEss = (1 - fix) * (pe / soma);
  const pctVei = (1 - fix) * (pv / soma);

  if (pctEss > 0 && custoEss == null) falta.push(refEss ? 'compra de ' + refEss.nome : 'compra de essência');
  if (pctVei > 0 && custoVei == null) falta.push('compra de veículo');
  if (fix > 0 && custoFix == null) falta.push('compra de fixador');
  const custoMl = pctEss * (custoEss || 0) + pctVei * (custoVei || 0) + fix * (custoFix || 0);

  const aprs = (await cx.query("select volume, preco::float as preco from apresentacoes where ativa and tipo = 'Perfume'")).rows;
  const porVol = new Map();
  aprs.forEach((a) => { const ml = mlDe(a.volume); if (ml) { if (!porVol.has(ml)) porVol.set(ml, []); porVol.get(ml).push(a.preco); } });

  const rot = grupo('rotulo') ?? cfg.rotulo_padrao;
  const sac = grupo('sacola') ?? cfg.sacola_padrao;
  const val = cfg.valvula_separada ? grupo('valvula') : 0;
  if (cfg.valvula_separada && val == null) falta.push('compra de válvula');

  const volumes = [...porVol.keys()].sort((a, b) => a - b).map((ml) => {
    const precos = porVol.get(ml);
    const preco = moda(precos);
    const faltaV = [];
    const vidroIns = ins.find((i) => i.categoria === 'vidro' && temNumero(i.nome, ml) && i.qtd > 0);
    const vidro = custoDe(vidroIns);
    if (vidro == null) faltaV.push('compra de vidro ' + ml + ' ml');
    const liquido = ml * custoMl;
    const total = liquido + (vidro || 0) + (val || 0) + rot + sac;
    const comissao = (preco * cfg.comissao_pct) / 100;
    const lucro = preco - total - comissao;
    return {
      ml, preco, preco_min: Math.min(...precos), preco_max: Math.max(...precos),
      liquido: r2(liquido), vidro: r2(vidro || 0), valvula: r2(val || 0), rotulo: r2(rot), sacola: r2(sac),
      custo: r2(total), comissao: r2(comissao), lucro: r2(lucro), margem: preco > 0 ? r2((lucro / preco) * 100) : null,
      falta: faltaV,
    };
  });

  return {
    config: cfg,
    pct: { essencia: pctEss * 100, veiculo: pctVei * 100, fixador: fix * 100 },
    custo_ml: { essencia: custoEss, veiculo: custoVei, fixador: custoFix, mistura: r2(custoMl * 1000) / 1000 },
    falta,
    volumes,
    essencias: essencias.map((i) => ({ id: i.id, nome: i.nome, custo: custoDe(i) })),
  };
}
