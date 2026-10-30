import { pool } from '../../../../lib/db';
import { exigir } from '../../../../lib/guard';
import { remover } from '../../../../lib/catalogo';

export const dynamic = 'force-dynamic';

export async function PATCH(req, { params }) {
  const g = await exigir(true);
  if (g.erro) return g.erro;
  const { id } = await params;
  const b = await req.json();
  const cx = await pool.connect();
  try {
    await cx.query('begin');
    const a = (await cx.query('select id from apresentacoes where id = $1', [Number(id)])).rows[0];
    if (!a) throw new Error('Produto não encontrado.');
    const sets = [];
    const vals = [];
    const add = (c, v) => { vals.push(v); sets.push(c + ' = $' + vals.length); };
    if (b.preco !== undefined) {
      const p = Number(String(b.preco).replace(',', '.'));
      if (!(p >= 0)) throw new Error('Preço inválido.');
      add('preco', p);
    }
    if (b.ativa !== undefined) add('ativa', !!b.ativa);
    if (b.tipo !== undefined) {
      const t = String(b.tipo).trim();
      if (!t) throw new Error('Informe o tipo.');
      add('tipo', t);
    }
    if (b.volume !== undefined) {
      const v = String(b.volume).trim();
      if (!v) throw new Error('Informe o volume.');
      add('volume', v);
    }
    if (b.fragrancia !== undefined) {
      const nome = String(b.fragrancia).trim();
      if (!nome) throw new Error('Informe a fragrância.');
      let f = (await cx.query('select id from fragrancias where lower(nome) = lower($1)', [nome])).rows[0];
      if (!f) f = (await cx.query('insert into fragrancias (nome) values ($1) returning id', [nome])).rows[0];
      add('fragrancia_id', f.id);
    }
    if (sets.length) {
      vals.push(a.id);
      await cx.query('update apresentacoes set ' + sets.join(', ') + ' where id = $' + vals.length, vals);
    }
    await cx.query('delete from fragrancias fr where not exists (select 1 from apresentacoes x where x.fragrancia_id = fr.id)');
    await cx.query('commit');
    return Response.json({ ok: true });
  } catch (e) {
    await cx.query('rollback');
    const msg = e.code === '23505' ? 'Já existe um produto igual (mesma fragrância, tipo e volume). Exclua ou edite o outro.' : e.message;
    return Response.json({ erro: msg }, { status: 400 });
  } finally {
    cx.release();
  }
}

export async function DELETE(_req, { params }) {
  const g = await exigir(true);
  if (g.erro) return g.erro;
  const { id } = await params;
  const cx = await pool.connect();
  try {
    await cx.query('begin');
    const r = await remover(cx, Number(id));
    await cx.query('commit');
    return Response.json({ resultado: r });
  } catch (e) {
    await cx.query('rollback');
    return Response.json({ erro: e.message }, { status: 400 });
  } finally {
    cx.release();
  }
}
