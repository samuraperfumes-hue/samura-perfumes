import { q } from '../../../../lib/db';
import { exigir } from '../../../../lib/guard';
import { pool } from '../../../../lib/db';
import { garantirClientes, origemOk } from '../../../../lib/clientes';

export const dynamic = 'force-dynamic';

export async function PATCH(req, { params }) {
  const g = await exigir(false);
  if (g.erro) return g.erro;
  await garantirClientes(pool);
  const { id } = await params;
  const b = await req.json();
  const c = (await q('select vendedor_id from clientes where id = $1', [Number(id)])).rows[0];
  if (!c || (g.s.papel !== 'admin' && c.vendedor_id !== g.s.id)) return Response.json({ erro: 'Cliente não encontrado.' }, { status: 404 });
  if (b.acao === 'convite') {
    await q('update clientes set convite_em = now() where id = $1', [Number(id)]);
    await q("insert into mensagens_enviadas (cliente_id, tipo, enviado_por) values ($1, 'convite', $2)", [Number(id), g.s.id]);
    return Response.json({ ok: true });
  }
  const nome = String(b.nome || '').trim();
  if (!nome) return Response.json({ erro: 'Informe o nome.' }, { status: 400 });
  const dono = g.s.papel === 'admin' && b.vendedor_id ? Number(b.vendedor_id) : c.vendedor_id;
  await q('update clientes set nome = $1, telefone = $2, observacoes = $3, vendedor_id = $4, origem = $5, indicado_por = $6, indicado_tel = $7 where id = $8', [nome, String(b.telefone || '').trim() || null, String(b.observacoes || '').trim() || null, dono, origemOk(b.origem), String(b.indicado_por || '').trim() || null, String(b.indicado_tel || '').trim() || null, Number(id)]);
  return Response.json({ ok: true });
}

export async function DELETE(_req, { params }) {
  const g = await exigir(false);
  if (g.erro) return g.erro;
  const { id } = await params;
  const c = (await q('select vendedor_id from clientes where id = $1', [Number(id)])).rows[0];
  if (!c || (g.s.papel !== 'admin' && c.vendedor_id !== g.s.id)) return Response.json({ erro: 'Cliente não encontrado.' }, { status: 404 });
  const v = (await q('select count(*)::int as n from vendas where cliente_id = $1', [Number(id)])).rows[0].n;
  if (v > 0) return Response.json({ erro: 'Este cliente tem vendas registradas e não pode ser excluído.' }, { status: 400 });
  try {
    await q('delete from clientes where id = $1', [Number(id)]);
  } catch {
    return Response.json({ erro: 'Este cliente está ligado a outros registros e não pode ser excluído.' }, { status: 400 });
  }
  return Response.json({ ok: true });
}
