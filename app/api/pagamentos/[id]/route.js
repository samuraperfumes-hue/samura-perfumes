import { pool, q } from '../../../../lib/db';
import { exigir } from '../../../../lib/guard';
import { receber } from '../../../../lib/pagamentos';

export const dynamic = 'force-dynamic';

const num = (v) => Number(String(v).replace(',', '.'));
const c2 = (v) => Math.round(Number(v) * 100) / 100;
const dt = (d) => (/^\d{4}-\d{2}-\d{2}$/.test(d || '') ? d : null);

export async function PATCH(req, { params }) {
  const g = await exigir(false);
  if (g.erro) return g.erro;
  const { id } = await params;
  const b = await req.json();
  const admin = g.s.papel === 'admin';
  const p = (await q('select p.*, v.vendedor_id as dono from pagamentos p join vendas v on v.id = p.venda_id where p.id = $1', [Number(id)])).rows[0];
  if (!p || (!admin && p.dono !== g.s.id)) return Response.json({ erro: 'Pagamento não encontrado.' }, { status: 404 });
  const a = b.acao;
  if (!admin && !['informar', 'reagendar'].includes(a)) return Response.json({ erro: 'Acesso restrito ao administrador.' }, { status: 403 });
  const data = dt(b.data) || new Date().toISOString().slice(0, 10);
  const cx = await pool.connect();
  try {
    await cx.query('begin');
    if (a === 'receber') {
      await receber(cx, p.id, b.valor !== undefined && b.valor !== '' ? num(b.valor) : Number(p.valor), data, g.s.id, null);
    } else if (a === 'informar') {
      if (p.situacao !== 'agendado') throw new Error('Este pagamento não está agendado.');
      const v = b.valor ? c2(num(b.valor)) : c2(p.valor);
      if (!(v > 0) || v > c2(p.valor) + 0.005) throw new Error('Valor inválido.');
      if (v < c2(p.valor) - 0.005) {
        await cx.query(`insert into pagamentos (venda_id, valor, data_prevista, data_original, forma, situacao) values ($1, $2, $3, $4, $5, 'agendado')`, [p.venda_id, c2(p.valor - v), p.data_prevista, p.data_original, p.forma]);
      }
      await cx.query(`update pagamentos set valor = $1, situacao = 'informado', informado_por = $2, informado_em = now(), data_recebimento = $3, motivo_contestacao = null where id = $4`, [v, g.s.id, data, p.id]);
    } else if (a === 'contestar') {
      if (p.situacao !== 'informado') throw new Error('Este pagamento não está informado.');
      await cx.query(`update pagamentos set situacao = 'agendado', informado_por = null, informado_em = null, data_recebimento = null, motivo_contestacao = $1 where id = $2`, [String(b.motivo || '').trim() || null, p.id]);
    } else if (a === 'reagendar') {
      if (p.situacao === 'recebido') throw new Error('Pagamento já recebido.');
      if (!dt(b.data)) throw new Error('Data inválida.');
      await cx.query('update pagamentos set data_original = coalesce(data_original, data_prevista), data_prevista = $1 where id = $2', [b.data, p.id]);
    } else if (a === 'estornar') {
      if (p.situacao !== 'recebido') throw new Error('Este pagamento não está recebido.');
      await cx.query(`update pagamentos set situacao = 'agendado', data_recebimento = null, validado_por = null, validado_em = null, repasse_id = null where id = $1`, [p.id]);
    } else if (a === 'excluir') {
      if (p.situacao !== 'agendado') throw new Error('Só é possível excluir parcela agendada.');
      await cx.query('delete from pagamentos where id = $1', [p.id]);
    } else {
      throw new Error('Ação inválida.');
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
