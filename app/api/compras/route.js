import { pool } from '../../../lib/db';
import { exigir } from '../../../lib/guard';
import { garantir } from '../../../lib/custos';

export const dynamic = 'force-dynamic';

export async function GET() {
  const g = await exigir(true);
  if (g.erro) return g.erro;
  await garantir(pool);
  const r = await pool.query(`select c.id, c.data, c.quantidade::float as quantidade, c.valor_total::float as valor_total,
      (c.valor_total / c.quantidade)::float as custo_unit, c.fornecedor, c.obs, i.nome, i.unidade
    from compras_insumos c join insumos i on i.id = c.insumo_id order by c.data desc, c.id desc limit 150`);
  return Response.json({ compras: r.rows });
}

export async function POST(req) {
  const g = await exigir(true);
  if (g.erro) return g.erro;
  await garantir(pool);
  const b = await req.json();
  const itens = Array.isArray(b.itens) ? b.itens : [b];
  const cx = await pool.connect();
  try {
    await cx.query('begin');
    for (const it of itens) {
      const qtd = Number(String(it.quantidade).replace(',', '.'));
      const val = Number(String(it.valor_total).replace(',', '.'));
      const ins = Number(it.insumo_id);
      const data = /^\d{4}-\d{2}-\d{2}$/.test(String(it.data || b.data || '')) ? (it.data || b.data) : null;
      if (!ins) throw new Error('Escolha o item comprado.');
      if (!(qtd > 0)) throw new Error('Informe a quantidade comprada.');
      if (!(val >= 0) || isNaN(val)) throw new Error('Informe o valor pago.');
      if (!data) throw new Error('Informe a data da compra.');
      const ok = await cx.query('select 1 from insumos where id = $1', [ins]);
      if (!ok.rows.length) throw new Error('Item não encontrado.');
      await cx.query('insert into compras_insumos (insumo_id, data, quantidade, valor_total, fornecedor, obs, criado_por) values ($1, $2, $3, $4, $5, $6, $7)',
        [ins, data, qtd, val, String(it.fornecedor || b.fornecedor || '').trim().slice(0, 120) || null, String(it.obs || '').trim().slice(0, 300) || null, g.s.id]);
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
