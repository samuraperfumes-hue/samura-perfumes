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

  // Variação por fragrância: mesma receita, mas com o custo da essência de cada uma.
  const frs = (await cx.query("select f.id, f.nome, a.volume, a.preco::float as preco from fragrancias f join apresentacoes a on a.fragrancia_id = f.id where a.ativa and a.tipo = 'Perfume' order by f.nome")).rows;
  const norm = (t) => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const porNome = new Map(essencias.map((i) => [norm(i.nome.replace(/^ess[eê]ncia\s+/i, '')), i]));
  const mapaFr = new Map();
  frs.forEach((x) => {
    const ml = mlDe(x.volume); if (!ml) return;
    if (!mapaFr.has(x.id)) mapaFr.set(x.id, { id: x.id, nome: x.nome, precos: {} });
    mapaFr.get(x.id).precos[ml] = x.preco;
  });
  const fragrancias = [...mapaFr.values()].map((f) => {
    const ins2 = porNome.get(norm(f.nome));
    const c = custoDe(ins2);
    const semCompra = c == null;
    const ce = semCompra ? custoEss : c;
    const mlCusto = pctEss * (ce || 0) + pctVei * (custoVei || 0) + fix * (custoFix || 0);
    const vols = volumes.filter((v) => f.precos[v.ml] != null).map((v) => {
      const preco = f.precos[v.ml];
      const custo = v.ml * mlCusto + v.vidro + v.valvula + v.rotulo + v.sacola;
      const comissao = (preco * cfg.comissao_pct) / 100;
      const lucro = preco - custo - comissao;
      return { ml: v.ml, preco, custo: r2(custo), comissao: r2(comissao), lucro: r2(lucro), margem: preco > 0 ? r2((lucro / preco) * 100) : null };
    });
    return { id: f.id, nome: f.nome, custo_essencia: ce, sem_compra: semCompra, volumes: vols };
  });
  // Marca as que destoam: margem a mais de 10 pontos da mediana do volume.
  const mediana = (xs) => { const a = [...xs].sort((p, q) => p - q); const m = a.length >> 1; return a.length ? (a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2) : null; };
  const med = {};
  volumes.forEach((v) => { med[v.ml] = mediana(fragrancias.flatMap((f) => f.volumes.filter((x) => x.ml === v.ml && x.margem != null && !f.sem_compra).map((x) => x.margem))); });
  fragrancias.forEach((f) => f.volumes.forEach((x) => { x.mediana = med[x.ml]; x.destoa = med[x.ml] != null && !f.sem_compra && x.margem != null && Math.abs(x.margem - med[x.ml]) > 10; }));

  return {
    fragrancias,
    config: cfg,
    pct: { essencia: pctEss * 100, veiculo: pctVei * 100, fixador: fix * 100 },
    custo_ml: { essencia: custoEss, veiculo: custoVei, fixador: custoFix, mistura: r2(custoMl * 1000) / 1000 },
    falta,
    volumes,
    essencias: essencias.map((i) => ({ id: i.id, nome: i.nome, custo: custoDe(i) })),
  };
}
