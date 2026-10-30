import { pool } from '../../../lib/db';
import { exigir } from '../../../lib/guard';
import { garantir, sincronizar, CATEGORIAS } from '../../../lib/custos';

export const dynamic = 'force-dynamic';

export async function GET() {
  const g = await exigir(true);
  if (g.erro) return g.erro;
  await garantir(pool);
  if ((await pool.query("select 1 from insumos where nome = 'Válvula'")).rows.length === 0) await sincronizar(pool);
  const r = await pool.query(`select i.id, i.nome, i.categoria, i.unidade, i.ativo,
      coalesce(sum(c.quantidade), 0)::float as qtd_comprada,
      coalesce(sum(c.valor_total), 0)::float as gasto,
      case when coalesce(sum(c.quantidade), 0) > 0 then (sum(c.valor_total) / sum(c.quantidade))::float end as custo_medio,
      (select (c2.valor_total / c2.quantidade)::float from compras_insumos c2 where c2.insumo_id = i.id order by c2.data desc, c2.id desc limit 1) as ultimo_custo,
      max(c.data) as ultima_compra
    from insumos i left join compras_insumos c on c.insumo_id = i.id
    group by i.id order by i.categoria, i.nome`);
  return Response.json({ insumos: r.rows, categorias: CATEGORIAS });
}

export async function POST(req) {
  const g = await exigir(true);
  if (g.erro) return g.erro;
  await garantir(pool);
  const b = await req.json();
  if (b.acao === 'sincronizar') return Response.json({ ok: true, novos: await sincronizar(pool) });
  const nome = String(b.nome || '').trim().slice(0, 120);
  const cat = CATEGORIAS.some((c) => c[0] === b.categoria) ? b.categoria : 'outro';
  const un = b.unidade === 'ml' ? 'ml' : 'un';
  if (!nome) return Response.json({ erro: 'Informe o nome do item.' }, { status: 400 });
  try {
    const r = await pool.query('insert into insumos (nome, categoria, unidade) values ($1, $2, $3) returning id', [nome, cat, un]);
    return Response.json({ ok: true, id: r.rows[0].id });
  } catch (e) {
    if (e.code === '23505') {
      const ex = (await pool.query('select id from insumos where lower(nome) = lower($1)', [nome])).rows[0];
      if (b.reaproveitar && ex) return Response.json({ ok: true, id: ex.id, existente: true });
      return Response.json({ erro: 'Já existe um item com esse nome.' }, { status: 400 });
    }
    throw e;
  }
}
