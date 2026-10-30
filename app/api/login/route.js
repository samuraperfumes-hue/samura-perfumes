import bcrypt from 'bcryptjs';
import { q } from '../../../lib/db';
import { criarSessao } from '../../../lib/session';

export const dynamic = 'force-dynamic';

const JANELA = "15 minutes";
const MAX_POR_USUARIO = 5;
const MAX_POR_IP = 30;

export async function POST(req) {
  const { login, senha } = await req.json();
  const lg = String(login || '').trim().toLowerCase().slice(0, 80);
  const ip = String((req.headers.get('x-forwarded-for') || '').split(',')[0] || 'sem-ip').trim().slice(0, 60);
  const kUser = 'u:' + lg + '|' + ip;
  const kIp = 'i:' + ip;

  await q('create table if not exists login_tentativas (id bigserial primary key, chave text not null, criado_em timestamptz not null default now())');
  await q('create index if not exists login_tentativas_chave on login_tentativas (chave, criado_em)');
  await q("delete from login_tentativas where criado_em < now() - interval '1 day'");

  const c = await q(
    `select (select count(*)::int from login_tentativas where chave = $1 and criado_em > now() - interval '${JANELA}') as u,
            (select count(*)::int from login_tentativas where chave = $2 and criado_em > now() - interval '${JANELA}') as i`,
    [kUser, kIp]
  );
  if (c.rows[0].u >= MAX_POR_USUARIO || c.rows[0].i >= MAX_POR_IP) {
    return Response.json({ erro: 'Muitas tentativas. Aguarde 15 minutos e tente novamente.' }, { status: 429 });
  }

  const r = await q('select id, nome, papel, senha_hash, ativo from usuarios where login = $1', [lg]);
  const u = r.rows[0];
  const ok = u && u.ativo && (await bcrypt.compare(String(senha || ''), u.senha_hash));
  if (!ok) {
    await q('insert into login_tentativas (chave) values ($1), ($2)', [kUser, kIp]);
    return Response.json({ erro: 'Usuario ou senha incorretos.' }, { status: 401 });
  }
  await q('delete from login_tentativas where chave = $1', [kUser]);
  await criarSessao(u);
  return Response.json({ ok: true });
}
