import { q } from '../../../lib/db';
import { exigir } from '../../../lib/guard';

export const dynamic = 'force-dynamic';

export async function GET() {
  const g = await exigir(false);
  if (g.erro) return g.erro;
  const base = `select i.id, i.venda_id, v.codigo, c.nome as cliente, c.telefone, u.nome as vendedor, v.vendedor_id, i.descricao, i.quantidade, i.status_entrega
    from venda_itens i join vendas v on v.id = i.venda_id join clientes c on c.id = v.cliente_id join usuarios u on u.id = v.vendedor_id
    where i.status_entrega <> 'entregue' and not v.cancelada`;
  const r = g.s.papel === 'admin'
    ? await q(base + ' order by i.descricao, v.id, i.id')
    : await q(base + ' and v.vendedor_id = $1 order by i.descricao, v.id, i.id', [g.s.id]);
  return Response.json(r.rows);
}

export async function POST(req) {
  const g = await exigir(false);
  if (g.erro) return g.erro;
  const b = await req.json();
  const ids = (b.ids || []).map(Number).filter(Boolean);
  if (!ids.length || !['pendente', 'envasado', 'entregue'].includes(b.status)) return Response.json({ erro: 'Pedido inválido.' }, { status: 400 });
  if (g.s.papel === 'admin') {
    await q('update venda_itens set status_entrega = $1 where id = any($2::int[])', [b.status, ids]);
  } else {
    if (b.status !== 'entregue') return Response.json({ erro: 'Acesso restrito ao administrador.' }, { status: 403 });
    await q('update venda_itens set status_entrega = $1 where id = any($2::int[]) and venda_id in (select id from vendas where vendedor_id = $3)', [b.status, ids, g.s.id]);
  }
  return Response.json({ ok: true });
}
