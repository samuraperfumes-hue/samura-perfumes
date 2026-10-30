import { pool } from '../../../lib/db';
import { q } from '../../../lib/db';
import { exigir } from '../../../lib/guard';
import { remover } from '../../../lib/catalogo';

export const dynamic = 'force-dynamic';

export async function GET() {
  const g = await exigir(false);
  if (g.erro) return g.erro;
  const r = await q('select a.id, f.nome as fragrancia, a.tipo, a.volume, a.preco, a.ativa, coalesce((select sum(i.quantidade) from venda_itens i where i.apresentacao_id = a.id), 0)::int as vendidos from apresentacoes a join fragrancias f on f.id = a.fragrancia_id order by f.nome, a.tipo, a.volume');
  return Response.json(r.rows);
}

export async function POST(req) {
  const g = await exigir(true);
  if (g.erro) return g.erro;
  const b = await req.json();
  if (b.acao === 'excluir') {
    const cx = await pool.connect();
    try {
      await cx.query('begin');
      let ex = 0;
      let de = 0;
      for (const id of (b.ids || []).map(Number).filter(Boolean)) {
        const r = await remover(cx, id);
        if (r === 'excluido') ex++; else de++;
      }
      await cx.query('commit');
      return Response.json({ excluidos: ex, desativados: de });
    } catch (e) {
      await cx.query('rollback');
      return Response.json({ erro: e.message }, { status: 400 });
    } finally {
      cx.release();
    }
  }
  let salvos = 0;
  const erros = [];
  for (const it of b.itens || []) {
    const nome = String(it.fragrancia || '').trim();
    const tipo = String(it.tipo || 'Perfume').trim() || 'Perfume';
    const volume = String(it.volume || '50 ml').trim() || '50 ml';
    const preco = Number(String(it.preco).replace(',', '.'));
    if (!nome || !(preco >= 0)) { erros.push(nome || '(linha vazia)'); continue; }
    const f = await q('insert into fragrancias (nome) values ($1) on conflict (nome) do update set nome = excluded.nome returning id', [nome]);
    await q('insert into apresentacoes (fragrancia_id, tipo, volume, preco) values ($1, $2, $3, $4) on conflict (fragrancia_id, tipo, volume) do update set preco = excluded.preco, ativa = true', [f.rows[0].id, tipo, volume, preco]);
    salvos++;
  }
  return Response.json({ salvos, erros });
}
