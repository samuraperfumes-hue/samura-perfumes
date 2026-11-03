import bcrypt from 'bcryptjs';
import { q } from '../../../lib/db';
import { exigir } from '../../../lib/guard';

export const dynamic = 'force-dynamic';

// Cada pessoa troca a própria senha, confirmando a senha atual.
export async function POST(req) {
  const g = await exigir(false);
  if (g.erro) return g.erro;
  const b = await req.json().catch(() => ({}));
  const atual = String(b.atual || '');
  const nova = String(b.nova || '');
  if (nova.length < 8) return Response.json({ erro: 'A nova senha precisa ter pelo menos 8 caracteres.' }, { status: 400 });
  if (nova === atual) return Response.json({ erro: 'A nova senha precisa ser diferente da atual.' }, { status: 400 });
  const u = (await q('select senha_hash from usuarios where id = $1 and ativo', [g.s.id])).rows[0];
  if (!u || !(await bcrypt.compare(atual, u.senha_hash))) return Response.json({ erro: 'A senha atual não confere.' }, { status: 400 });
  await q('update usuarios set senha_hash = $1 where id = $2', [await bcrypt.hash(nova, 10), g.s.id]);
  return Response.json({ ok: true });
}
