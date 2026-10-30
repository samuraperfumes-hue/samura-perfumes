import { q } from '../../../lib/db';
import { exigir } from '../../../lib/guard';

export const dynamic = 'force-dynamic';

export async function GET() {
  const g = await exigir(false);
  if (g.erro) return g.erro;
  await q(`insert into pagamentos (venda_id, valor, situacao) select v.id, v.total_liquido, 'agendado' from vendas v where not v.cancelada and v.total_liquido > 0 and not exists (select 1 from pagamentos p where p.venda_id = v.id)`);
  const base = `select p.id, p.valor, p.data_prevista, p.data_recebimento, p.situacao, p.motivo_contestacao, v.id as venda_id, v.codigo, c.nome as cliente, c.telefone, u.nome as vendedor, v.vendedor_id
    from pagamentos p join vendas v on v.id = p.venda_id join clientes c on c.id = v.cliente_id join usuarios u on u.id = v.vendedor_id
    where p.situacao in ('agendado', 'informado') and not v.cancelada`;
  const r = g.s.papel === 'admin'
    ? await q(base + ' order by p.data_prevista nulls last, p.id')
    : await q(base + ' and v.vendedor_id = $1 order by p.data_prevista nulls last, p.id', [g.s.id]);
  return Response.json(r.rows);
}
