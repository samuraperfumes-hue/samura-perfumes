import { pool } from '../../../lib/db';
import { exigir } from '../../../lib/guard';
import { gerarCreditos, DISPONIVEL } from '../../../lib/clientes';

export const dynamic = 'force-dynamic';

// Descontos disponíveis de um cliente (usado na tela de Vendas).
export async function GET(req) {
  const g = await exigir(false);
  if (g.erro) return g.erro;
  const id = Number(new URL(req.url).searchParams.get('cliente_id'));
  if (!id) return Response.json([]);
  const c = (await pool.query('select vendedor_id from clientes where id = $1', [id])).rows[0];
  if (!c || (g.s.papel !== 'admin' && c.vendedor_id !== g.s.id)) return Response.json([]);
  await gerarCreditos(pool);
  const r = await pool.query(`select k.id, k.tipo, k.pct, k.validade, o.nome as origem_nome from creditos k left join clientes o on o.id = k.origem_cliente_id where k.cliente_id = $1 and ${DISPONIVEL} order by k.pct desc, k.validade nulls last`, [id]);
  return Response.json(r.rows);
}
