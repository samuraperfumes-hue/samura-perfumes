import { pool } from '../../../../../lib/db';
import { exigir } from '../../../../../lib/guard';
import { garantir } from '../../../../../lib/estoque';
import { garantirClientes } from '../../../../../lib/clientes';

export const dynamic = 'force-dynamic';

export async function POST(req, { params }) {
  const g = await exigir(true);
  if (g.erro) return g.erro;
  const { id } = await params;
  const b = await req.json().catch(() => ({}));
  const cx = await pool.connect();
  try {
    await garantir(cx);
    await garantirClientes(cx);
    await cx.query('begin');
    const v = (await cx.query('select id, cancelada from vendas where id = $1 for update', [Number(id)])).rows[0];
    if (!v) throw new Error('Venda não encontrada.');
    if (v.cancelada) throw new Error('Esta venda já está cancelada.');
    const rec = (await cx.query(`select count(*)::int as n from pagamentos where venda_id = $1 and situacao = 'recebido'`, [v.id])).rows[0].n;
    if (rec > 0) throw new Error('Esta venda tem pagamento já recebido. Estorne o recebimento na tela de pagamentos antes de cancelar.');
    const paga = Number((await cx.query('select coalesce(sum(valor), 0) as s from acerto_itens where venda_id = $1', [v.id])).rows[0].s);
    const motivo = String(b.motivo || '').trim() || 'sem motivo informado';
    await cx.query(`update vendas set cancelada = true, observacoes = coalesce(observacoes || ' | ', '') || 'CANCELADA: ' || $2::text where id = $1`, [v.id, motivo]);
    await cx.query(`insert into movimentos_estoque (local_id, apresentacao_id, quantidade, tipo, venda_item_id, obs, criado_por) select m.local_id, m.apresentacao_id, -m.quantidade, 'cancelamento', m.venda_item_id, 'Venda cancelada', $2 from movimentos_estoque m join venda_itens i on i.id = m.venda_item_id where i.venda_id = $1 and m.tipo = 'venda'`, [v.id, g.s.id]);
    await cx.query('update creditos set usado_venda_id = null, usado_em = null where usado_venda_id = $1', [v.id]);
    await cx.query('commit');
    return Response.json({ ok: true, comissaoPaga: paga });
  } catch (e) {
    await cx.query('rollback');
    return Response.json({ erro: e.message }, { status: 400 });
  } finally {
    cx.release();
  }
}
