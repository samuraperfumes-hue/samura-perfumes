import bcrypt from 'bcryptjs';
import { q } from '../../../../lib/db';
import { exigir } from '../../../../lib/guard';

export const dynamic = 'force-dynamic';

export async function PATCH(req, { params }) {
  const g = await exigir(true);
  if (g.erro) return g.erro;
  const { id } = await params;
  const b = await req.json();
  const sets = [];
  const vals = [];
  const add = (c, v) => { vals.push(v); sets.push(c + ' = $' + vals.length); };
  if (b.nome !== undefined) add('nome', String(b.nome).trim());
  if (b.comissao_tipo !== undefined) add('comissao_tipo', b.comissao_tipo === 'fixo' ? 'fixo' : 'percentual');
  if (b.comissao_valor !== undefined) {
    const v = Number(String(b.comissao_valor).replace(',', '.'));
    if (!(v >= 0)) return Response.json({ erro: 'Comissão inválida.' }, { status: 400 });
    add('comissao_valor', v);
  }
  if (b.ativo !== undefined) {
    if (Number(id) === g.s.id && !b.ativo) return Response.json({ erro: 'Você não pode desativar o próprio acesso.' }, { status: 400 });
    add('ativo', !!b.ativo);
  }
  if (b.senha) {
    if (String(b.senha).length < 8) return Response.json({ erro: 'A senha precisa ter pelo menos 8 caracteres.' }, { status: 400 });
    add('senha_hash', await bcrypt.hash(String(b.senha), 10));
  }
  if (!sets.length) return Response.json({ erro: 'Nada para alterar.' }, { status: 400 });
  vals.push(Number(id));
  await q('update usuarios set ' + sets.join(', ') + ' where id = $' + vals.length, vals);
  return Response.json({ ok: true });
}
