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

// Exclui um item sem compras.
export async function DELETE(req, { params }) {
  const g = await exigir(true);
  if (g.erro) return g.erro;
  const { id } = await params;
  const tem = (await pool.query('select 1 from compras_insumos where insumo_id = $1 limit 1', [Number(id)])).rows.length;
  if (tem) return Response.json({ erro: 'Este item tem compras lançadas. Renomeie-o ou exclua as compras antes.' }, { status: 400 });
  await pool.query('delete from insumos where id = $1', [Number(id)]);
  return Response.json({ ok: true });
}
