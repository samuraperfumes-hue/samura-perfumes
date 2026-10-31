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
    const itens = (b.itens || []).map((x) => ({ insumo_id: Number(x.insumo_id), ml: Number(String(x.ml).replace(',', '.')) })).filter((x) => x.insumo_id);
    if (itens.some((x) => !(x.ml > 0))) return Response.json({ erro: 'Informe os ml de cada item (maior que zero).' }, { status: 400 });
    if (new Set(itens.map((x) => x.insumo_id)).size !== itens.length) return Response.json({ erro: 'O mesmo item aparece duas vezes na receita.' }, { status: 400 });
    const total = itens.reduce((t, x) => t + x.ml, 0);
    const cx = await pool.connect();
    try {
      await cx.query('begin');
      await cx.query('delete from receitas where fragrancia_id = $1', [fid]);
      for (const x of itens) await cx.query('insert into receitas (fragrancia_id, insumo_id, pct, ml) values ($1, $2, $3, $4)', [fid, x.insumo_id, Math.min(100, (x.ml / total) * 100), x.ml]);
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
