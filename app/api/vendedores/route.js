import bcrypt from 'bcryptjs';
import { q } from '../../../lib/db';
import { exigir } from '../../../lib/guard';

export const dynamic = 'force-dynamic';

export async function GET() {
  const g = await exigir(true);
  if (g.erro) return g.erro;
  const r = await q('select id, nome, login, papel, ativo, comissao_tipo, comissao_valor from usuarios order by papel, nome');
  return Response.json(r.rows);
}

export async function POST(req) {
  const g = await exigir(true);
  if (g.erro) return g.erro;
  const b = await req.json();
  const nome = String(b.nome || '').trim();
  const login = String(b.login || '').trim().toLowerCase();
  const senha = String(b.senha || '');
  const tipo = b.comissao_tipo === 'fixo' ? 'fixo' : 'percentual';
  const valor = Number(String(b.comissao_valor).replace(',', '.'));
  if (!nome || !login || senha.length < 8 || !(valor >= 0)) {
    return Response.json({ erro: 'Preencha nome, usuário, senha (mínimo 8 caracteres) e comissão.' }, { status: 400 });
  }
  try {
    const r = await q(`insert into usuarios (nome, login, senha_hash, papel, comissao_tipo, comissao_valor) values ($1, $2, $3, 'vendedor', $4, $5) returning id`, [nome, login, await bcrypt.hash(senha, 10), tipo, valor]);
    return Response.json({ id: r.rows[0].id });
  } catch (e) {
    if (e.code === '23505') return Response.json({ erro: 'Esse usuário já existe.' }, { status: 409 });
    throw e;
  }
}
