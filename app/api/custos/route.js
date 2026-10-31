import { pool } from '../../../lib/db';
import { exigir } from '../../../lib/guard';
import { garantir, calcular } from '../../../lib/receitas';

export const dynamic = 'force-dynamic';

export async function GET() {
  const g = await exigir(true);
  if (g.erro) return g.erro;
  return Response.json(await calcular(pool));
}

export async function POST(req) {
  const g = await exigir(true);
  if (g.erro) return g.erro;
  await garantir(pool);
  const b = await req.json();
  if (b.acao === 'config') {
    const rot = Number(String(b.rotulo_padrao).replace(',', '.'));
    const sac = Number(String(b.sacola_padrao).replace(',', '.'));
    if (!(rot >= 0) || !(sac >= 0)) return Response.json({ erro: 'Informe valores válidos para rótulo e sacola.' }, { status: 400 });
    const pares = [['valvula_separada', b.valvula_separada ? '1' : '0'], ['rotulo_padrao', String(rot)], ['sacola_padrao', String(sac)]];
    for (const [k, v] of pares) await pool.query('insert into config_custos (chave, valor) values ($1, $2) on conflict (chave) do update set valor = excluded.valor', [k, v]);
    return Response.json({ ok: true });
  }
  if (b.acao === 'receita') {
    const fid = Number(b.fragrancia_id);
    const itens = (b.itens || []).map((x) => ({ insumo_id: Number(x.insumo_id), pct: Number(String(x.pct).replace(',', '.')) })).filter((x) => x.insumo_id);
    if (itens.some((x) => !(x.pct > 0 && x.pct <= 100))) return Response.json({ erro: 'Cada porcentagem precisa estar entre 0 e 100.' }, { status: 400 });
    if (new Set(itens.map((x) => x.insumo_id)).size !== itens.length) return Response.json({ erro: 'O mesmo item aparece duas vezes na receita.' }, { status: 400 });
    if (itens.reduce((t, x) => t + x.pct, 0) > 100.0001) return Response.json({ erro: 'A soma das porcentagens passa de 100%.' }, { status: 400 });
    const cx = await pool.connect();
    try {
      await cx.query('begin');
      await cx.query('delete from receitas where fragrancia_id = $1', [fid]);
      for (const x of itens) await cx.query('insert into receitas (fragrancia_id, insumo_id, pct) values ($1, $2, $3)', [fid, x.insumo_id, x.pct]);
      await cx.query('commit');
    } catch (e) {
      await cx.query('rollback');
      throw e;
    } finally {
      cx.release();
    }
    return Response.json({ ok: true });
  }
  return Response.json({ erro: 'Ação inválida.' }, { status: 400 });
}
