import { pool, q } from '../../../lib/db';
import { exigir } from '../../../lib/guard';
import { garantir, saldo } from '../../../lib/estoque';
import { proximoCodigo } from '../../../lib/codigo';
import { garantirClientes, DISPONIVEL } from '../../../lib/clientes';

export const dynamic = 'force-dynamic';

const num = (v) => Number(String(v).replace(',', '.'));
const c2 = (v) => Math.round(Number(v) * 100) / 100;
const dt = (d) => (/^\d{4}-\d{2}-\d{2}$/.test(d || '') ? d : null);

export async function GET() {
  const g = await exigir(false);
  if (g.erro) return g.erro;
  const admin = g.s.papel === 'admin';
  await garantirClientes(pool);
  const base = `select v.id, v.codigo, v.data_venda, v.cliente_id, c.nome as cliente,
    (select max(m.enviado_em) from mensagens_enviadas m where m.cliente_id = v.cliente_id and m.tipo = 'cobranca') as ult_cobranca,
    (select max(m.enviado_em) from mensagens_enviadas m where m.cliente_id = v.cliente_id and m.tipo = 'posvenda') as ult_posvenda, c.telefone, u.nome as vendedor, v.total_liquido, v.desconto, s.situacao, s.saldo_devedor, v.comissao_valor,
    coalesce((select string_agg(i.quantidade || 'x ' || i.descricao, ', ' order by i.id) from venda_itens i where i.venda_id = v.id), '') as itens,
    coalesce((select bool_and(i.status_entrega = 'entregue') from venda_itens i where i.venda_id = v.id), true) as entregue
    from vendas v join clientes c on c.id = v.cliente_id join usuarios u on u.id = v.vendedor_id join v_venda_saldo s on s.venda_id = v.id where not v.cancelada`;
  const r = admin
    ? await q(base + ' order by v.id desc limit 300')
    : await q(base + ' and v.vendedor_id = $1 order by v.id desc limit 300', [g.s.id]);
  return Response.json(r.rows.map((x) => { if (!admin) delete x.comissao_valor; return x; }));
}

export async function POST(req) {
  const g = await exigir(false);
  if (g.erro) return g.erro;
  const admin = g.s.papel === 'admin';
  const b = await req.json();
  const vendedorId = admin ? Number(b.vendedor_id || g.s.id) : g.s.id;
  const cli = (await q('select id, vendedor_id from clientes where id = $1', [Number(b.cliente_id)])).rows[0];
  if (!cli || cli.vendedor_id !== vendedorId) return Response.json({ erro: 'Escolha um cliente da carteira deste vendedor.' }, { status: 400 });
  if (!Array.isArray(b.itens) || !b.itens.length) return Response.json({ erro: 'Inclua pelo menos um produto.' }, { status: 400 });
  const itens = [];
  for (const it of b.itens) {
    const a = (await q('select a.id, f.nome, a.tipo, a.volume, a.preco from apresentacoes a join fragrancias f on f.id = a.fragrancia_id where a.id = $1 and a.ativa', [Number(it.apresentacao_id)])).rows[0];
    const qtd = parseInt(it.quantidade, 10);
    const preco = it.preco_unit === undefined || it.preco_unit === '' ? Number(a && a.preco) : num(it.preco_unit);
    if (!a || !(qtd > 0) || !(preco >= 0)) return Response.json({ erro: 'Produto, quantidade ou preço inválido.' }, { status: 400 });
    const ent = it.entrega === 'estoque' || it.do_estoque ? 'estoque' : it.entrega === 'entregue' ? 'entregue' : 'envasar';
    itens.push({ id: a.id, desc: a.tipo + ' ' + a.nome + ' ' + a.volume, qtd, preco, ent });
  }
  const bruto = c2(itens.reduce((t, i) => t + i.qtd * i.preco, 0));
  const desc = Math.min(Math.max(num(b.desconto || 0) || 0, 0), bruto);
  const liquido = c2(bruto - desc);
  const vend = (await q('select comissao_tipo, comissao_valor from usuarios where id = $1 and ativo', [vendedorId])).rows[0];
  if (!vend) return Response.json({ erro: 'Vendedor inválido.' }, { status: 400 });
  let tipoC = vend.comissao_tipo;
  let taxa = Number(vend.comissao_valor);
  if (admin && b.comissao_taxa !== undefined && b.comissao_taxa !== '' && !isNaN(num(b.comissao_taxa))) {
    tipoC = b.comissao_tipo === 'fixo' ? 'fixo' : 'percentual';
    taxa = num(b.comissao_taxa);
  }
  const valorC = tipoC === 'fixo' ? taxa : Math.round(liquido * taxa) / 100;
  const data = dt(b.data_venda) || new Date().toISOString().slice(0, 10);
  const pg = b.pagamento || { modo: 'pendente' };
  const hoje = dt(pg.data) || new Date().toISOString().slice(0, 10);
  let pagos = [];
  if (pg.modo === 'avista') {
    pagos = [{ valor: liquido, prev: hoje, rec: true }];
  } else if (pg.modo === 'parcial') {
    const v = c2(num(pg.valor_pago));
    const resto = c2(liquido - v);
    if (!(v > 0) || !(resto > 0)) return Response.json({ erro: 'O valor pago agora precisa ser maior que zero e menor que o total.' }, { status: 400 });
    if (!dt(pg.data_restante)) return Response.json({ erro: 'Informe a data do restante.' }, { status: 400 });
    pagos = [{ valor: v, prev: hoje, rec: true }, { valor: resto, prev: pg.data_restante, rec: false }];
  } else if (pg.modo === 'parcelado') {
    pagos = (pg.parcelas || []).map((p) => ({ valor: c2(p.valor), prev: dt(p.data_prevista), rec: false }));
    if (!pagos.length || pagos.some((p) => !(p.valor > 0) || !p.prev) || c2(pagos.reduce((t, p) => t + p.valor, 0)) > liquido + 0.005) return Response.json({ erro: 'Parcelas inválidas.' }, { status: 400 });
  } else if (liquido > 0) {
    pagos = [{ valor: liquido, prev: dt(pg.data_prevista), rec: false }];
  }
  const cx = await pool.connect();
  try {
    await garantir(cx);
    await garantirClientes(cx);
    await cx.query('begin');
    let credito = null;
    if (b.credito_id) {
      credito = (await cx.query(`select k.id from creditos k where k.id = $1 and k.cliente_id = $2 and ${DISPONIVEL} for update of k`, [Number(b.credito_id), cli.id])).rows[0];
      if (!credito) throw new Error('O desconto escolhido não está mais disponível. Tire o desconto e salve de novo.');
    }
    const pedido = new Map();
    for (const i of itens) if (i.ent === 'estoque') pedido.set(i.id, (pedido.get(i.id) || 0) + i.qtd);
    for (const [apr, qt] of pedido) {
      const disp = await saldo(cx, vendedorId, apr);
      if (qt > disp) throw new Error('Estoque insuficiente de ' + itens.find((i) => i.id === apr).desc + ': disponível ' + disp + ', pedido ' + qt + '.');
    }
    const id = (await cx.query(`select nextval(pg_get_serial_sequence('vendas', 'id')) as id`)).rows[0].id;
    const codigo = await proximoCodigo(cx);
    await cx.query('insert into vendas (id, codigo, cliente_id, vendedor_id, lancada_por, responsavel_cobranca_id, data_venda, forma_pagamento, observacoes, desconto, total_bruto, total_liquido, comissao_tipo, comissao_taxa, comissao_valor) values ($1, $2, $3, $4, $5, $4, $6, $7, $8, $9, $10, $11, $12, $13, $14)', [id, codigo, cli.id, vendedorId, g.s.id, data, b.forma_pagamento || null, String(b.observacoes || '').trim() || null, desc, bruto, liquido, tipoC, taxa, valorC]);
    for (const i of itens) {
      const ins = await cx.query('insert into venda_itens (venda_id, apresentacao_id, descricao, quantidade, preco_unit, status_entrega) values ($1, $2, $3, $4, $5, $6) returning id', [id, i.id, i.desc, i.qtd, i.preco, i.ent === 'envasar' ? 'pendente' : 'entregue']);
      if (i.ent === 'estoque') await cx.query(`insert into movimentos_estoque (local_id, apresentacao_id, quantidade, tipo, venda_item_id, obs, criado_por) values ($1, $2, $3, 'venda', $4, $5, $6)`, [vendedorId, i.id, -i.qtd, ins.rows[0].id, 'Venda ' + codigo, g.s.id]);
    }
    for (const p of pagos) {
      if (p.rec && admin) await cx.query(`insert into pagamentos (venda_id, valor, data_prevista, data_original, data_recebimento, situacao, validado_por, validado_em) values ($1, $2, $3, $3, $3, 'recebido', $4, now())`, [id, p.valor, p.prev, g.s.id]);
      else if (p.rec) await cx.query(`insert into pagamentos (venda_id, valor, data_prevista, data_original, data_recebimento, situacao, informado_por, informado_em) values ($1, $2, $3, $3, $3, 'informado', $4, now())`, [id, p.valor, p.prev, g.s.id]);
      else await cx.query(`insert into pagamentos (venda_id, valor, data_prevista, data_original, situacao) values ($1, $2, $3, $3, 'agendado')`, [id, p.valor, p.prev]);
    }
    if (credito) await cx.query('update creditos set usado_venda_id = $1, usado_em = now() where id = $2', [id, credito.id]);
    await cx.query('commit');
    return Response.json({ id, codigo });
  } catch (e) {
    await cx.query('rollback');
    return Response.json({ erro: e.message }, { status: 400 });
  } finally {
    cx.release();
  }
}
