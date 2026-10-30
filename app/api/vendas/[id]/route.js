import { pool, q } from '../../../../lib/db';
import { exigir } from '../../../../lib/guard';
import { garantir } from '../../../../lib/estoque';

export const dynamic = 'force-dynamic';

export async function PATCH(req, { params }) {
  const g = await exigir(true);
  if (g.erro) return g.erro;
  const { id } = await params;
  const b = await req.json();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(b.data_venda || '')) return Response.json({ erro: 'Data inválida.' }, { status: 400 });
  const r = await q('update vendas set data_venda = $1 where id = $2 returning id', [b.data_venda, Number(id)]);
  if (!r.rowCount) return Response.json({ erro: 'Venda não encontrada.' }, { status: 404 });
  return Response.json({ ok: true });
}

export async function DELETE(_req, { params }) {
  const g = await exigir(true);
  if (g.erro) return g.erro;
  const { id } = await params;
  const cx = await pool.connect();
  try {
    await garantir(cx);
    await cx.query('begin');
    const v = (await cx.query('select id, cancelada from vendas where id = $1 for update', [Number(id)])).rows[0];
    if (!v) throw new Error('Venda não encontrada.');
    const rec = (await cx.query(`select count(*)::int as n from pagamentos where venda_id = $1 and situacao = 'recebido'`, [v.id])).rows[0].n;
    if (rec > 0) throw new Error('Esta venda tem pagamento recebido. Estorne o recebimento antes de excluir.');
    const com = (await cx.query('select count(*)::int as n from acerto_itens where venda_id = $1', [v.id])).rows[0].n;
    if (com > 0) throw new Error('A comissão desta venda já foi paga em um acerto, então ela não pode ser excluída.');
    if (!v.cancelada) {
      await cx.query(`insert into movimentos_estoque (local_id, apresentacao_id, quantidade, tipo, obs, criado_por) select m.local_id, m.apresentacao_id, -m.quantidade, 'cancelamento', 'Venda excluída', $2 from movimentos_estoque m join venda_itens i on i.id = m.venda_item_id where i.venda_id = $1 and m.tipo = 'venda'`, [v.id, g.s.id]);
    }
    await cx.query('update movimentos_estoque set venda_item_id = null where venda_item_id in (select id from venda_itens where venda_id = $1)', [v.id]);
    await cx.query('delete from vendas where id = $1', [v.id]);
    await cx.query('commit');
    return Response.json({ ok: true });
  } catch (e) {
    await cx.query('rollback');
    return Response.json({ erro: e.message }, { status: 400 });
  } finally {
    cx.release();
  }
}
