import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { q } from '../../../lib/db';
import { criarSessao } from '../../../lib/session';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  const { nome, login, senha } = await req.json();
  if (!nome || !login || !senha || String(senha).length < 8) {
    return Response.json({ erro: 'Preencha todos os campos. A senha precisa ter pelo menos 8 caracteres.' }, { status: 400 });
  }
  const existe = await q("select to_regclass('public.usuarios') as t");
  if (!existe.rows[0].t) {
    const sql = fs.readFileSync(path.join(process.cwd(), 'schema.sql'), 'utf8');
    await q(sql);
  }
  const c = await q('select count(*)::int as n from usuarios');
  if (c.rows[0].n > 0) {
    return Response.json({ erro: 'O sistema ja foi configurado.' }, { status: 403 });
  }
  const hash = await bcrypt.hash(String(senha), 10);
  const r = await q(
    "insert into usuarios (nome, login, senha_hash, papel, comissao_tipo, comissao_valor) values ($1, $2, $3, 'admin', 'percentual', 0) returning id, nome, papel",
    [String(nome).trim(), String(login).trim().toLowerCase(), hash]
  );
  await criarSessao(r.rows[0]);
  return Response.json({ ok: true });
}
