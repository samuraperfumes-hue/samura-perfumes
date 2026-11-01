import { q } from '../../../lib/db';
import { exigir } from '../../../lib/guard';

export const dynamic = 'force-dynamic';

const dig = (s) => String(s || '').replace(/[^0-9]/g, '');

export async function GET() {
  const g = await exigir(false);
  if (g.erro) return g.erro;
  const base = "select c.id, c.nome, c.telefone, c.observacoes, c.vendedor_id, u.nome as vendedor, (select max(v.data_venda) from vendas v where v.cliente_id = c.id and not v.cancelada) as ultima_compra, (select count(*)::int from vendas v where v.cliente_id = c.id and not v.cancelada) as compras from clientes c join usuarios u on u.id = c.vendedor_id";
  const r = g.s.papel === 'admin'
    ? await q(base + ' order by c.nome')
    : await q(base + ' where c.vendedor_id = $1 order by c.nome', [g.s.id]);
  return Response.json(r.rows);
}

export async function POST(req) {
  const g = await exigir(false);
  if (g.erro) return g.erro;
  const b = await req.json();
  const nome = String(b.nome || '').trim();
  if (!nome) return Response.json({ erro: 'Informe o nome do cliente.' }, { status: 400 });
  const dono = g.s.papel === 'admin' ? Number(b.vendedor_id || g.s.id) : g.s.id;
  const fone = String(b.telefone || '').trim();
  if (!b.forcar) {
    const todos = (await q('select nome, telefone from clientes where vendedor_id = $1', [dono])).rows;
    const igual = todos.find((c) => c.nome.trim().toLowerCase() === nome.toLowerCase() || (dig(fone).length >= 8 && dig(c.telefone) === dig(fone)));
    if (igual) return Response.json({ erro: 'Já existe um cliente parecido nesta carteira: ' + igual.nome + '.', duplicado: true }, { status: 409 });
  }
  const r = await q('insert into clientes (vendedor_id, nome, telefone, observacoes, criado_por) values ($1, $2, $3, $4, $5) returning id', [dono, nome, fone || null, String(b.observacoes || '').trim() || null, g.s.id]);
  return Response.json({ id: r.rows[0].id });
}
