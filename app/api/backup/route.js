import { q } from '../../../lib/db';
import { exigir } from '../../../lib/guard';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Cópia de segurança: baixa todas as tabelas do banco num arquivo JSON (só administrador).
export async function GET() {
  const g = await exigir(true);
  if (g.erro) return g.erro;
  const t = await q(`select table_name from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE' and table_name <> 'login_tentativas' order by table_name`);
  const tabelas = {};
  for (const { table_name: n } of t.rows) {
    const r = await q('select * from "' + n.replace(/"/g, '""') + '" order by 1');
    tabelas[n] = r.rows;
  }
  const agora = new Date();
  const dia = new Date(agora.getTime() - 3 * 3600000).toISOString().slice(0, 10);
  const corpo = JSON.stringify({ sistema: 'Samura Perfumes', gerado_em: agora.toISOString(), tabelas });
  return new Response(corpo, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': 'attachment; filename="backup-samura-' + dia + '.json"',
      'Cache-Control': 'no-store',
    },
  });
}
