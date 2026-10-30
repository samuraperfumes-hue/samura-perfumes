import { pool } from '../../../lib/db';
import { exigir } from '../../../lib/guard';
import { garantir, chaveEq } from '../../../lib/custos';

export const dynamic = 'force-dynamic';

export async function GET() {
  const g = await exigir(true);
  if (g.erro) return g.erro;
  await garantir(pool);
  const r = await pool.query('select chave, origem, nome_real from equivalencias order by nome_real');
  return Response.json({ equivalencias: r.rows });
}

export async function POST(req) {
  const g = await exigir(true);
  if (g.erro) return g.erro;
  await garantir(pool);
  const b = await req.json();
  const origem = String(b.origem || '').trim().slice(0, 150);
  const real = String(b.nome_real || '').trim().slice(0, 150);
  const chave = chaveEq(origem);
  if (!chave || !real) return Response.json({ erro: 'Informe o nome do fornecedor e a fragrância real.' }, { status: 400 });
  await pool.query(`insert into equivalencias (chave, origem, nome_real) values ($1, $2, $3)
    on conflict (chave) do update set origem = excluded.origem, nome_real = excluded.nome_real`, [chave, origem, real]);
  return Response.json({ ok: true });
}

export async function DELETE(req) {
  const g = await exigir(true);
  if (g.erro) return g.erro;
  const chave = new URL(req.url).searchParams.get('chave');
  await pool.query('delete from equivalencias where chave = $1', [chave]);
  return Response.json({ ok: true });
}
