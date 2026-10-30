import { pool } from '../../../../lib/db';
import { exigir } from '../../../../lib/guard';

export const dynamic = 'force-dynamic';

export async function DELETE(req, { params }) {
  const g = await exigir(true);
  if (g.erro) return g.erro;
  const { id } = await params;
  await pool.query('delete from compras_insumos where id = $1', [Number(id)]);
  return Response.json({ ok: true });
}
