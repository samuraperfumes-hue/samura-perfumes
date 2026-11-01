import { pool } from '../../../lib/db';
import { exigir } from '../../../lib/guard';
import { lerConfigGeral } from '../../../lib/config';

export const dynamic = 'force-dynamic';

export async function GET() {
  const g = await exigir(false);
  if (g.erro) return g.erro;
  return Response.json(await lerConfigGeral(pool));
}

export async function POST(req) {
  const g = await exigir(true);
  if (g.erro) return g.erro;
  const b = await req.json();
  let zap = String(b.whatsapp || '').replace(/[^0-9]/g, '');
  if (zap.length === 10 || zap.length === 11) zap = '55' + zap;
  if (!/^55\d{10,11}$/.test(zap)) return Response.json({ erro: 'WhatsApp inválido. Digite com DDD, por exemplo 21 96414-7761.' }, { status: 400 });
  const pix = String(b.pix || '').trim().slice(0, 80);
  if (!pix) return Response.json({ erro: 'Informe a chave Pix.' }, { status: 400 });
  await lerConfigGeral(pool);
  for (const [k, v] of [['whatsapp', zap], ['pix', pix]]) {
    await pool.query('insert into config_geral (chave, valor) values ($1, $2) on conflict (chave) do update set valor = excluded.valor', [k, v]);
  }
  return Response.json({ ok: true, whatsapp: zap, pix });
}
