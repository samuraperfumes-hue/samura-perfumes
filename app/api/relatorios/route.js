import { q } from '../../../lib/db';
import { exigir } from '../../../lib/guard';

export const dynamic = 'force-dynamic';

const dt = (d) => (/^\d{4}-\d{2}-\d{2}$/.test(d || '') ? d : null);

export async function GET(req) {
  const g = await exigir(false);
  if (g.erro) return g.erro;
  const admin = g.s.papel === 'admin';
  const u = new URL(req.url);
  const de = dt(u.searchParams.get('de')) || '2000-01-01';
  const ate = dt(u.searchParams.get('ate')) || '2999-12-31';
  const par = [de, ate];
  let filtro = 'not v.cancelada and v.data_venda between $1 and $2';
  if (!admin) { par.push(g.s.id); filtro += ' and v.vendedor_id = $3'; }

  const [tot, frag, vend, mes, vol, cli] = await Promise.all([
    q(`select count(*)::int as vendas, coalesce(sum(v.total_liquido), 0)::float as faturamento,
        coalesce(sum(s.saldo_devedor), 0)::float as a_receber,
        coalesce((select sum(i.quantidade) from venda_itens i join vendas v2 on v2.id = i.venda_id where ${filtro.replace(/\bv\./g, 'v2.')}), 0)::int as itens
       from vendas v join v_venda_saldo s on s.venda_id = v.id where ${filtro}`, par),
    q(`select coalesce(f.nome, i.descricao) as nome, sum(i.quantidade)::int as qtd, sum(i.quantidade * i.preco_unit)::float as receita
       from venda_itens i join vendas v on v.id = i.venda_id left join apresentacoes a on a.id = i.apresentacao_id left join fragrancias f on f.id = a.fragrancia_id
       where ${filtro} group by 1 order by qtd desc, receita desc limit 15`, par),
    q(`select u.nome, count(*)::int as vendas, sum(v.total_liquido)::float as faturamento
       from vendas v join usuarios u on u.id = v.vendedor_id where ${filtro} group by u.nome order by faturamento desc`, par),
    q(`select to_char(date_trunc('month', v.data_venda), 'YYYY-MM') as mes, count(*)::int as vendas, sum(v.total_liquido)::float as faturamento
       from vendas v where ${filtro} group by 1 order by 1 desc limit 12`, par),
    q(`select coalesce(a.tipo || ' ' || a.volume, 'Outro') as nome, sum(i.quantidade)::int as qtd
       from venda_itens i join vendas v on v.id = i.venda_id left join apresentacoes a on a.id = i.apresentacao_id
       where ${filtro} group by 1 order by qtd desc limit 10`, par),
    q(`select c.nome, count(*)::int as vendas, sum(v.total_liquido)::float as faturamento
       from vendas v join clientes c on c.id = v.cliente_id where ${filtro} group by c.nome order by faturamento desc limit 10`, par),
  ]);
  return Response.json({
    admin,
    totais: tot.rows[0],
    fragrancias: frag.rows,
    vendedores: vend.rows,
    meses: mes.rows.reverse(),
    volumes: vol.rows,
    clientes: cli.rows,
  });
}
