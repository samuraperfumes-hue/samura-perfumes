import { pool } from '../../../../lib/db';
import { exigir } from '../../../../lib/guard';

export const dynamic = 'force-dynamic';

// Renomeia um item. Se já existe outro item com o nome novo, junta as compras nele e remove o antigo.
export async function PATCH(req, { params }) {
  const g = await exigir(true);
  if (g.erro) return g.erro;
  const { id } = await params;
  const b = await req.json();
  const nome = String(b.nome || '').trim().slice(0, 120);
  if (!nome) return Response.json({ erro: 'Informe o nome.' }, { status: 400 });
  const cx = await pool.connect();
  try {
    await cx.query('begin');
    const atual = (await cx.query('select id, unidade from insumos where id = $1', [Number(id)])).rows[0];
    if (!atual) { await cx.query('rollback'); return Response.json({ erro: 'Item não encontrado.' }, { status: 404 }); }
    const outro = (await cx.query('select id, unidade from insumos where lower(nome) = lower($1) and id <> $2', [nome, atual.id])).rows[0];
    if (outro) {
      if (outro.unidade !== atual.unidade) { await cx.query('rollback'); return Response.json({ erro: 'O item "' + nome + '" já existe com outra medida (ml/unidade).' }, { status: 400 }); }
      await cx.query('update compras_insumos set insumo_id = $1 where insumo_id = $2', [outro.id, atual.id]);
      await cx.query('delete from insumos where id = $1', [atual.id]);
      await cx.query('commit');
      return Response.json({ ok: true, unido: true });
    }
    await cx.query('update insumos set nome = $1 where id = $2', [nome, atual.id]);
    await cx.query('commit');
    return Response.json({ ok: true });
  } catch (e) {
    await cx.query('rollback');
    throw e;
  } finally {
    cx.release();
  }
}

// Exclui um item. Se tiver compras, avisa quantas; com ?forcar=1 exclui o item e as compras dele.
export async function DELETE(req, { params }) {
  const g = await exigir(true);
  if (g.erro) return g.erro;
  const { id } = await params;
  const forcar = new URL(req.url).searchParams.get('forcar') === '1';
  const cx = await pool.connect();
  try {
    const cp = (await cx.query('select count(*)::int as n, coalesce(sum(valor_total), 0)::float as v from compras_insumos where insumo_id = $1', [Number(id)])).rows[0];
    if (cp.n > 0 && !forcar) {
      return Response.json({ erro: 'Este item tem ' + cp.n + ' compra(s) lan\u00e7ada(s).', compras: cp.n, valor: cp.v }, { status: 409 });
    }
    await cx.query('begin');
    const rec = (await cx.query("select to_regclass('receitas') as t")).rows[0].t;
    if (rec) await cx.query('delete from receitas where insumo_id = $1', [Number(id)]);
    await cx.query('delete from compras_insumos where insumo_id = $1', [Number(id)]);
    await cx.query('delete from insumos where id = $1', [Number(id)]);
    await cx.query('commit');
    return Response.json({ ok: true });
  } catch (e) {
    await cx.query('rollback');
    throw e;
  } finally {
    cx.release();
  }
}
