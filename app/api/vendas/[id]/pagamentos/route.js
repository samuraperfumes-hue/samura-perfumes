import { pool, q } from '../../../../../lib/db';
import { exigir } from '../../../../../lib/guard';
import { receber } from '../../../../../lib/pagamentos';

export const dynamic = 'force-dynamic';

const c2 = (v) => Math.round(Number(v) * 100) / 100;
const dt = (d) => (/^\d{4}-\d{2}-\d{2}$/.test(d || '') ? d : null);

async function acesso(g, id) {
  const v = (await q('select id, vendedor_id, total_liquido from vendas where id = $1 and not cancelada', [Number(id)])).rows[0];
  if (!v || (g.s.papel !== 'admin' && v.vendedor_id !== g.s.id)) return null;
  return v;
}

export async function GET(_req, { params }) {
  const g = await exigir(false);
  if (g.erro) return g.erro;
  const { id } = await params;
  const v = await acesso(g, id);
  if (!v) return Response.json({ erro: 'Venda não encontrada.' }, { status: 404 });
  const r = await q('select id, valor, data_prevista, data_recebimento, forma, situacao, motivo_contestacao from pagamentos where venda_id = $1 order by data_prevista nulls last, id', [v.id]);
  return Response.json({ total: v.total_liquido, pagamentos: r.rows });
}

export async function POST(req, { params }) {
  const g = await exigir(false);
  if (g.erro) return g.erro;
  const { id } = await params;
  const v = await acesso(g, id);
  if (!v) return Response.json({ erro: 'Venda não encontrada.' }, { status: 404 });
  const b = await req.json();
  const hoje = dt(b.data) || new Date().toISOString().slice(0, 10);
  const soma = Number((await q('select coalesce(sum(valor), 0) as s from pagamentos where venda_id = $1', [v.id])).rows[0].s);
  const livre = c2(Number(v.total_liquido) - soma);
  let parcelas;
  if (b.avista) parcelas = livre > 0 ? [{ valor: livre, data_prevista: hoje }] : [];
  else parcelas = (b.parcelas || []).map((p) => ({ valor: c2(p.valor), data_prevista: dt(p.data_prevista) }));
  if (!parcelas.length || parcelas.some((p) => !(p.valor > 0) || !p.data_prevista)) return Response.json({ erro: 'Parcelas inválidas ou nada a lançar.' }, { status: 400 });
  if (c2(parcelas.reduce((t, p) => t + p.valor, 0)) > livre + 0.005) return Response.json({ erro: 'As parcelas passam do total da venda.' }, { status: 400 });
  const cx = await pool.connect();
  try {
    await cx.query('begin');
    for (const p of parcelas) {
      const ins = await cx.query(`insert into pagamentos (venda_id, valor, data_prevista, data_original, situacao) values ($1, $2, $3, $3, 'agendado') returning id`, [v.id, p.valor, p.data_prevista]);
      if (b.avista) {
        if (g.s.papel === 'admin') await receber(cx, ins.rows[0].id, p.valor, hoje, g.s.id, null);
        else await cx.query(`update pagamentos set situacao = 'informado', informado_por = $1, informado_em = now(), data_recebimento = $2 where id = $3`, [g.s.id, hoje, ins.rows[0].id]);
      }
    }
    await cx.query('commit');
    return Response.json({ ok: true });
  } catch (e) {
    await cx.query('rollback');
    return Response.json({ erro: e.message }, { status: 400 });
  } finally {
    cx.release();
  }
}
