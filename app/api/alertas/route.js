import { pool } from '../../../lib/db';
import { exigir } from '../../../lib/guard';
import { gerarCreditos, DISPONIVEL } from '../../../lib/clientes';
import { lerConfigGeral, dias } from '../../../lib/config';

export const dynamic = 'force-dynamic';

const recente = (tipos, n) => `exists (select 1 from mensagens_enviadas m where m.cliente_id = c.id and m.tipo in (${tipos}) and m.enviado_em > now() - interval '${Number(n)} days')`;

// Avisos do pop-up: pagamentos vencidos, descontos para avisar, clientes para resgatar e indicações sem convite.
// Quem recebeu a mensagem correspondente dentro da pausa configurada não aparece.
export async function GET() {
  const g = await exigir(false);
  if (g.erro) return g.erro;
  await gerarCreditos(pool);
  const cfg = await lerConfigGeral(pool);
  const prazos = { pausa_cobranca: dias(cfg.pausa_cobranca, 7), pausa_resgate: dias(cfg.pausa_resgate, 7), cobranca_atraso: dias(cfg.cobranca_atraso, 0), resgate_dias: dias(cfg.resgate_dias, 60) };
  const admin = g.s.papel === 'admin';
  const p = admin ? [] : [g.s.id];
  const filtroV = admin ? '' : ' and v.vendedor_id = $1';
  const filtroC = admin ? '' : ' and c.vendedor_id = $1';
  const vencidos = (await pool.query(`
    select p.id, p.valor, p.data_prevista, v.id as venda_id, v.codigo, c.id as cliente_id, c.nome as cliente, c.telefone, u.nome as vendedor
    from pagamentos p join vendas v on v.id = p.venda_id join clientes c on c.id = v.cliente_id join usuarios u on u.id = v.vendedor_id
    where p.situacao = 'agendado' and p.data_prevista is not null and p.data_prevista <= current_date - ${prazos.cobranca_atraso} and not v.cancelada${filtroV}
      and not ${recente("'cobranca'", prazos.pausa_cobranca)}
    order by p.data_prevista, p.id limit 50`, p)).rows;
  const descontos = (await pool.query(`
    select k.id, k.pct, k.validade, c.id as cliente_id, c.nome as cliente, c.telefone, o.nome as origem_nome
    from creditos k join clientes c on c.id = k.cliente_id left join clientes o on o.id = k.origem_cliente_id
    where k.tipo = 'indicacao' and ${DISPONIVEL}${filtroC}
      and not ${recente("'desconto', 'resgate'", prazos.pausa_resgate)}
    order by k.validade nulls last limit 50`, p)).rows;
  const indicacoes = (await pool.query(`
    select c.id as cliente_id, c.nome as cliente, c.telefone, c.indicado_por
    from clientes c
    where c.origem = 'Indicação' and c.convite_em is null
      and not exists (select 1 from vendas v where v.cliente_id = c.id and not v.cancelada)${filtroC}
    order by c.indicado_em desc nulls last, c.id desc limit 50`, p)).rows;
  const resgates = prazos.resgate_dias === 0 ? [] : (await pool.query(`
    select c.id as cliente_id, c.nome as cliente, c.telefone, u.nome as vendedor, x.ultima
    from clientes c join usuarios u on u.id = c.vendedor_id
    join lateral (select max(v.data_venda) as ultima from vendas v where v.cliente_id = c.id and not v.cancelada) x on x.ultima is not null
    where x.ultima <= current_date - ${prazos.resgate_dias}
      and coalesce(c.telefone, '') <> ''${filtroC}
      and not ${recente("'resgate', 'desconto'", prazos.pausa_resgate)}
      and not exists (select 1 from creditos k where k.cliente_id = c.id and k.tipo = 'indicacao' and ${DISPONIVEL})
    order by x.ultima desc limit 50`, p)).rows;
  return Response.json({ vencidos, descontos, resgates, indicacoes, prazos });
}
