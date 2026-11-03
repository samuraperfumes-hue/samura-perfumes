import { pool } from '../../../lib/db';
import { garantirClientes } from '../../../lib/clientes';

export const dynamic = 'force-dynamic';

const dig = (s) => String(s || '').replace(/[^0-9]/g, '');
const limpa = (t) => { let d = dig(t); if (d.length > 11 && d.startsWith('55')) d = d.slice(2); return d; };
const formata = (d) => (d.length === 11 ? d.slice(0, 2) + ' ' + d.slice(2, 7) + '-' + d.slice(7) : d.slice(0, 2) + ' ' + d.slice(2, 6) + '-' + d.slice(6));
const erro = (m, s = 400) => Response.json({ erro: m }, { status: s });

// Formulário público "Indique um amigo" da página de fragrâncias.
export async function POST(req) {
  let b;
  try { b = await req.json(); } catch { return erro('Dados inválidos.'); }
  if (b.site) return Response.json({ ok: true });
  const quem = String(b.quem || '').trim().slice(0, 80);
  const quemTel = limpa(b.quem_tel);
  const nome = String(b.nome || '').trim().slice(0, 80);
  const tel = limpa(b.telefone);
  if (!quem || !nome) return erro('Preencha o seu nome e o nome do amigo.');
  if (tel.length < 10 || tel.length > 11) return erro('Confira o WhatsApp do amigo, com DDD.');
  if (quemTel.length < 10 || quemTel.length > 11) return erro('Confira o seu WhatsApp, com DDD.');
  if (quemTel === tel) return erro('O WhatsApp do amigo precisa ser diferente do seu.');
  if (!b.aviso) return erro('Confirme que avisou o seu amigo.');

  await garantirClientes(pool);
  const n = (await pool.query("select count(*)::int as n from clientes where indicado_em > now() - interval '1 hour'")).rows[0].n;
  if (n >= 20) return erro('Recebemos muitas indicações agora. Tente de novo mais tarde.', 429);
  const ja = (await pool.query("select id from clientes where regexp_replace(coalesce(telefone, ''), '[^0-9]', '', 'g') in ($1, $2) limit 1", [tel, '55' + tel])).rows[0];
  if (ja) return Response.json({ ok: true });
  const adm = (await pool.query("select id from usuarios where papel = 'admin' order by id limit 1")).rows[0];
  if (!adm) return erro('Indicação indisponível no momento.', 503);
  await pool.query(
    "insert into clientes (vendedor_id, nome, telefone, observacoes, criado_por, origem, indicado_por, indicado_tel, indicado_em) values ($1, $2, $3, null, $1, 'Indicação', $4, $5, now())",
    [adm.id, nome, formata(tel), quem, formata(quemTel)]
  );
  return Response.json({ ok: true });
}
