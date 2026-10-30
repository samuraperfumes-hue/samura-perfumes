import { pool } from '../../../lib/db';
import { exigir } from '../../../lib/guard';
import { receber } from '../../../lib/pagamentos';

export const dynamic = 'force-dynamic';

const num = (v) => Number(String(v).replace(',', '.'));
const c2 = (v) => Math.round(Number(v) * 100) / 100;
const brl = (v) => 'R$ ' + Number(v).toFixed(2).replace('.', ',');

export async function POST(req) {
  const g = await exigir(true);
  if (g.erro) return g.erro;
  const b = await req.json();
  const itens = (b.itens || []).map((i) => ({ id: Number(i.id), valor: c2(num(i.valor)) }));
  const valor = c2(num(b.valor));
  const vendedorId = Number(b.vendedor_id);
  if (!itens.length || !(valor > 0) || itens.some((i) => !(i.valor > 0))) return Response.json({ erro: 'Marque os pagamentos e informe o valor recebido.' }, { status: 400 });
  const soma = c2(itens.reduce((t, i) => t + i.valor, 0));
  if (Math.abs(soma - valor) > 0.005) return Response.json({ erro: 'A soma dos pagamentos marcados (' + brl(soma) + ') não bate com o valor recebido (' + brl(valor) + '). Diferença de ' + brl(Math.abs(soma - valor)) + '.' }, { status: 400 });
  const hoje = /^\d{4}-\d{2}-\d{2}$/.test(b.data || '') ? b.data : new Date().toISOString().slice(0, 10);
  const cx = await pool.connect();
  try {
    await cx.query('begin');
    const rep = await cx.query('insert into repasses (vendedor_id, valor, data, criado_por) values ($1, $2, $3, $4) returning id', [vendedorId, valor, hoje, g.s.id]);
    for (const i of itens) {
      const p = (await cx.query('select p.situacao, p.data_recebimento, v.vendedor_id from pagamentos p join vendas v on v.id = p.venda_id where p.id = $1', [i.id])).rows[0];
      if (!p || p.situacao !== 'informado' || p.vendedor_id !== vendedorId) throw new Error('Um dos pagamentos marcados não está informado por este vendedor.');
      const dia = p.data_recebimento ? new Date(p.data_recebimento).toISOString().slice(0, 10) : hoje;
      await receber(cx, i.id, i.valor, dia, g.s.id, rep.rows[0].id);
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
