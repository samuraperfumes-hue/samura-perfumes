import { pool } from '../../../lib/db';
import { exigir } from '../../../lib/guard';
import { garantirClientes, TIPOS_MSG } from '../../../lib/clientes';

export const dynamic = 'force-dynamic';

// Registra que uma mensagem de WhatsApp foi aberta para envio a um cliente.
export async function POST(req) {
  const g = await exigir(false);
  if (g.erro) return g.erro;
  const b = await req.json().catch(() => ({}));
  const id = Number(b.cliente_id);
  const tipo = String(b.tipo || '');
  if (!id || !TIPOS_MSG.includes(tipo)) return Response.json({ erro: 'Dados inválidos.' }, { status: 400 });
  await garantirClientes(pool);
  const c = (await pool.query('select vendedor_id from clientes where id = $1', [id])).rows[0];
  if (!c || (g.s.papel !== 'admin' && c.vendedor_id !== g.s.id)) return Response.json({ erro: 'Cliente não encontrado.' }, { status: 404 });
  await pool.query('insert into mensagens_enviadas (cliente_id, tipo, venda_id, enviado_por) values ($1, $2, $3, $4)', [id, tipo, Number(b.venda_id) || null, g.s.id]);
  if (tipo === 'convite') await pool.query('update clientes set convite_em = now() where id = $1', [id]);
  return Response.json({ ok: true });
}
