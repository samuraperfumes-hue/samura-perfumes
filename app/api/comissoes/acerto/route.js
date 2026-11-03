import { pool } from '../../../../lib/db';
import { exigir } from '../../../../lib/guard';
import { garantirEstornos, estornoPendente } from '../../../../lib/comissoes';

export const dynamic = 'force-dynamic';

const num = (v) => Number(String(v).replace(',', '.'));
const c2 = (v) => Math.round(Number(v) * 100) / 100;
const brl = (v) => 'R$ ' + Number(v).toFixed(2).replace('.', ',');

export async function POST(req) {
  const g = await exigir(true);
  if (g.erro) return g.erro;
  const b = await req.json();
  const vendedorId = Number(b.vendedor_id);
  const valor = c2(num(b.valor));
  if (!vendedorId || !(valor > 0)) return Response.json({ erro: 'Escolha o vendedor e informe um valor.' }, { status: 400 });
  const data = /^\d{4}-\d{2}-\d{2}$/.test(b.data || '') ? b.data : new Date().toISOString().slice(0, 10);
  const cx = await pool.connect();
  try {
    await garantirEstornos(cx);
    await cx.query('begin');
    await cx.query('select id from estornos_comissao where vendedor_id = $1 and acerto_id is null for update', [vendedorId]);
    const estorno = await estornoPendente(cx, vendedorId);
    let sql = `select c.venda_id, c.saldo from v_comissao_venda c join vendas v on v.id = c.venda_id where c.vendedor_id = $1 and c.estado = 'A pagar' and c.saldo > 0 and not v.cancelada`;
    const params = [vendedorId];
    if (Array.isArray(b.vendas)) {
      if (!b.vendas.length) throw new Error('Marque as vendas que este acerto vai quitar.');
      sql += ' and c.venda_id = any($2::int[])';
      params.push(b.vendas.map(Number));
    }
    sql += ' order by c.venda_id';
    const cand = (await cx.query(sql, params)).rows;
    const total = c2(cand.reduce((t, r) => t + Number(r.saldo), 0));
    const liquido = c2(total - estorno);
    if (estorno > 0 && liquido <= 0.004) throw new Error('Este vendedor tem ' + brl(estorno) + ' de comissão a devolver (vendas canceladas que já tinham comissão paga), e isso cobre todo o valor a pagar agora. Não há nada a pagar neste acerto.');
    if (valor > liquido + 0.005) throw new Error(estorno > 0 ? 'O valor passa do total a pagar. Das ' + brl(total) + ' a pagar, ' + brl(estorno) + ' são descontados de comissão de venda cancelada, então o máximo agora é ' + brl(liquido) + '.' : 'O valor passa do total a pagar (' + brl(total) + ').');
    const ac = await cx.query('insert into acertos_comissao (vendedor_id, valor, data, criado_por) values ($1, $2, $3, $4) returning id', [vendedorId, valor, data, g.s.id]);
    if (estorno > 0) await cx.query('update estornos_comissao set acerto_id = $1 where vendedor_id = $2 and acerto_id is null', [ac.rows[0].id, vendedorId]);
    let resto = c2(valor + estorno);
    for (const r of cand) {
      if (resto <= 0.004) break;
      const abate = c2(Math.min(resto, Number(r.saldo)));
      await cx.query('insert into acerto_itens (acerto_id, venda_id, valor) values ($1, $2, $3)', [ac.rows[0].id, r.venda_id, abate]);
      resto = c2(resto - abate);
    }
    await cx.query('commit');
    return Response.json({ ok: true, estornoDescontado: estorno });
  } catch (e) {
    await cx.query('rollback');
    return Response.json({ erro: e.message }, { status: 400 });
  } finally {
    cx.release();
  }
}
