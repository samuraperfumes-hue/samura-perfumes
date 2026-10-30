import { pool } from '../../../../lib/db';
import { exigir } from '../../../../lib/guard';

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
    await cx.query('begin');
    let sql = `select venda_id, saldo from v_comissao_venda where vendedor_id = $1 and estado = 'A pagar' and saldo > 0`;
    const params = [vendedorId];
    if (Array.isArray(b.vendas)) {
      if (!b.vendas.length) throw new Error('Marque as vendas que este acerto vai quitar.');
      sql += ' and venda_id = any($2::int[])';
      params.push(b.vendas.map(Number));
    }
    sql += ' order by venda_id';
    const cand = (await cx.query(sql, params)).rows;
    const total = c2(cand.reduce((t, r) => t + Number(r.saldo), 0));
    if (valor > total + 0.005) throw new Error('O valor passa do total a pagar (' + brl(total) + ').');
    const ac = await cx.query('insert into acertos_comissao (vendedor_id, valor, data, criado_por) values ($1, $2, $3, $4) returning id', [vendedorId, valor, data, g.s.id]);
    let resto = valor;
    for (const r of cand) {
      if (resto <= 0.004) break;
      const abate = c2(Math.min(resto, Number(r.saldo)));
      await cx.query('insert into acerto_itens (acerto_id, venda_id, valor) values ($1, $2, $3)', [ac.rows[0].id, r.venda_id, abate]);
      resto = c2(resto - abate);
    }
    await cx.query('commit');
    return Response.json({ ok: true });
  } catch (e) {
    await cx.query('rollback');
    return Response.json({ erro: e.message }, { status: 400 });
  } finally {
    cx.release();
  }
}
