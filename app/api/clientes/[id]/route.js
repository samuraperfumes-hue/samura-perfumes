import { q } from '../../../../lib/db';
import { exigir } from '../../../../lib/guard';

export const dynamic = 'force-dynamic';

export async function PATCH(req, { params }) {
  const g = await exigir(false);
  if (g.erro) return g.erro;
  const { id } = await params;
  const b = await req.json();
  const c = (await q('select vendedor_id from clientes where id = $1', [Number(id)])).rows[0];
  if (!c || (g.s.papel !== 'admin' && c.vendedor_id !== g.s.id)) return Response.json({ erro: 'Cliente não encontrado.' }, { status: 404 });
  const nome = String(b.nome || '').trim();
  if (!nome) return Response.json({ erro: 'Informe o nome.' }, { status: 400 });
  const dono = g.s.papel === 'admin' && b.vendedor_id ? Number(b.vendedor_id) : c.vendedor_id;
  await q('update clientes set nome = $1, telefone = $2, observacoes = $3, vendedor_id = $4 where id = $5', [nome, String(b.telefone || '').trim() || null, String(b.observacoes || '').trim() || null, dono, Number(id)]);
  return Response.json({ ok: true });
}
