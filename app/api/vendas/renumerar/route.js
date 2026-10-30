import { pool } from '../../../../lib/db';
import { exigir } from '../../../../lib/guard';

export const dynamic = 'force-dynamic';

export async function POST() {
  const g = await exigir(true);
  if (g.erro) return g.erro;
  const cx = await pool.connect();
  try {
    await cx.query('begin');
    await cx.query(`update vendas set codigo = 'TMP-' || id`);
    await cx.query(`update vendas v set codigo = 'VND-' || lpad(x.n::text, 4, '0') from (select id, row_number() over (order by data_venda, id) as n from vendas) x where x.id = v.id`);
    const t = (await cx.query('select count(*)::int as n from vendas')).rows[0].n;
    await cx.query('commit');
    return Response.json({ ok: true, total: t });
  } catch (e) {
    await cx.query('rollback');
    return Response.json({ erro: e.message }, { status: 400 });
  } finally {
    cx.release();
  }
}
