import { pool } from '../../../lib/db';
import { garantirClientes } from '../../../lib/clientes';

export const dynamic = 'force-dynamic';

const dig = (s) => String(s || '').replace(/[^0-9]/g, '');
const limpa = (t) => { let d = dig(t); if (d.length > 11 && d.startsWith('55')) d = d.slice(2); return d; };
const formata = (d) => (d.length === 11 ? d.slice(0, 2) + ' ' + d.slice(2, 7) + '-' + d.slice(7) : d.slice(0, 2) + ' ' + d.slice(2, 6) + '-' + d.slice(6));
const erro = (m, s = 400) => Response.json({ erro: m }, { status: s });

// Público: quem fez o teste "Descubra sua fragrância" e deixou o WhatsApp vira cliente em potencial.
export async function POST(req) {
  let b;
  try { b = await req.json(); } catch { return erro('Dados inválidos.'); }
  if (b.site) return Response.json({ ok: true });
  const nome = String(b.nome || '').trim().slice(0, 80);
  const tel = limpa(b.telefone);
  const resultado = String(b.resultado || '').trim().slice(0, 160);
  const alternativas = String(b.alternativas || '').trim().slice(0, 160);
  if (!nome) return erro('Informe o seu nome.');
  if (tel.length < 10 || tel.length > 11) return erro('Confira o seu WhatsApp, com DDD.');
  const obs = 'Teste de fragrância: ' + (resultado || '-') + (alternativas ? '. Também combinam: ' + alternativas : '');

  await garantirClientes(pool);
  const n = (await pool.query("select count(*)::int as n from clientes where criado_em > now() - interval '1 hour' and observacoes like 'Teste de fragrância:%'")).rows[0].n;
  if (n >= 30) return erro('Recebemos muitos pedidos agora. Tente de novo mais tarde.', 429);
  const ja = (await pool.query("select id from clientes where regexp_replace(coalesce(telefone, ''), '[^0-9]', '', 'g') in ($1, $2) limit 1", [tel, '55' + tel])).rows[0];
  if (ja) return Response.json({ ok: true });
  const adm = (await pool.query("select id from usuarios where papel = 'admin' order by id limit 1")).rows[0];
  if (!adm) return erro('Indisponível no momento.', 503);
  await pool.query("insert into clientes (vendedor_id, nome, telefone, observacoes, criado_por, origem) values ($1, $2, $3, $4, $1, 'Outro')", [adm.id, nome, formata(tel), obs]);
  return Response.json({ ok: true });
}
