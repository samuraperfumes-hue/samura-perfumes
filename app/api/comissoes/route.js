import { q } from '../../../lib/db';
import { exigir } from '../../../lib/guard';

export const dynamic = 'force-dynamic';

export async function GET() {
  const g = await exigir(false);
  if (g.erro) return g.erro;
  const admin = g.s.papel === 'admin';
  const base = `select c.venda_id, v.codigo, v.data_venda, cl.nome as cliente, u.nome as vendedor, c.vendedor_id, v.comissao_tipo, v.comissao_taxa, c.comissao_valor, c.pago, c.saldo, c.estado
    from v_comissao_venda c join vendas v on v.id = c.venda_id join clientes cl on cl.id = v.cliente_id join usuarios u on u.id = c.vendedor_id`;
  const ab = `select a.id, a.vendedor_id, u.nome as vendedor, a.valor, a.data from acertos_comissao a join usuarios u on u.id = a.vendedor_id`;
  const [c, a] = admin
    ? await Promise.all([q(base + ' order by v.id desc'), q(ab + ' order by a.id desc limit 100')])
    : await Promise.all([q(base + ' where c.vendedor_id = $1 order by v.id desc', [g.s.id]), q(ab + ' where a.vendedor_id = $1 order by a.id desc limit 100', [g.s.id])]);
  return Response.json({ comissoes: c.rows, acertos: a.rows });
}
