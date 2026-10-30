import { pool } from '../../../lib/db';
import { exigir } from '../../../lib/guard';
import { garantir, saldo } from '../../../lib/estoque';

export const dynamic = 'force-dynamic';

export async function GET() {
  const g = await exigir(false);
  if (g.erro) return g.erro;
  await garantir(pool);
  const admin = g.s.papel === 'admin';
  const j = 'join usuarios u on u.id = m.local_id join apresentacoes a on a.id = m.apresentacao_id join fragrancias f on f.id = a.fragrancia_id';
  const filtro = admin ? '' : ' where m.local_id = $1';
  const par = admin ? [] : [g.s.id];
  const sal = await pool.query(`select m.local_id, u.nome as local, m.apresentacao_id, a.tipo, f.nome as fragrancia, a.volume, sum(m.quantidade)::int as saldo from movimentos_estoque m ${j}${filtro} group by m.local_id, u.nome, m.apresentacao_id, a.tipo, f.nome, a.volume having sum(m.quantidade) <> 0 order by u.nome, f.nome, a.tipo, a.volume`, par);
  const mov = await pool.query(`select m.id, m.criado_em, u.nome as local, m.quantidade, m.tipo, m.obs, a.tipo as ptipo, f.nome as fragrancia, a.volume from movimentos_estoque m ${j}${filtro} order by m.id desc limit 100`, par);
  return Response.json({ saldos: sal.rows, movimentos: mov.rows });
}

export async function POST(req) {
  const g = await exigir(true);
  if (g.erro) return g.erro;
  const b = await req.json();
  const qtd = parseInt(b.quantidade, 10);
  const apr = Number(b.apresentacao_id);
  const admin = g.s.id;
  const cx = await pool.connect();
  try {
    await garantir(cx);
    await cx.query('begin');
    const a = (await cx.query('select id from apresentacoes where id = $1', [apr])).rows[0];
    if (!a) throw new Error('Escolha o produto.');
    const obs = String(b.obs || '').trim() || null;
    const ins = (local, q, tipo, o) => cx.query('insert into movimentos_estoque (local_id, apresentacao_id, quantidade, tipo, obs, criado_por) values ($1, $2, $3, $4, $5, $6)', [local, apr, q, tipo, o, admin]);
    const nomeDe = async (id) => ((await cx.query('select nome from usuarios where id = $1', [id])).rows[0] || {}).nome;
    if (b.acao === 'envase') {
      if (!(qtd > 0)) throw new Error('Informe uma quantidade maior que zero.');
      await ins(admin, qtd, 'envase', obs);
    } else if (b.acao === 'transferir' || b.acao === 'devolver') {
      const vend = Number(b.vendedor_id);
      if (!(qtd > 0)) throw new Error('Informe uma quantidade maior que zero.');
      if (!vend || vend === admin) throw new Error('Escolha um vendedor.');
      const de = b.acao === 'transferir' ? admin : vend;
      const para = b.acao === 'transferir' ? vend : admin;
      const disp = await saldo(cx, de, apr);
      if (qtd > disp) throw new Error('Estoque insuficiente em ' + (await nomeDe(de)) + ': disponível ' + disp + '. Registre um envase ou ajuste antes.');
      const tipo = b.acao === 'transferir' ? 'transferencia' : 'devolucao';
      await ins(de, -qtd, tipo, 'Para ' + (await nomeDe(para)) + (obs ? ' - ' + obs : ''));
      await ins(para, qtd, tipo, 'De ' + (await nomeDe(de)) + (obs ? ' - ' + obs : ''));
    } else if (b.acao === 'ajuste') {
      const local = Number(b.local_id) || admin;
      if (!qtd) throw new Error('Informe a quantidade do ajuste (use negativo para reduzir).');
      const disp = await saldo(cx, local, apr);
      if (disp + qtd < 0) throw new Error('O ajuste deixaria o estoque negativo (disponível ' + disp + ').');
      await ins(local, qtd, 'ajuste', obs || 'Ajuste manual');
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
