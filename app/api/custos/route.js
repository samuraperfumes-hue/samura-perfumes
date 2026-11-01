import { pool } from '../../../lib/db';
import { exigir } from '../../../lib/guard';
import { garantir, calcularPadrao } from '../../../lib/receitas';

export const dynamic = 'force-dynamic';

export async function GET() {
  const g = await exigir(true);
  if (g.erro) return g.erro;
  return Response.json(await calcularPadrao(pool));
}

const nz = (v) => Number(String(v).replace(',', '.'));

export async function POST(req) {
  const g = await exigir(true);
  if (g.erro) return g.erro;
  await garantir(pool);
  const b = await req.json();
  if (b.acao !== 'config') return Response.json({ erro: 'Ação inválida.' }, { status: 400 });
  const campos = { rotulo_padrao: nz(b.rotulo_padrao), sacola_padrao: nz(b.sacola_padrao), partes_essencia: nz(b.partes_essencia), partes_veiculo: nz(b.partes_veiculo), fixador_pct: nz(b.fixador_pct), comissao_pct: nz(b.comissao_pct) };
  for (const [k, v] of Object.entries(campos)) {
    if (!(v >= 0)) return Response.json({ erro: 'Valores inválidos: confira os números informados.' }, { status: 400 });
  }
  if (campos.fixador_pct > 100 || campos.comissao_pct > 100) return Response.json({ erro: 'Fixador e comissão não podem passar de 100%.' }, { status: 400 });
  if (campos.partes_essencia + campos.partes_veiculo <= 0) return Response.json({ erro: 'Informe as partes de essência e de veículo.' }, { status: 400 });
  const pares = Object.entries(campos).map(([k, v]) => [k, String(v)]);
  pares.push(['valvula_separada', b.valvula_separada ? '1' : '0'], ['essencia_ref', String(b.essencia_ref || 'media')]);
  for (const [k, v] of pares) await pool.query('insert into config_custos (chave, valor) values ($1, $2) on conflict (chave) do update set valor = excluded.valor', [k, v]);
  return Response.json({ ok: true });
}
