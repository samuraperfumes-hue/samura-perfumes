import { pool } from '../../../../../lib/db';
import { exigir } from '../../../../../lib/guard';
import { garantirClientes } from '../../../../../lib/clientes';

export const dynamic = 'force-dynamic';

// Junta um cliente duplicado (id da URL) em outro (destino_id): tudo que era dele
// passa para o destino e o cadastro duplicado é apagado. Só administrador.
export async function POST(req, { params }) {
  const g = await exigir(true);
  if (g.erro) return g.erro;
  const { id } = await params;
  const b = await req.json().catch(() => ({}));
  const origem = Number(id);
  const destino = Number(b.destino_id);
  if (!origem || !destino || origem === destino) return Response.json({ erro: 'Escolha outro cliente para juntar.' }, { status: 400 });
  const cx = await pool.connect();
  try {
    await garantirClientes(cx);
    await cx.query('begin');
    const cs = (await cx.query('select * from clientes where id = any($1::int[]) for update', [[origem, destino]])).rows;
    const o = cs.find((c) => c.id === origem);
    const d = cs.find((c) => c.id === destino);
    if (!o || !d) throw new Error('Cliente não encontrado.');

    // Descontos: evita ficar com dois de boas-vindas, ou dois pela mesma indicação.
    await cx.query(`delete from creditos k where k.cliente_id = $1 and k.tipo = 'boas_vindas' and k.usado_venda_id is null and exists (select 1 from creditos x where x.cliente_id = $2 and x.tipo = 'boas_vindas')`, [origem, destino]);
    await cx.query(`update creditos set tipo = 'boas_vindas_antigo' where cliente_id = $1 and tipo = 'boas_vindas' and exists (select 1 from creditos x where x.cliente_id = $2 and x.tipo = 'boas_vindas')`, [origem, destino]);
    await cx.query(`delete from creditos k where k.origem_cliente_id = $1 and k.tipo = 'indicacao' and k.usado_venda_id is null and exists (select 1 from creditos x where x.origem_cliente_id = $2 and x.tipo = 'indicacao')`, [origem, destino]);
    await cx.query(`update creditos set tipo = 'indicacao_antigo' where origem_cliente_id = $1 and tipo = 'indicacao' and exists (select 1 from creditos x where x.origem_cliente_id = $2 and x.tipo = 'indicacao')`, [origem, destino]);

    // Todas as tabelas que apontam para clientes passam a apontar para o destino.
    const fks = (await cx.query(`
      select kcu.table_name, kcu.column_name
      from information_schema.table_constraints tc
      join information_schema.key_column_usage kcu on kcu.constraint_name = tc.constraint_name and kcu.table_schema = tc.table_schema
      join information_schema.constraint_column_usage ccu on ccu.constraint_name = tc.constraint_name and ccu.table_schema = tc.table_schema
      where tc.constraint_type = 'FOREIGN KEY' and tc.table_schema = 'public' and ccu.table_name = 'clientes' and ccu.column_name = 'id'`)).rows;
    const vistos = new Set();
    for (const f of fks) {
      const k = f.table_name + '.' + f.column_name;
      if (vistos.has(k)) continue;
      vistos.add(k);
      const t = '"' + f.table_name.replace(/"/g, '""') + '"';
      const c = '"' + f.column_name.replace(/"/g, '""') + '"';
      await cx.query('update ' + t + ' set ' + c + ' = $1 where ' + c + ' = $2', [destino, origem]);
    }

    // Completa o cadastro que fica com o que faltava nele.
    const obs = [d.observacoes, o.observacoes].map((x) => String(x || '').trim()).filter(Boolean);
    await cx.query(
      `update clientes set telefone = coalesce(nullif(telefone, ''), $2), observacoes = $3,
        origem = coalesce(origem, $4), indicado_por = coalesce(nullif(indicado_por, ''), $5), indicado_tel = coalesce(nullif(indicado_tel, ''), $6),
        indicado_em = coalesce(indicado_em, $7), convite_em = coalesce(convite_em, $8) where id = $1`,
      [destino, o.telefone || null, [...new Set(obs)].join(' | ') || null, o.origem || null, o.indicado_por || null, o.indicado_tel || null, o.indicado_em || null, o.convite_em || null]
    );
    await cx.query('delete from clientes where id = $1', [origem]);
    await cx.query('commit');
    return Response.json({ ok: true });
  } catch (e) {
    await cx.query('rollback');
    return Response.json({ erro: e.message }, { status: 400 });
  } finally {
    cx.release();
  }
}
